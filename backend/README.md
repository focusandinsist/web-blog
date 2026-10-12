# Backend

Django 内容服务，负责 PostgreSQL 数据、Admin、文章导入、媒体存储和只读发布 API。

## 从 backend/ 运行

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py check
python manage.py test
python manage.py runserver 127.0.0.1:8000
```

`.env` 至少需要 `DATABASE_URL`、`DJANGO_SECRET_KEY`、`DJANGO_ALLOWED_HOSTS`、`DJANGO_PUBLIC_ORIGIN`、`DJANGO_MEDIA_ROOT` 和 `DJANGO_CSRF_TRUSTED_ORIGINS`。生产环境使用 PostgreSQL 和持久化 `MEDIA_ROOT`。

## 内容与 API

文章源位于 `content/source/posts/`：

```powershell
python manage.py import_publication --source content/source/posts
python manage.py import_publication --source content/source/posts --apply --report content/import-report.json
python manage.py check_content
python manage.py new_article --channel technology --slug example --title "Example" --topic systems-programming
```

API 位于 `/api/publication/v1/`，Admin 位于 `/admin/`。契约检查：

```powershell
python tests/read_publication_api.py
```

## 生产部署

```powershell
docker build -f Dockerfile -t web-blog-backend .
docker compose -f compose.production.yaml run --rm backend python manage.py migrate
docker compose -f compose.production.yaml run --rm backend python manage.py collectstatic --noinput
docker compose -f compose.production.yaml up -d
```

镜像只启动 Gunicorn；迁移、静态文件收集和内容导入是显式 release 操作。WhiteNoise 提供静态文件，Nginx 和持久卷提供媒体文件。
