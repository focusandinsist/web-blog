# Django content backend

The root `pnpm dev` command starts Django and Astro together. It waits for the Django health endpoint before starting Astro.

From the repository root, initialize the local environment and database:

```text
copy .env.example .env
python -m pip install -r backend/requirements.txt
pnpm django:migrate
python backend/manage.py import_publication --apply
pnpm django:createsuperuser
pnpm dev
```

The seeded taxonomy contains the three supported channels and eleven canonical topics. Django Admin is available at `http://127.0.0.1:8000/admin/`; Astro is at `http://127.0.0.1:4321/`. Press `Ctrl+C` in the `pnpm dev` terminal to stop both services.

`.env.example` documents `CONTENT_API_URL`, `DATABASE_URL`, `DJANGO_MEDIA_ROOT`, Django's bind host and port, and Astro's host and port. `DATABASE_URL` must point to a running PostgreSQL database. For Render, set it to the PostgreSQL connection URL in the Django service environment. The Django API health endpoint is `http://127.0.0.1:8000/api/publication/v1/health/`.

You can also start Django alone with `python backend/manage.py runserver 127.0.0.1:8000`; Django loads the root `.env` itself. The `pnpm build` command checks the configured API health endpoint before generating static pages and search indexes; it exits with an actionable error when the API is unavailable.

Run the backend checks with:

```text
pnpm django:check
pnpm django:test
```

The one-time Markdown migration command remains available from the repository root.
Its default mode only parses and validates, then prints a JSON report without changing
the database. Apply a clean import with `--apply`; an error prevents the entire database
write. Use `--report path.json` to save the report. MDX and JSX syntax is retained as
source and listed under `manual_review` for conversion before importing into Django.
The current corpus import report is documented in `docs/designs/phase-2-import-report.md`.

```text
python backend/manage.py import_publication
python backend/manage.py import_publication --apply --report backend/content/import-report.json
```

The read-only publication API is available under `/api/publication/v1/`:

```text
GET /api/publication/v1/articles/
GET /api/publication/v1/articles/{channel}/{slug}/
GET /api/publication/v1/taxonomy/
GET /api/publication/v1/health/
```

Its response contract is captured in `content/fixtures/publication_api.json`. With the
Django server running, verify the JSON contract from Node with:

```text
node test/backend/read_publication_api.mjs
```
