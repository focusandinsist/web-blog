from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator, MaxValueValidator, MinLengthValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q


class Channel(models.Model):
    class Accent(models.TextChoices):
        SIGNAL = "signal", "Signal"
        WARM = "warm", "Warm"
        VALUE = "value", "Value"

    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    accent = models.CharField(max_length=16, choices=Accent.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.name


class Topic(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    channel = models.ForeignKey(Channel, on_delete=models.PROTECT, related_name="topics")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["channel__slug", "slug"]

    def __str__(self) -> str:
        return self.name


class Tag(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.name


class Series(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.title


class Article(models.Model):
    class Kind(models.TextChoices):
        ARTICLE = "article", "Article"
        CASE_STUDY = "case-study", "Case study"

    class Status(models.TextChoices):
        COMPLETE = "complete", "Complete"
        EVOLVING = "evolving", "Evolving"
        ARCHIVED = "archived", "Archived"

    slug = models.SlugField(max_length=200)
    title = models.CharField(max_length=200)
    description = models.CharField(
        max_length=180,
        validators=[MinLengthValidator(20), MaxLengthValidator(180)],
    )
    body_markdown = models.TextField()
    channel = models.ForeignKey(Channel, on_delete=models.PROTECT, related_name="articles")
    topics = models.ManyToManyField(Topic, related_name="articles", blank=True)
    primary_topic = models.ForeignKey(
        Topic,
        on_delete=models.PROTECT,
        related_name="primary_articles",
    )
    tags = models.ManyToManyField(Tag, related_name="articles", blank=True)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.ARTICLE)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.COMPLETE)
    featured_rank = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(99)],
    )
    series = models.ManyToManyField(
        Series,
        through="SeriesArticle",
        related_name="articles",
        blank=True,
    )
    related = models.ManyToManyField(
        "self",
        through="ArticleRelated",
        through_fields=("article", "related_article"),
        symmetrical=False,
        related_name="related_to",
        blank=True,
    )
    hero_image = models.ImageField(upload_to="articles/%Y/%m/", blank=True)
    hero_alt = models.CharField(max_length=255, blank=True)
    og_image = models.ImageField(upload_to="articles/%Y/%m/", blank=True)
    canonical_url = models.URLField(blank=True)
    is_draft = models.BooleanField(default=True)
    pub_datetime = models.DateTimeField()
    mod_datetime = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-pub_datetime"]
        constraints = [
            models.UniqueConstraint(fields=["channel", "slug"], name="article_channel_slug_unique"),
            models.CheckConstraint(
                condition=Q(featured_rank__isnull=True) | Q(featured_rank__gte=1, featured_rank__lte=99),
                name="article_featured_rank_valid",
            ),
            models.CheckConstraint(
                condition=Q(hero_image="") | ~Q(hero_alt=""),
                name="article_hero_alt_required",
            ),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def publication_id(self) -> str:
        return f"{self.channel.slug}/{self.slug}"

    def clean(self) -> None:
        errors: dict[str, str] = {}
        if self.primary_topic_id and self.channel_id and self.primary_topic.channel_id != self.channel_id:
            errors["primary_topic"] = "Primary topic must belong to the article channel."
        if self.hero_image and not self.hero_alt.strip():
            errors["hero_alt"] = "Hero alt text is required when a hero image is set."
        if errors:
            raise ValidationError(errors)


class SeriesArticle(models.Model):
    series = models.ForeignKey(Series, on_delete=models.CASCADE, related_name="memberships")
    article = models.OneToOneField(Article, on_delete=models.CASCADE, related_name="series_membership")
    order = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["series", "order"], name="series_order_unique"),
            models.CheckConstraint(condition=Q(order__gte=1), name="series_order_positive"),
        ]

    def __str__(self) -> str:
        return f"{self.series}: {self.order}"


class ArticleRelated(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="related_links")
    related_article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="incoming_related_links",
    )
    position = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)]
    )

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["article", "related_article"],
                name="article_related_unique",
            ),
            models.UniqueConstraint(
                fields=["article", "position"],
                name="article_related_position_unique",
            ),
            models.CheckConstraint(
                condition=Q(position__gte=1, position__lte=3),
                name="article_related_position_valid",
            ),
            models.CheckConstraint(
                condition=~Q(article=F("related_article")),
                name="article_related_not_self",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.article} -> {self.related_article}"

    def clean(self) -> None:
        if self.article_id and self.article_id == self.related_article_id:
            raise ValidationError({"related_article": "An article cannot relate to itself."})


class Revision(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="revisions")
    date = models.DateTimeField()
    summary = models.CharField(max_length=255)

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.article}: {self.date:%Y-%m-%d}"
