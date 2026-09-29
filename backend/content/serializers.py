from rest_framework import serializers

from .models import Article, Channel, Revision, Tag, Topic


class RevisionSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(format="iso-8601")

    class Meta:
        model = Revision
        fields = ("date", "summary")


class ArticleSerializer(serializers.Serializer):
    id = serializers.CharField(source="publication_id")
    slug = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    bodyMarkdown = serializers.CharField(source="body_markdown")
    pubDatetime = serializers.DateTimeField(source="pub_datetime", format="iso-8601")
    modDatetime = serializers.DateTimeField(source="mod_datetime", format="iso-8601", allow_null=True)
    channel = serializers.CharField(source="channel.slug")
    topics = serializers.SerializerMethodField()
    primaryTopic = serializers.CharField(source="primary_topic.slug", allow_null=True)
    tags = serializers.SerializerMethodField()
    kind = serializers.CharField()
    status = serializers.CharField()
    draft = serializers.BooleanField(source="is_draft")
    featuredRank = serializers.IntegerField(source="featured_rank", allow_null=True)
    series = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()
    heroImage = serializers.SerializerMethodField()
    ogImage = serializers.SerializerMethodField()
    canonicalURL = serializers.SerializerMethodField()
    revisions = RevisionSerializer(many=True)

    def get_topics(self, article):
        return [topic.slug for topic in article.topics.all()]

    def get_tags(self, article):
        return [tag.name for tag in article.tags.all()]

    def get_series(self, article):
        membership = getattr(article, "series_membership", None)
        if membership is None:
            return None
        return {"id": membership.series.slug, "order": membership.order}

    def get_related(self, article):
        return [link.related_article.publication_id for link in article.related_links.all()]

    def get_heroImage(self, article):
        if not article.hero_image:
            return None
        image = article.hero_image
        try:
            width, height = image.width, image.height
        except (OSError, ValueError):
            width, height = None, None
        return {
            "url": self.absolute_url(image.url),
            "alt": article.hero_alt,
            "width": width,
            "height": height,
        }

    def get_ogImage(self, article):
        if not article.og_image:
            return None
        return self.absolute_url(article.og_image.url)

    def get_canonicalURL(self, article):
        return article.canonical_url or None

    def absolute_url(self, value):
        request = self.context.get("request")
        return request.build_absolute_uri(value) if request else value


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ("slug", "name", "description", "accent")


class TopicSerializer(serializers.ModelSerializer):
    channel = serializers.CharField(source="channel.slug")

    class Meta:
        model = Topic
        fields = ("slug", "name", "description", "accent", "channel")

    accent = serializers.CharField(source="channel.accent")
