from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("content", "0002_seed_taxonomy")]
    operations = [
        migrations.AlterField(
            model_name="article",
            name="primary_topic",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="primary_articles",
                to="content.topic",
            ),
        )
    ]
