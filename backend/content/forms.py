from django import forms
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from .models import Article, ArticleRelated, SeriesArticle, Topic
from .services import validate_article_topics


class ArticleAdminForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        channel = cleaned_data.get("channel")
        topics = cleaned_data.get("topics")
        primary_topic = cleaned_data.get("primary_topic")
        if channel and topics is not None:
            article = self.instance
            article.channel = channel
            article.primary_topic = primary_topic
            try:
                validate_article_topics(article, topics)
            except ValidationError as error:
                for field, messages in error.message_dict.items():
                    for message in messages:
                        self.add_error(field, message)
        if cleaned_data.get("hero_image") and not (cleaned_data.get("hero_alt") or "").strip():
            self.add_error("hero_alt", "Hero alt text is required when a hero image is set.")
        return cleaned_data


class SeriesArticleInlineForm(forms.ModelForm):
    class Meta:
        model = SeriesArticle
        fields = "__all__"


class SeriesArticleInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        if any(self.errors):
            return

        pending_by_series: dict[int, set[int]] = {}
        affected_series: set[int] = set()
        for form in self.forms:
            if not form.cleaned_data:
                continue
            if form.instance.pk and form.instance.series_id:
                affected_series.add(form.instance.series_id)
            if form.cleaned_data.get("DELETE"):
                continue
            series = form.cleaned_data.get("series")
            order = form.cleaned_data.get("order")
            if series is None or order is None:
                continue
            affected_series.add(series.pk)
            orders = pending_by_series.setdefault(series.pk, set())
            if order in orders:
                raise ValidationError("A series cannot contain duplicate order values.")
            orders.add(order)

        for series_id in affected_series:
            pending_orders = pending_by_series.get(series_id, set())
            existing_query = SeriesArticle.objects.filter(series_id=series_id)
            if self.instance.pk:
                existing_query = existing_query.exclude(article=self.instance)
            existing_orders = set(existing_query.values_list("order", flat=True))
            orders = sorted(existing_orders | pending_orders)
            if orders != list(range(1, len(orders) + 1)):
                raise ValidationError("Series orders must be consecutive from 1.")


class ArticleRelatedInlineForm(forms.ModelForm):
    class Meta:
        model = ArticleRelated
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("article") == cleaned_data.get("related_article"):
            raise ValidationError("An article cannot relate to itself.")
        return cleaned_data


def topic_queryset_for_channel(channel_id: int | None):
    if channel_id is None:
        return Topic.objects.none()
    return Topic.objects.filter(channel_id=channel_id, is_active=True)
