from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [("content", "0003_require_primary_topic")]
    operations = [
        migrations.AddConstraint(
            model_name="article",
            constraint=models.CheckConstraint(
                condition=Q(hero_image="") | ~Q(hero_alt=""),
                name="article_hero_alt_required",
            ),
        )
    ]
