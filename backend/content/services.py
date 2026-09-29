from collections.abc import Iterable
from datetime import datetime

from django.core.exceptions import ValidationError
from django.db.models import F, Prefetch, Q
from django.db.models.functions import Coalesce, Length, Trim
from django.utils import timezone

from .models import Article, ArticleRelated, Revision, Series, SeriesArticle, Tag, Topic


class PublishedArticleQuery:
    @staticmethod
    def all(as_of: datetime | None = None):
        current_time = as_of or timezone.now()
        return (
            Article.objects.filter(is_draft=False, pub_datetime__lte=current_time)
            .annotate(
                _trimmed_title=Trim("title"),
                _trimmed_description=Trim("description"),
                _trimmed_hero_alt=Trim("hero_alt"),
                _title_length=Length("title"),
                _description_length=Length("description"),
                _hero_alt_length=Length("hero_alt"),
            )
            .filter(
                Q(hero_image="") | ~Q(_trimmed_hero_alt=""),
                ~Q(_trimmed_title=""),
                ~Q(_trimmed_description=""),
                channel__is_active=True,
                primary_topic__is_active=True,
                primary_topic__channel_id=F("channel_id"),
                topics__pk=F("primary_topic_id"),
                body_markdown__gt="",
                _title_length__lte=200,
                _description_length__gte=20,
                _description_length__lte=180,
                _hero_alt_length__lte=255,
                kind__in=Article.Kind.values,
                status__in=Article.Status.values,
            )
            .exclude(topics__is_active=False)
            .annotate(_publication_order=Coalesce("mod_datetime", "pub_datetime"))
            .order_by("-_publication_order", "channel__slug", "slug")
            .select_related("channel", "primary_topic", "series_membership__series")
            .prefetch_related(
                Prefetch("topics", queryset=Topic.objects.order_by("slug")),
                Prefetch("tags", queryset=Tag.objects.order_by("slug")),
                Prefetch(
                    "related_links",
                    queryset=ArticleRelated.objects.select_related(
                        "related_article__channel"
                    ).order_by("position"),
                ),
                Prefetch("revisions", queryset=Revision.objects.order_by("date", "pk")),
            )
            .distinct()
        )


def validate_article_topics(
    article: Article,
    topics: Iterable[Topic] | None = None,
) -> None:
    selected_topics = list(topics if topics is not None else article.topics.all())
    errors: dict[str, str] = {}
    if not selected_topics:
        errors["topics"] = "An article must belong to at least one topic."
    if any(topic.channel_id != article.channel_id for topic in selected_topics):
        errors["topics"] = "Every topic must belong to the article channel."
    if not article.primary_topic_id:
        errors["primary_topic"] = "An article must have a primary topic."
    elif article.primary_topic_id not in {topic.pk for topic in selected_topics}:
        errors["primary_topic"] = "Primary topic must be one of the selected topics."
    if errors:
        raise ValidationError(errors)


def validate_series_orders(series: Series) -> None:
    orders = list(
        SeriesArticle.objects.filter(series=series)
        .order_by("order")
        .values_list("order", flat=True)
    )
    expected = list(range(1, len(orders) + 1))
    if orders != expected:
        raise ValidationError(
            {"order": f'Series "{series.slug}" orders must be consecutive from 1.'}
        )
