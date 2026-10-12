# Production deployment

Build from `backend/` with `docker build -t web-blog-backend .`.
Copy `.env.example` to `.env`, configure PostgreSQL, a secret key,
`DJANGO_ALLOWED_HOSTS` (include `localhost` for the container health check),
`DJANGO_CSRF_TRUSTED_ORIGINS`, and `DJANGO_PUBLIC_ORIGIN` as the public origin.
Use `DJANGO_DATABASE_SSL_REQUIRE=1` for managed PostgreSQL requiring TLS.

WhiteNoise serves the collected Admin static assets with `DEBUG=0`.
Nginx serves `/media/` from a persistent volume, independently of Django's
development media route. Place HTTPS termination at the deployment ingress and
set the public origin and CSRF origins to that HTTPS URL. Keep media backups.
When TLS is terminated by the ingress, set `DJANGO_SECURE_SSL_REDIRECT=1`,
`DJANGO_SECURE_COOKIES=1`, and a suitable `DJANGO_SECURE_HSTS_SECONDS`; the
provided proxy configuration forwards `X-Forwarded-Proto` so Django recognizes
HTTPS requests. For local HTTP deployments, leave these three settings at `0`.
For external media storage, set `DJANGO_MEDIA_URL` to the public media URL and
arrange for the persistent directory to be served there.

Run these explicit release commands before starting the services:

```sh
docker compose -f compose.production.yaml run --rm backend python manage.py migrate
docker compose -f compose.production.yaml run --rm backend python manage.py collectstatic --noinput
docker compose -f compose.production.yaml run --rm backend python manage.py import_publication --source content/source/posts --apply
docker compose -f compose.production.yaml up -d
```

The container's default command starts Gunicorn only. Database migration and
static collection are release operations and do not run on every restart.
The example publishes the proxy on port 8000. Verify
`/api/publication/v1/health/`, `/admin/login/`, `/static/admin/css/base.css`, and
the hero/OG/body image URLs returned by the API. Configure the frontend's
`CONTENT_MEDIA_ORIGIN` to the same publicly accessible media origin.
