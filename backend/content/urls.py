from django.urls import path

from . import api


urlpatterns = [
    path("articles/", api.article_list, name="publication-article-list"),
    path("articles/<slug:channel>/<slug:slug>/", api.article_detail, name="publication-article-detail"),
    path("taxonomy/", api.taxonomy, name="publication-taxonomy"),
    path("health/", api.health, name="publication-health"),
]
