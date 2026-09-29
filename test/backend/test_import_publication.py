import json
import re
import shutil
import tempfile
from datetime import datetime
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from content.models import Article, ArticleRelated, Channel, Revision, Series, SeriesArticle, Tag, Topic


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ARTICLE_SOURCE = REPOSITORY_ROOT / "src" / "content" / "posts"


class ImportPublicationCommandTests(TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.mkdtemp(prefix="publication-import-")
        self.addCleanup(shutil.rmtree, self.temporary_directory, ignore_errors=True)
        self.media_root = Path(self.temporary_directory) / "media"
        self.media_override = override_settings(MEDIA_ROOT=self.media_root)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)

    def run_import(self, *args):
        output = StringIO()
        try:
            call_command("import_publication", *args, stdout=output)
        except CommandError as error:
            self.fail(f"{error}\n{output.getvalue()}")
        return json.loads(output.getvalue())

    def test_default_mode_reports_plan_without_writing_content(self):
        report = self.run_import()

        self.assertEqual(report["mode"], "dry-run")
        self.assertEqual(report["summary"]["files"], 21)
        self.assertEqual(report["summary"]["planned_created"], 21)
        self.assertEqual(report["summary"]["created"], 0)
        self.assertEqual(Article.objects.count(), 0)

    def test_apply_imports_fields_and_relationships_then_updates_idempotently(self):
        report = self.run_import("--apply")

        self.assertEqual(report["summary"]["created"], 21)
        self.assertEqual(Article.objects.count(), 21)
        self.assertEqual(Tag.objects.count(), 27)
        self.assertEqual(Series.objects.get(slug="event-loop-diagnostics").articles.count(), 3)
        self.assertEqual(SeriesArticle.objects.count(), 3)
        self.assertEqual(ArticleRelated.objects.count(), 19)
        self.assertEqual(Revision.objects.count(), 2)

        article = Article.objects.get(channel__slug="technology", slug="event-loop-notes")
        hero_image_name = article.hero_image.name
        self.assertEqual(article.primary_topic.slug, "concurrency-engineering")
        self.assertEqual(
            list(article.related_links.order_by("position").values_list("related_article__slug", flat=True)),
            ["reading-with-questions", "decision-journal"],
        )
        self.assertTrue(article.hero_image.name)
        self.assertTrue(article.og_image.name)
        self.assertIn(
            "/media/articles/technology/event-loop-notes/body/",
            article.body_markdown,
        )

        repeat_report = self.run_import("--apply")
        self.assertEqual(repeat_report["summary"]["created"], 0)
        self.assertEqual(repeat_report["summary"]["updated"], 21)
        self.assertEqual(Article.objects.count(), 21)
        self.assertEqual(ArticleRelated.objects.count(), 19)
        article.refresh_from_db()
        self.assertEqual(article.hero_image.name, hero_image_name)

    def test_reimport_can_swap_existing_series_order(self):
        source = Path(self.temporary_directory) / "source"
        source.mkdir()
        for slug, title, order in (("first", "First article", 1), ("second", "Second article", 2)):
            self.write_series_article(source, slug, title, order)

        self.run_import("--source", str(source), "--apply")
        self.write_series_article(source, "first", "First article", 2)
        self.write_series_article(source, "second", "Second article", 1)

        report = self.run_import("--source", str(source), "--apply")

        self.assertEqual(report["errors"], [])
        self.assertEqual(
            dict(SeriesArticle.objects.values_list("article__slug", "order")),
            {"first": 2, "second": 1},
        )

    @staticmethod
    def write_series_article(source, slug, title, order):
        article_path = source / "technology" / f"{slug}.md"
        article_path.parent.mkdir(parents=True, exist_ok=True)
        article_path.write_text(
            "---\n"
            f"title: {title}\n"
            "description: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\n"
            "channel: technology\n"
            "topics: [systems-programming]\n"
            "series:\n"
            "  id: reorderable-series\n"
            f"  order: {order}\n"
            "---\nBody\n",
            encoding="utf-8",
        )

    def test_imported_article_contract_matches_fixture_for_every_article(self):
        self.run_import("--apply")
        fixture_path = REPOSITORY_ROOT / "backend" / "content" / "fixtures" / "publication.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

        self.assertEqual(Article.objects.count(), len(fixture["articles"]))
        for expected in fixture["articles"]:
            channel_slug, article_slug = expected["id"].split("/", 1)
            article = Article.objects.get(channel__slug=channel_slug, slug=article_slug)
            self.assertEqual(article.channel.slug, expected["channel"])
            self.assertEqual(
                list(article.topics.order_by("slug").values_list("slug", flat=True)),
                sorted(expected["topics"]),
            )
            self.assertEqual(article.primary_topic.slug, expected["primaryTopic"])
            self.assertEqual(
                article.pub_datetime.isoformat(),
                datetime.fromisoformat(expected["pubDatetime"].replace("Z", "+00:00")).isoformat(),
            )
            self.assertEqual(article.mod_datetime, self.fixture_datetime(expected["modDatetime"]))
            self.assertEqual(article.kind, expected["kind"])
            self.assertEqual(article.status, expected["status"])
            self.assertEqual(article.is_draft, expected["draft"])
            self.assertEqual(
                list(article.tags.order_by("name").values_list("name", flat=True)),
                sorted(expected["tags"]),
            )
            membership = getattr(article, "series_membership", None)
            if expected["series"] is None:
                self.assertIsNone(membership)
            else:
                self.assertEqual(membership.series.slug, expected["series"]["id"])
                self.assertEqual(membership.order, expected["series"]["order"])
            self.assertEqual(
                [
                    link.related_article.publication_id
                    for link in article.related_links.select_related("related_article").order_by("position")
                ],
                expected["related"],
            )
            self.assertEqual(
                list(article.revisions.order_by("date").values_list("date", "summary")),
                [
                    (self.fixture_datetime(revision["date"]), revision["summary"])
                    for revision in sorted(expected["revisions"], key=lambda revision: revision["date"])
                ],
            )

    @staticmethod
    def fixture_datetime(value):
        if value is None:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def test_invalid_source_is_reported_and_apply_writes_nothing(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "invalid.md"
        article_path.parent.mkdir(parents=True)
        article_path.write_text(
            "---\ntitle: Invalid\ndescription: short\npubDatetime: 2026-09-01\n"
            "channel: technology\ntopics: [not-a-topic]\n---\n\n## Body\n",
            encoding="utf-8",
        )
        output = StringIO()

        with self.assertRaises(CommandError):
            call_command("import_publication", "--source", str(source), "--apply", stdout=output)

        report = json.loads(output.getvalue())
        self.assertTrue(report["errors"])
        self.assertEqual(Article.objects.count(), 0)

    def test_frontmatter_channel_must_match_source_directory(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "wrong-channel.md"
        article_path.parent.mkdir(parents=True)
        article_path.write_text(
            "---\ntitle: Wrong channel\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: life\ntopics: [systems-programming]\n---\nBody\n",
            encoding="utf-8",
        )
        output = StringIO()

        with self.assertRaises(CommandError):
            call_command("import_publication", "--source", str(source), "--apply", stdout=output)

        report = json.loads(output.getvalue())
        self.assertIn("does not match directory", report["errors"][0]["error"])
        self.assertEqual(Article.objects.count(), 0)

    def test_invalid_frontmatter_types_are_reported_without_aborting_the_import(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "invalid-type.md"
        article_path.parent.mkdir(parents=True)
        article_path.write_text(
            "---\ntitle: 42\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n---\nBody\n",
            encoding="utf-8",
        )
        output = StringIO()

        with self.assertRaises(CommandError):
            call_command("import_publication", "--source", str(source), "--apply", stdout=output)

        report = json.loads(output.getvalue())
        self.assertIn("title must be a non-empty string", report["errors"][0]["error"])
        self.assertEqual(Article.objects.count(), 0)

    def test_overlong_revision_summary_is_reported_before_apply(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "overlong-revision.md"
        article_path.parent.mkdir(parents=True)
        article_path.write_text(
            "---\ntitle: Overlong revision\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n"
            "revisions:\n  - date: 2026-09-02\n    summary: "
            + "x" * 256
            + "\n---\nBody\n",
            encoding="utf-8",
        )
        output = StringIO()

        with self.assertRaises(CommandError):
            call_command("import_publication", "--source", str(source), "--apply", stdout=output)

        report = json.loads(output.getvalue())
        self.assertIn("at most 255 characters", report["errors"][0]["error"])
        self.assertEqual(Article.objects.count(), 0)
        self.assertEqual(Revision.objects.count(), 0)

    def test_duplicate_article_ids_are_reported_before_any_rows_are_written(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "duplicate.md"
        alternate_path = article_path.with_suffix(".mdx")
        article_path.parent.mkdir(parents=True)
        article = (
            "---\ntitle: Duplicate article\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n---\nBody\n"
        )
        article_path.write_text(article, encoding="utf-8")
        alternate_path.write_text(article, encoding="utf-8")
        output = StringIO()

        with self.assertRaises(CommandError):
            call_command("import_publication", "--source", str(source), "--apply", stdout=output)

        report = json.loads(output.getvalue())
        self.assertEqual(len(report["errors"]), 1)
        self.assertIn("Duplicate article id", report["errors"][0]["error"])
        self.assertEqual(Article.objects.count(), 0)

    def test_mdx_source_syntax_is_preserved_and_flagged_for_manual_review(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "mdx-sample.mdx"
        article_path.parent.mkdir(parents=True)
        article_path.write_text(
            "---\ntitle: MDX sample\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n---\n"
            "\n<InteractiveDemo value={1} />\n",
            encoding="utf-8",
        )

        report = self.run_import("--source", str(source))

        self.assertEqual(report["summary"]["files"], 1)
        self.assertEqual(len(report["manual_review"]), 2)
        self.assertEqual(report["errors"], [])
        self.assertEqual(Article.objects.count(), 0)

    def test_remote_og_image_is_reported_and_does_not_clear_existing_media(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "remote-og.md"
        article_path.parent.mkdir(parents=True)
        existing = Article.objects.create(
            slug="remote-og",
            title="Remote og image",
            description="A sufficiently long article description for validation.",
            body_markdown="Original body",
            channel=Channel.objects.get(slug="technology"),
            primary_topic=Topic.objects.get(slug="systems-programming"),
            pub_datetime="2026-09-01T00:00:00Z",
            og_image="articles/technology/remote-og/ogImage/current.webp",
        )
        article_path.write_text(
            "---\ntitle: Remote og image\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n"
            "ogImage: https://images.example.test/og.webp\n---\nBody\n",
            encoding="utf-8",
        )

        report = self.run_import("--source", str(source), "--apply")

        self.assertEqual(report["errors"], [])
        self.assertTrue(any("ogImage" in note["reason"] for note in report["manual_review"]))
        existing.refresh_from_db()
        self.assertEqual(existing.og_image.name, "articles/technology/remote-og/ogImage/current.webp")

    def test_body_images_with_matching_basenames_keep_distinct_storage_paths(self):
        source = Path(self.temporary_directory) / "source"
        article_path = source / "technology" / "same-image-name.md"
        article_path.parent.mkdir(parents=True)
        first_image = source / "technology" / "images" / "first" / "shared.webp"
        second_image = source / "technology" / "images" / "second" / "shared.webp"
        first_image.parent.mkdir(parents=True)
        second_image.parent.mkdir(parents=True)
        first_image.write_bytes(b"first image")
        second_image.write_bytes(b"second image")
        article_path.write_text(
            "---\ntitle: Same image names\ndescription: This description is long enough to pass validation.\n"
            "pubDatetime: 2026-09-01\nchannel: technology\ntopics: [systems-programming]\n---\n"
            "![First](images/first/shared.webp)\n\n![Second](images/second/shared.webp)\n",
            encoding="utf-8",
        )

        report = self.run_import("--source", str(source), "--apply")

        self.assertEqual(report["errors"], [])
        article = Article.objects.get(slug="same-image-name")
        image_urls = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", article.body_markdown)
        self.assertEqual(len(image_urls), 2)
        self.assertNotEqual(image_urls[0], image_urls[1])
