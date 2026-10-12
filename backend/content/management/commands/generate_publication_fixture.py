import json
from datetime import date, datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from PIL import Image

from .import_publication import parse_article


def iso(value):
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat() + "Z"
    return None if value is None else str(value)


class Command(BaseCommand):
    help = "Generate the publication API import snapshot from backend content source."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=Path, default=Path("content/source/posts"))
        parser.add_argument(
            "--output",
            type=Path,
            default=Path("content/fixtures/publication.json"),
        )

    def handle(self, *args, **options):
        source = options["source"]
        source_root = source if source.is_absolute() else settings.BASE_DIR / source
        output = options["output"]
        output_path = output if output.is_absolute() else settings.BASE_DIR / output
        articles = []
        for path in sorted(source_root.rglob("*")):
            if path.suffix.lower() not in {".md", ".mdx"}:
                continue
            item = parse_article(path, source_root)
            hero = None
            hero_path = item.media_paths.get("heroImage")
            if hero_path:
                with Image.open(hero_path) as image:
                    width, height = image.size
                hero = {
                    "url": f"/media/articles/{item.channel_slug}/{item.slug}/hero.webp",
                    "alt": item.values["hero_alt"],
                    "width": width,
                    "height": height,
                }
            articles.append(
                {
                    "id": f"{item.channel_slug}/{item.slug}",
                    "slug": item.slug,
                    "title": item.values["title"],
                    "description": item.values["description"],
                    "bodyMarkdown": item.values["body_markdown"],
                    "pubDatetime": iso(item.values["pub_datetime"]),
                    "modDatetime": iso(item.values["mod_datetime"]),
                    "channel": item.channel_slug,
                    "topics": item.topic_slugs,
                    "primaryTopic": item.topic_slugs[0] if item.topic_slugs else None,
                    "tags": item.tag_names,
                    "kind": item.values["kind"],
                    "status": item.values["status"],
                    "draft": item.values["is_draft"],
                    "featuredRank": item.values["featured_rank"],
                    "series": item.series_values,
                    "related": item.related_ids,
                    "heroImage": hero,
                    "ogImage": (
                        f"/media/articles/{item.channel_slug}/{item.slug}/og.webp"
                        if "ogImage" in item.image_fields
                        else None
                    ),
                    "canonicalURL": item.values["canonical_url"] or None,
                    "revisions": [
                        {"date": iso(revision["date"]), "summary": revision["summary"]}
                        for revision in item.revisions
                    ],
                }
            )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps({"version": 1, "source": "content/source/posts", "articles": articles}, ensure_ascii=False, indent=2)
            + "\n",
            encoding="utf-8",
        )
        self.stdout.write(f"Wrote {len(articles)} articles to {output_path}\n")
