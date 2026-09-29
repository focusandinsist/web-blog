from django.db import DatabaseError, connection
from django.http import Http404
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.status import HTTP_503_SERVICE_UNAVAILABLE

from .models import Channel, Topic
from .serializers import ArticleSerializer, ChannelSerializer, TopicSerializer
from .services import PublishedArticleQuery


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def article_list(request):
    articles = PublishedArticleQuery.all()
    return Response(ArticleSerializer(articles, many=True, context={"request": request}).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def article_detail(request, channel, slug):
    article = PublishedArticleQuery.all().filter(channel__slug=channel, slug=slug).first()
    if article is None:
        raise Http404
    return Response(ArticleSerializer(article, context={"request": request}).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def taxonomy(request):
    channels = Channel.objects.filter(is_active=True).order_by("slug")
    topics = Topic.objects.filter(is_active=True, channel__is_active=True).select_related("channel").order_by(
        "channel__slug", "slug"
    )
    return Response(
        {
            "channels": ChannelSerializer(channels, many=True).data,
            "topics": TopicSerializer(topics, many=True).data,
        }
    )


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    try:
        connection.ensure_connection()
    except DatabaseError:
        return Response({"status": "unavailable"}, status=HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"status": "ok"})
