from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from content.models import Article, ArticleRelated, Series, SeriesArticle
from content.services import validate_article_topics, validate_series_orders


class ArticleModelTests(TestCase):
    def setUp(self):
        from content.models import Channel, Topic

        self.technology = Channel.objects.get(slug="technology")
        self.life = Channel.objects.get(slug="life")
        self.systems = Topic.objects.get(slug="systems-programming")
        self.reading = Topic.objects.get(slug="reading")

    def article(self, **overrides):
        values = {
            "slug": "validation-example",
            "title": "Validation example",
            "description": "A sufficiently long article description for validation.",
            "body_markdown": "## Body\n\nContent.",
            "channel": self.technology,
            "primary_topic": self.systems,
            "pub_datetime": timezone.now(),
            "is_draft": True,
        }
        values.update(overrides)
        return Article.objects.create(**values)

    def test_seeded_taxonomy_contains_all_supported_channels_and_topics(self):
        from content.models import Channel, Topic

        self.assertEqual(set(Channel.objects.values_list("slug", flat=True)), {"technology", "life", "investment"})
        self.assertEqual(Topic.objects.count(), 11)

    def test_primary_topic_must_belong_to_article_channel(self):
        article = self.article(primary_topic=self.reading)

        with self.assertRaises(ValidationError):
            article.full_clean()

    def test_topics_must_exist_and_match_article_channel(self):
        article = self.article()
        article.topics.set([self.reading])

        with self.assertRaises(ValidationError):
            validate_article_topics(article)

        article.topics.clear()
        with self.assertRaises(ValidationError):
            validate_article_topics(article)

    def test_hero_image_requires_alt_text(self):
        article = Article(
            slug="hero-validation",
            title="Hero validation",
            description="A sufficiently long article description for validation.",
            body_markdown="Body",
            channel=self.technology,
            primary_topic=self.systems,
            hero_image="articles/example/hero.webp",
            hero_alt="",
            pub_datetime=timezone.now(),
        )

        with self.assertRaises(ValidationError):
            article.full_clean()

    def test_related_article_cannot_reference_itself(self):
        article = self.article()
        link = ArticleRelated(article=article, related_article=article, position=1)

        with self.assertRaises(ValidationError):
            link.full_clean()

    def test_series_order_is_unique_and_contiguous(self):
        series = Series.objects.create(slug="validation-series", title="Validation series")
        first = self.article(slug="series-first")
        third = self.article(slug="series-third")
        SeriesArticle.objects.create(series=series, article=first, order=1)
        SeriesArticle.objects.create(series=series, article=third, order=3)

        with self.assertRaises(ValidationError):
            validate_series_orders(series)

        duplicate = self.article(slug="series-duplicate")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                SeriesArticle.objects.create(series=series, article=duplicate, order=1)
