from collections.abc import Iterable

from django.core.exceptions import ValidationError

from .models import Article, Series, SeriesArticle, Topic


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
