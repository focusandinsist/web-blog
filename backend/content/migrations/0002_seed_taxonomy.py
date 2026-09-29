from django.db import migrations


CHANNELS = [
    {
        "slug": "technology",
        "name": "技术记录",
        "description": "系统、并发、协议、存储与游戏工程中的判断和取舍。",
        "accent": "signal",
    },
    {
        "slug": "life",
        "name": "生活记录",
        "description": "阅读、体验和十年开发生活之外的观察与复盘。",
        "accent": "warm",
    },
    {
        "slug": "investment",
        "name": "投资记录",
        "description": "记录假设、证据、过程与复盘，不构成任何投资建议。",
        "accent": "value",
    },
]

TOPICS = [
    ("systems-programming", "系统编程", "Linux、网络、内存与输入输出边界中的工程实践。", "technology"),
    ("concurrency-engineering", "并发工程", "高并发系统的性能、可靠性与容量治理。", "technology"),
    ("realtime-systems", "实时系统", "即时通信、协议、在线状态与消息投递。", "technology"),
    ("data-systems", "数据系统", "数据库、缓存、存储与恢复路径的设计取舍。", "technology"),
    ("game-technology", "游戏技术", "引擎、游戏服务器与实时同步的工程记录。", "technology"),
    ("reading", "阅读方法", "围绕真实问题组织阅读、笔记与实践。", "life"),
    ("reflection", "个人复盘", "用事实和行动回看工作与日常生活。", "life"),
    ("observation", "日常观察", "记录生活现场中值得持续留意的变化。", "life"),
    ("decision-making", "投资决策", "保留假设、证据、失效条件与决策过程。", "investment"),
    ("risk-management", "风险管理", "从可承受损失出发记录仓位与期限约束。", "investment"),
    ("research", "证据研究", "区分事实、推断和预测，主动寻找反证。", "investment"),
]


def seed_taxonomy(apps, schema_editor):
    Channel = apps.get_model("content", "Channel")
    Topic = apps.get_model("content", "Topic")
    channels = {}
    for values in CHANNELS:
        channel, _ = Channel.objects.update_or_create(slug=values["slug"], defaults=values)
        channels[channel.slug] = channel
    for slug, name, description, channel_slug in TOPICS:
        Topic.objects.update_or_create(
            slug=slug,
            defaults={
                "name": name,
                "description": description,
                "channel": channels[channel_slug],
                "is_active": True,
            },
        )


def unseed_taxonomy(apps, schema_editor):
    Topic = apps.get_model("content", "Topic")
    Channel = apps.get_model("content", "Channel")
    Topic.objects.filter(slug__in=[topic[0] for topic in TOPICS]).delete()
    Channel.objects.filter(slug__in=[channel["slug"] for channel in CHANNELS]).delete()


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]
    operations = [migrations.RunPython(seed_taxonomy, unseed_taxonomy)]
