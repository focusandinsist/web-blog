import json
import hashlib
import re
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

import yaml
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from content.models import (
    Article,
    ArticleRelated,
    Channel,
    Revision,
    Series,
    SeriesArticle,
    Tag,
    Topic,
)
from content.services import validate_article_topics, validate_series_orders


JSX_PATTERN = re.compile(
    r"(^\s*import\s+.+\s+from\s+['\"]|<[/A-Z][A-Za-z0-9.]*[\s/>]|\{\s*/\*.*?\*/\s*\})",
    re.MULTILINE | re.DOTALL,
)
IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\(([^)]+)\)|<img\b[^>]*>", re.IGNORECASE)


@dataclass
class ArticleImport:
    source_path: Path
    channel_slug: str
    slug: str
    values: dict[str, Any]
    topic_slugs: list[str]
    tag_names: list[str]
    series_values: dict[str, Any] | None
    related_ids: list[str]
    revisions: list[dict[str, Any]]
    media_paths: dict[str, Path]
    image_fields: set[str]
    mdx_constructs: list[str]


def parse_frontmatter(path: Path) -> tuple[dict[str, Any], str]:
    source = path.read_text(encoding="utf-8")
    parts = source.split("---", 2)
    if len(parts) != 3 or parts[0].strip():
        raise ValueError("Missing YAML frontmatter block.")
    metadata = yaml.safe_load(parts[1]) or {}
    if not isinstance(metadata, dict):
        raise ValueError("Frontmatter must be a YAML mapping.")
    return metadata, parts[2].lstrip("\r\n")


def as_datetime(value: Any, field: str) -> datetime:
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, date):
        result = datetime.combine(value, time.min)
    elif isinstance(value, str):
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        raise ValueError(f"{field} must be a date or datetime.")
    if timezone.is_naive(result):
        result = timezone.make_aware(result, timezone.get_current_timezone())
    return result


def local_media_path(source_path: Path, source_root: Path, value: Any) -> Path | None:
    if not value or not isinstance(value, str) or re.match(r"^(?:https?:|data:|/)", value):
        return None
    candidate = (source_path.parent / value.split("#", 1)[0].split("?", 1)[0]).resolve()
    if not (
        candidate.is_relative_to(Path.cwd().resolve())
        or candidate.is_relative_to(source_root.resolve())
    ):
        raise ValueError(f"Referenced media must stay inside the project: {value}")
    if not candidate.is_file():
        raise ValueError(f"Referenced media file does not exist: {value}")
    return candidate


def extract_image_references(body: str) -> list[str]:
    references = []
    for match in IMAGE_PATTERN.finditer(body):
        value = match.group(1)
        if value:
            references.append(value.split()[0].strip("<>"))
    references.extend(
        match.group(1)
        for match in re.finditer(r"<img\b[^>]*\bsrc=['\"]([^'\"]+)['\"]", body, re.IGNORECASE)
    )
    return references


def display_path(path: Path, source_root: Path) -> str:
    project_root = Path.cwd().resolve()
    if path.is_relative_to(project_root):
        return path.relative_to(project_root).as_posix()
    return (Path("source") / path.relative_to(source_root.resolve())).as_posix()


def parse_article(path: Path, source_root: Path) -> ArticleImport:
    metadata, body = parse_frontmatter(path)
    relative_path = path.relative_to(source_root)
    if len(relative_path.parts) != 2:
        raise ValueError("Articles must be stored directly below a channel directory.")
    channel_slug = relative_path.parts[0]
    slug = path.stem
    if metadata.get("channel") != channel_slug:
        raise ValueError(
            f'Frontmatter channel "{metadata.get("channel")}" does not match directory "{channel_slug}".'
        )
    topics = metadata.get("topics") or []
    if isinstance(topics, str):
        topics = [topics]
    tags = metadata.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    series_values = metadata.get("series")
    if series_values is not None and not isinstance(series_values, dict):
        raise ValueError("series must be a mapping with id and order.")
    revisions = metadata.get("revisions") or []
    if not isinstance(revisions, list):
        raise ValueError("revisions must be a list.")

    values = {
        "title": metadata.get("title"),
        "description": metadata.get("description"),
        "body_markdown": body,
        "kind": metadata.get("kind", "article"),
        "status": metadata.get("status", "complete"),
        "featured_rank": metadata.get("featuredRank"),
        "hero_alt": metadata.get("heroAlt", ""),
        "canonical_url": metadata.get("canonicalURL", ""),
        "is_draft": metadata.get("draft", False),
        "pub_datetime": as_datetime(metadata.get("pubDatetime"), "pubDatetime"),
        "mod_datetime": (
            as_datetime(metadata["modDatetime"], "modDatetime")
            if metadata.get("modDatetime")
            else None
        ),
    }

    media_paths: dict[str, Path] = {}
    image_fields = {field for field in ("heroImage", "ogImage") if metadata.get(field)}
    mdx_constructs = []
    if path.suffix.lower() == ".mdx":
        mdx_constructs.append("MDX file is preserved as Markdown source and requires manual conversion review.")
    for field in ("heroImage", "ogImage"):
        image_value = metadata.get(field)
        if image_value and isinstance(image_value, str) and re.match(r"^https?://", image_value):
            mdx_constructs.append(f"Remote {field} URL cannot be stored in the current ImageField and needs manual review.")
        media_path = local_media_path(path, source_root, metadata.get(field))
        if media_path:
            media_paths[field] = media_path
    for reference in extract_image_references(body):
        media_path = local_media_path(path, source_root, reference)
        if media_path:
            media_paths[f"body:{reference}"] = media_path

    if JSX_PATTERN.search(body):
        mdx_constructs.append("JSX or MDX import syntax is preserved as source and needs manual conversion.")

    related = metadata.get("related") or []
    if isinstance(related, str):
        related = [related]
    if not all(isinstance(value, str) for value in topics + tags + related):
        raise ValueError("topics, tags, and related values must be strings.")

    return ArticleImport(
        source_path=path,
        channel_slug=channel_slug,
        slug=slug,
        values=values,
        topic_slugs=list(topics),
        tag_names=list(tags),
        series_values=series_values,
        related_ids=list(related),
        revisions=revisions,
        media_paths=media_paths,
        image_fields=image_fields,
        mdx_constructs=mdx_constructs,
    )


class Command(BaseCommand):
    help = "Import Astro Markdown articles into Django. Defaults to dry-run; pass --apply to write."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=Path,
            default=Path("src/content/posts"),
            help="Article source directory relative to the repository root.",
        )
        parser.add_argument("--apply", action="store_true", help="Persist the import in one transaction.")
        parser.add_argument("--report", type=Path, help="Write the JSON report to this path.")

    def handle(self, *args, **options):
        source_root = options["source"].resolve()
        if not source_root.is_dir():
            raise CommandError(f"Source directory does not exist: {source_root}")

        report = {
            "version": 1,
            "mode": "apply" if options["apply"] else "dry-run",
            "source": Path(options["source"]).as_posix(),
            "summary": {
                "files": 0,
                "created": 0,
                "updated": 0,
                "skipped": 0,
                "planned_created": 0,
                "planned_updated": 0,
            },
            "articles": [],
            "errors": [],
            "manual_review": [],
            "content": {},
        }
        parsed: list[ArticleImport] = []
        files = sorted(
            path
            for path in source_root.rglob("*")
            if path.is_file() and path.suffix.lower() in {".md", ".mdx"}
        )
        report["summary"]["files"] = len(files)

        for path in files:
            relative = path.relative_to(source_root).as_posix()
            try:
                item = parse_article(path, source_root)
                duplicate = next(
                    (
                        existing
                        for existing in parsed
                        if existing.channel_slug == item.channel_slug and existing.slug == item.slug
                    ),
                    None,
                )
                if duplicate:
                    report["errors"].append(
                        {
                            "source": relative,
                            "id": f"{item.channel_slug}/{item.slug}",
                            "error": f"Duplicate article id also used by {duplicate.source_path.relative_to(source_root).as_posix()}.",
                        }
                    )
                    report["summary"]["skipped"] += 1
                    continue
                parsed.append(item)
                status = "update" if Article.objects.filter(channel__slug=item.channel_slug, slug=item.slug).exists() else "create"
                report["summary"]["planned_updated" if status == "update" else "planned_created"] = (
                    report["summary"].get("planned_updated" if status == "update" else "planned_created", 0) + 1
                )
                report["articles"].append(
                    {"source": relative, "id": f"{item.channel_slug}/{item.slug}", "action": status}
                )
                for note in item.mdx_constructs:
                    report["manual_review"].append({"source": relative, "reason": note})
                for media_key, media_path in item.media_paths.items():
                    report["articles"][-1].setdefault("media", []).append(
                        {
                            "field": media_key,
                            "source": display_path(media_path, source_root),
                        }
                    )
            except (OSError, ValueError, yaml.YAMLError, TypeError, AttributeError) as error:
                report["summary"]["skipped"] += 1
                report["errors"].append({"source": relative, "error": str(error)})

        self.validate_relations(parsed, report)
        report["content"] = {
            "topics": len({slug for item in parsed for slug in item.topic_slugs}),
            "tags": len({slugify(name, allow_unicode=False) for item in parsed for name in item.tag_names}),
            "series_memberships": sum(item.series_values is not None for item in parsed),
            "related_links": sum(len(item.related_ids) for item in parsed),
            "revisions": sum(len(item.revisions) for item in parsed),
            "media_files": sum(len(item.media_paths) for item in parsed),
            "mdx_manual_review": len(report["manual_review"]),
        }
        if options["apply"] and not report["errors"]:
            report["summary"]["planned_created"] = report["summary"].get("planned_created", 0)
            report["summary"]["planned_updated"] = report["summary"].get("planned_updated", 0)
            try:
                with transaction.atomic():
                    self.persist(parsed, report)
            except (ValidationError, ValueError, OSError) as error:
                report["errors"].append({"source": "import", "error": str(error)})
                report["summary"]["created"] = 0
                report["summary"]["updated"] = 0

        report_path = options["report"]
        if report_path:
            output_path = report_path.resolve()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2))
        if report["errors"]:
            raise CommandError(f"Import reported {len(report['errors'])} error(s); see report above.")

    def validate_relations(self, parsed: list[ArticleImport], report: dict[str, Any]) -> None:
        ids = {f"{item.channel_slug}/{item.slug}" for item in parsed}
        for item in parsed:
            article_id = f"{item.channel_slug}/{item.slug}"
            try:
                channel = Channel.objects.get(slug=item.channel_slug)
                topics = list(Topic.objects.filter(slug__in=item.topic_slugs, channel=channel))
                missing_topics = set(item.topic_slugs) - {topic.slug for topic in topics}
                if missing_topics:
                    raise ValueError(f"Unknown topic(s) for {item.channel_slug}: {', '.join(sorted(missing_topics))}")
                if not topics:
                    raise ValueError("At least one topic is required.")
                title = item.values["title"]
                if not isinstance(title, str) or not title.strip():
                    raise ValueError("title must be a non-empty string.")
                description = item.values["description"]
                if not isinstance(description, str) or not 20 <= len(description) <= 180:
                    raise ValueError("description must contain 20 to 180 characters.")
                if not isinstance(item.values["hero_alt"], str):
                    raise ValueError("heroAlt must be a string.")
                if not isinstance(item.values["canonical_url"], str):
                    raise ValueError("canonicalURL must be a string.")
                if item.values["kind"] not in Article.Kind.values:
                    raise ValueError(f"Unsupported kind: {item.values['kind']}")
                if item.values["status"] not in Article.Status.values:
                    raise ValueError(f"Unsupported status: {item.values['status']}")
                if len(item.related_ids) > 3:
                    raise ValueError("At most three related articles are supported.")
                if len(item.related_ids) != len(set(item.related_ids)):
                    raise ValueError("Related article ids cannot be repeated.")
                for related_id in item.related_ids:
                    if len(related_id.split("/")) != 2 or not all(related_id.split("/", 1)):
                        raise ValueError(f"Related article id must use channel/slug: {related_id}")
                    if related_id == article_id:
                        raise ValueError("An article cannot relate to itself.")
                    if related_id not in ids and not Article.objects.filter(
                        channel__slug=related_id.split("/", 1)[0],
                        slug=related_id.split("/", 1)[-1],
                    ).exists():
                        raise ValueError(f"Related article does not exist: {related_id}")
                if item.series_values:
                    series_slug = item.series_values.get("id")
                    order = item.series_values.get("order")
                    if not isinstance(series_slug, str) or not series_slug or not isinstance(order, int) or order < 1:
                        raise ValueError("series requires an id and positive integer order.")
                for revision in item.revisions:
                    if (
                        not isinstance(revision, dict)
                        or not isinstance(revision.get("summary"), str)
                        or not revision["summary"].strip()
                    ):
                        raise ValueError("Each revision requires a date and summary.")
                    if len(revision["summary"]) > Revision._meta.get_field("summary").max_length:
                        raise ValueError("Revision summary must contain at most 255 characters.")
                    as_datetime(revision.get("date"), "revision.date")
                existing = Article.objects.filter(channel=channel, slug=item.slug).first()
                primary_topic_slug = item.topic_slugs[0]
                article = existing or Article(
                    slug=item.slug,
                    channel=channel,
                    primary_topic=next(topic for topic in topics if topic.slug == primary_topic_slug),
                    **item.values,
                )
                article.primary_topic = next(topic for topic in topics if topic.slug == primary_topic_slug)
                article.full_clean(exclude=["topics", "tags", "series", "related"])
            except (Channel.DoesNotExist, StopIteration, ValidationError, ValueError) as error:
                report["errors"].append({"source": item.source_path.name, "id": article_id, "error": str(error)})

        order_groups: dict[str, list[int]] = {}
        for item in parsed:
            if item.series_values:
                order_groups.setdefault(item.series_values["id"], []).append(item.series_values["order"])
        for series_id, orders in order_groups.items():
            if sorted(orders) != list(range(1, len(orders) + 1)):
                report["errors"].append(
                    {"id": series_id, "error": f"Series orders must be consecutive from 1; received {sorted(orders)}."}
                )

    def persist(self, parsed: list[ArticleImport], report: dict[str, Any]) -> None:
        article_by_id: dict[str, Article] = {}
        imported_membership_ids = [
            article_id
            for item in parsed
            if (
                article_id := Article.objects.filter(
                    channel__slug=item.channel_slug,
                    slug=item.slug,
                ).values_list("pk", flat=True).first()
            )
        ]
        SeriesArticle.objects.filter(article_id__in=imported_membership_ids).delete()

        for item in parsed:
            channel = Channel.objects.get(slug=item.channel_slug)
            topics = list(Topic.objects.filter(channel=channel, slug__in=item.topic_slugs))
            primary_topic = next(topic for topic in topics if topic.slug == item.topic_slugs[0])
            article, created = Article.objects.update_or_create(
                channel=channel,
                slug=item.slug,
                defaults={
                    **item.values,
                    "primary_topic": primary_topic,
                },
            )
            article.topics.set(topics)
            tags = []
            for name in item.tag_names:
                tag_slug = slugify(name, allow_unicode=False)
                if not tag_slug:
                    raise ValueError(f"Tag cannot be converted to a slug: {name}")
                tag, _ = Tag.objects.get_or_create(slug=tag_slug, defaults={"name": name})
                tags.append(tag)
            article.tags.set(tags)

            for field, image_field in (("heroImage", "hero_image"), ("ogImage", "og_image")):
                source_image = item.media_paths.get(field)
                if source_image:
                    stored_name = Path("articles") / item.channel_slug / item.slug / field / source_image.name
                    stored_name = self.save_media(source_image, stored_name.as_posix())
                    setattr(article, image_field, stored_name)
                elif field not in item.image_fields:
                    setattr(article, image_field, "")
            body_markdown = item.values["body_markdown"]
            for media_key, media_path in item.media_paths.items():
                if not media_key.startswith("body:"):
                    continue
                reference = media_key.removeprefix("body:")
                path_hash = hashlib.sha256(reference.encode("utf-8")).hexdigest()[:12]
                relative_name = (
                    Path("articles")
                    / item.channel_slug
                    / item.slug
                    / "body"
                    / f"{path_hash}-{media_path.name}"
                )
                stored_name = relative_name.as_posix()
                stored_name = self.save_media(media_path, stored_name)
                body_markdown = body_markdown.replace(reference, f"/{default_storage.url(stored_name).lstrip('/')}")
            article.body_markdown = body_markdown
            article.save()
            article.revisions.all().delete()
            for revision in item.revisions:
                Revision.objects.create(
                    article=article,
                    date=as_datetime(revision.get("date"), "revision.date"),
                    summary=revision.get("summary", ""),
                )
            if item.series_values:
                series_slug = item.series_values["id"]
                series, _ = Series.objects.get_or_create(
                    slug=series_slug,
                    defaults={"title": series_slug.replace("-", " ").title()},
                )
                SeriesArticle.objects.create(
                    article=article,
                    series=series,
                    order=item.series_values["order"],
                )
            article_by_id[f"{item.channel_slug}/{item.slug}"] = article
            action = "created" if created else "updated"
            report["summary"][action] += 1

        for item in parsed:
            article = article_by_id[f"{item.channel_slug}/{item.slug}"]
            article.related_links.all().delete()
            for position, related_id in enumerate(item.related_ids, start=1):
                related_channel, related_slug = related_id.split("/", 1)
                related_article = article_by_id.get(related_id) or Article.objects.get(
                    channel__slug=related_channel,
                    slug=related_slug,
                )
                ArticleRelated.objects.create(
                    article=article,
                    related_article=related_article,
                    position=position,
                )

        for series in Series.objects.all():
            validate_series_orders(series)

    @staticmethod
    def save_media(source_path: Path, stored_name: str) -> str:
        with source_path.open("rb") as media_file:
            content = media_file.read()
        relative_path = Path(stored_name)
        content_hash = hashlib.sha256(content).hexdigest()[:12]
        versioned_name = relative_path.with_name(
            f"{relative_path.stem}-{content_hash}{relative_path.suffix}"
        ).as_posix()
        if not default_storage.exists(versioned_name):
            default_storage.save(versioned_name, ContentFile(content))
        return versioned_name
