from pathlib import Path
import json
import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Create a draft Markdown article in backend/content/source/posts/."

    def add_arguments(self, parser):
        parser.add_argument("--channel", required=True)
        parser.add_argument("--slug", required=True)
        parser.add_argument("--title", required=True)
        parser.add_argument("--topic", required=True)

    def handle(self, *args, **options):
        if options["channel"] not in {"technology", "life", "investment"}:
            raise CommandError("Unknown channel. Expected technology, life, or investment.")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", options["slug"]):
            raise CommandError("Slug must use lowercase letters, numbers, and single hyphens.")
        if not options["title"].strip():
            raise CommandError("Title is required.")
        if not options["topic"].strip():
            raise CommandError("Topic is required.")
        root = settings.BASE_DIR / "content" / "source" / "posts" / options["channel"]
        path = root / f"{options['slug']}.md"
        if path.exists():
            raise CommandError(f"Article already exists: {path}")
        root.mkdir(parents=True, exist_ok=True)
        path.write_text(
            "---\n"
            f"title: {json.dumps(options['title'], ensure_ascii=False)}\n"
            "description: 请在发布前填写 20 到 180 个字符的文章摘要。\n"
            f"pubDatetime: {timezone.now().isoformat()}\n"
            f"channel: {options['channel']}\n"
            f"topics: [{options['topic']}]\n"
            "tags: []\n"
            "draft: true\n"
            "---\n\n## 问题\n\n正文内容。\n\n## 结论\n\n正文内容。\n",
            encoding="utf-8",
        )
        self.stdout.write(f"Created {path}\n")
