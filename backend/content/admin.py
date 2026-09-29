from django.contrib import admin

from .forms import (
    ArticleAdminForm,
    ArticleRelatedInlineForm,
    SeriesArticleInlineForm,
    SeriesArticleInlineFormSet,
)
from .models import (
    Article,
    ArticleRelated,
    Channel,
    Revision,
    Series,
    SeriesArticle,
    Tag,
    Topic,
)
from .services import validate_article_topics


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "accent", "is_active")
    list_filter = ("accent", "is_active")
    search_fields = ("slug", "name")


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "channel", "is_active")
    list_filter = ("channel", "is_active")
    search_fields = ("slug", "name")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("slug", "name")
    search_fields = ("slug", "name")


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = ("slug", "title")
    search_fields = ("slug", "title")


class SeriesArticleInline(admin.TabularInline):
    model = SeriesArticle
    form = SeriesArticleInlineForm
    formset = SeriesArticleInlineFormSet
    extra = 0


class ArticleRelatedInline(admin.TabularInline):
    model = ArticleRelated
    form = ArticleRelatedInlineForm
    fk_name = "article"
    extra = 0
    max_num = 3


class RevisionInline(admin.StackedInline):
    model = Revision
    extra = 0


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    form = ArticleAdminForm
    list_display = ("title", "channel", "is_draft", "pub_datetime", "status")
    list_filter = ("channel", "is_draft", "status", "kind")
    search_fields = ("slug", "title", "description")
    filter_horizontal = ("topics", "tags")
    inlines = (SeriesArticleInline, ArticleRelatedInline, RevisionInline)
    fieldsets = (
        ("Basic information", {"fields": ("title", "slug", "description", "channel", "topics", "primary_topic", "tags")} ),
        ("Publication", {"fields": ("is_draft", "pub_datetime", "mod_datetime", "status", "kind", "featured_rank")} ),
        ("Body", {"fields": ("body_markdown",)}),
        ("Images and SEO", {"fields": ("hero_image", "hero_alt", "og_image", "canonical_url")} ),
    )

    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)
        validate_article_topics(obj, form.cleaned_data.get("topics"))
