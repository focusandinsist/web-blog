import base64

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.urls import reverse

from django.forms.models import inlineformset_factory

from content.forms import ArticleAdminForm, SeriesArticleInlineForm, SeriesArticleInlineFormSet
from content.models import Article, Channel, Series, SeriesArticle, Topic


class AdminSmokeTests(TestCase):
    def setUp(self):
        self.client = Client()
        user_model = get_user_model()
        self.user = user_model.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="test-password",
        )
        self.client.force_login(self.user)
        self.technology = Channel.objects.get(slug="technology")
        self.life = Channel.objects.get(slug="life")
        self.systems = Topic.objects.get(slug="systems-programming")
        self.reading = Topic.objects.get(slug="reading")

    def test_content_models_are_registered(self):
        from content.models import Article, Channel, Series, Tag, Topic

        for model in (Article, Channel, Series, Tag, Topic):
            self.assertIn(model, admin.site._registry)

    def test_article_add_page_is_reachable(self):
        response = self.client.get(reverse("admin:content_article_add"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Basic information")
        self.assertContains(response, "Body markdown")

    def test_admin_can_create_a_valid_draft_article(self):
        data = self.form_data()
        for prefix in ("series_membership", "related_links", "revisions"):
            data.update(
                {
                    f"{prefix}-TOTAL_FORMS": "0",
                    f"{prefix}-INITIAL_FORMS": "0",
                    f"{prefix}-MIN_NUM_FORMS": "0",
                    f"{prefix}-MAX_NUM_FORMS": "1000",
                }
            )

        response = self.client.post(
            reverse("admin:content_article_add"), data=data, follow=False
        )

        if response.status_code != 302:
            errors = [str(response.context["adminform"].errors)]
            errors.extend(str(inline.formset.non_form_errors()) for inline in response.context["inline_admin_formsets"])
            self.fail("Admin form did not save: " + " | ".join(errors))
        self.assertTrue(Article.objects.get(slug="admin-form-example").is_draft)

    def form_data(self, **overrides):
        data = {
            "slug": "admin-form-example",
            "title": "Admin form example",
            "description": "A sufficiently long article description for validation.",
            "body_markdown": "## Body",
            "channel": str(self.technology.pk),
            "topics": [str(self.systems.pk)],
            "primary_topic": str(self.systems.pk),
            "kind": "article",
            "status": "complete",
            "is_draft": "on",
            "pub_datetime_0": "2026-09-01",
            "pub_datetime_1": "00:00:00",
            "mod_datetime": "",
            "featured_rank": "",
            "canonical_url": "",
        }
        data.update(overrides)
        return data

    def test_article_form_rejects_cross_channel_topic(self):
        form = ArticleAdminForm(
            data=self.form_data(
                topics=[str(self.reading.pk)],
                primary_topic=str(self.reading.pk),
            )
        )

        self.assertFalse(form.is_valid())
        self.assertIn("topics", form.errors)

    def test_article_form_rejects_primary_topic_outside_selected_topics(self):
        form = ArticleAdminForm(
            data=self.form_data(primary_topic="")
        )

        self.assertFalse(form.is_valid())
        self.assertIn("primary_topic", form.errors)

    def test_article_form_rejects_hero_image_without_alt_text(self):
        form = ArticleAdminForm(
            data=self.form_data(hero_alt=""),
            files={
                "hero_image": SimpleUploadedFile(
                    "hero.png",
                    base64.b64decode(
                        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
                    ),
                    content_type="image/png",
                )
            },
        )

        self.assertFalse(form.is_valid())
        self.assertIn("hero_alt", form.errors)

    def test_series_inline_rejects_a_gap_in_existing_orders(self):
        series = Series.objects.create(slug="admin-series", title="Admin series")
        first = Article.objects.create(
            slug="admin-series-first",
            title="Admin series first",
            description="A sufficiently long article description for validation.",
            body_markdown="Body",
            channel=self.technology,
            primary_topic=self.systems,
            pub_datetime="2026-09-01T00:00:00Z",
        )
        current = Article.objects.create(
            slug="admin-series-current",
            title="Admin series current",
            description="A sufficiently long article description for validation.",
            body_markdown="Body",
            channel=self.technology,
            primary_topic=self.systems,
            pub_datetime="2026-09-02T00:00:00Z",
        )
        SeriesArticle.objects.create(series=series, article=first, order=1)
        formset_class = inlineformset_factory(
            Article,
            SeriesArticle,
            form=SeriesArticleInlineForm,
            formset=SeriesArticleInlineFormSet,
            extra=1,
        )

        formset = formset_class(
            data={
                "series_membership-TOTAL_FORMS": "1",
                "series_membership-INITIAL_FORMS": "0",
                "series_membership-MIN_NUM_FORMS": "0",
                "series_membership-MAX_NUM_FORMS": "1",
                "series_membership-0-series": str(series.pk),
                "series_membership-0-order": "3",
            },
            instance=current,
        )

        self.assertFalse(formset.is_valid())
        self.assertTrue(any("consecutive" in str(error) for error in formset.non_form_errors()))
