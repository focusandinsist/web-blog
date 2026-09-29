import json
import tempfile
from datetime import timedelta
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from content.models import Article, Channel, Topic


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
API_FIXTURE = REPOSITORY_ROOT / "backend" / "content" / "fixtures" / "publication_api.json"


class PublicationApiTests(TestCase):
    @classmethod
    def setUpClass(cls):
        cls.media_directory = tempfile.TemporaryDirectory(prefix="publication-api-media-")
        cls.media_settings = override_settings(
            MEDIA_ROOT=Path(cls.media_directory.name),
            ALLOWED_HOSTS=["api.example.test", "testserver"],
        )
        cls.media_settings.enable()
        super().setUpClass()
        cls.addClassCleanup(cls.media_settings.disable)
        cls.addClassCleanup(cls.media_directory.cleanup)

    @classmethod
    def setUpTestData(cls):
        call_command("import_publication", "--apply", stdout=StringIO())

    def setUp(self):
        self.client = Client()
        self.host = {"HTTP_HOST": "api.example.test"}
        self.technology = Channel.objects.get(slug="technology")
        self.systems = Topic.objects.get(slug="systems-programming")

    def article(self, slug, **overrides):
        add_topic = overrides.pop("add_topic", True)
        values = {
            "slug": slug,
            "title": f"Article {slug}",
            "description": "A sufficiently long article description for validation.",
            "body_markdown": "## Body\n\nPublic content.",
            "channel": self.technology,
            "primary_topic": self.systems,
            "pub_datetime": timezone.now() - timedelta(days=1),
            "is_draft": False,
        }
        values.update(overrides)
        article = Article.objects.create(**values)
        if add_topic:
            article.topics.add(self.systems)
        return article

    def test_article_list_matches_response_fixture_and_has_stable_order(self):
        expected = json.loads(API_FIXTURE.read_text(encoding="utf-8"))["articles"]

        response = self.client.get("/api/publication/v1/articles/", **self.host)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)
        self.assertEqual(
            self.client.get("/api/publication/v1/articles/", **self.host).json(),
            expected,
        )

    def test_drafts_future_and_invalid_articles_are_not_public(self):
        draft = self.article("hidden-draft", is_draft=True)
        future = self.article("future-article", pub_datetime=timezone.now() + timedelta(days=1))
        no_topic = self.article("no-topic", add_topic=False)
        short_description = self.article(
            "short-description",
            description="Too short",
        )
        overlong_title = self.article("overlong-title", title="t" * 201)
        blank_hero_alt = self.article(
            "blank-hero-alt",
            hero_image="articles/example/hero.webp",
            hero_alt="   ",
        )

        response = self.client.get("/api/publication/v1/articles/", **self.host)

        ids = {article["id"] for article in response.json()}
        for article in (draft, future, no_topic, short_description, overlong_title, blank_hero_alt):
            self.assertNotIn(article.publication_id, ids)
            self.assertEqual(
                self.client.get(
                    f"/api/publication/v1/articles/{article.channel.slug}/{article.slug}/",
                    **self.host,
                ).status_code,
                404,
            )

    def test_wrong_channel_topic_is_not_public(self):
        article = self.article("wrong-topic")
        article.topics.set([Topic.objects.get(slug="reading")])

        response = self.client.get("/api/publication/v1/articles/", **self.host)

        self.assertNotIn(article.publication_id, {item["id"] for item in response.json()})

    def test_public_dto_excludes_management_fields_and_detail_matches_list(self):
        article = Article.objects.get(channel__slug="technology", slug="event-loop-notes")

        response = self.client.get(
            f"/api/publication/v1/articles/{article.channel.slug}/{article.slug}/",
            **self.host,
        )
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload, next(
            item for item in self.client.get("/api/publication/v1/articles/", **self.host).json()
            if item["id"] == article.publication_id
        ))
        self.assertEqual(
            set(payload),
            {
                "id", "slug", "title", "description", "bodyMarkdown", "pubDatetime",
                "modDatetime", "channel", "topics", "primaryTopic", "tags", "kind",
                "status", "draft", "featuredRank", "series", "related", "heroImage",
                "ogImage", "canonicalURL", "revisions",
            },
        )
        self.assertFalse(payload["draft"])
        self.assertTrue(payload["heroImage"]["url"].startswith("http://api.example.test/media/"))
        self.assertNotIn("is_draft", payload)

    def test_taxonomy_fixture_and_health_are_public_and_read_only(self):
        expected = json.loads(API_FIXTURE.read_text(encoding="utf-8"))["taxonomy"]

        taxonomy = self.client.get("/api/publication/v1/taxonomy/", **self.host)
        health = self.client.get("/api/publication/v1/health/", **self.host)

        self.assertEqual(taxonomy.status_code, 200)
        self.assertEqual(taxonomy.json(), expected)
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})
        self.assertEqual(
            self.client.post("/api/publication/v1/articles/", **self.host).status_code,
            405,
        )

    def test_inactive_taxonomy_is_omitted(self):
        inactive_channel = Channel.objects.create(
            slug="inactive-channel",
            name="Inactive",
            description="Inactive channel.",
            accent=Channel.Accent.SIGNAL,
            is_active=False,
        )
        Topic.objects.create(
            slug="inactive-topic",
            name="Inactive topic",
            description="Inactive topic.",
            channel=inactive_channel,
            is_active=True,
        )
        Topic.objects.filter(slug="systems-programming").update(is_active=False)

        payload = self.client.get("/api/publication/v1/taxonomy/", **self.host).json()

        self.assertNotIn("inactive-channel", {item["slug"] for item in payload["channels"]})
        self.assertNotIn("inactive-topic", {item["slug"] for item in payload["topics"]})
        self.assertNotIn("systems-programming", {item["slug"] for item in payload["topics"]})

    def test_unknown_or_unpublished_detail_returns_not_found(self):
        self.assertEqual(
            self.client.get("/api/publication/v1/articles/technology/missing/", **self.host).status_code,
            404,
        )
