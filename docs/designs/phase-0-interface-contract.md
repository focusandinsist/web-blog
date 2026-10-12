# Phase 0: Interface Contract

This document freezes the public route and content shape before Django becomes the
content source. The route structure and visual components remain Astro-owned.

## Public routes

| Route | Source | Purpose |
| --- | --- | --- |
| `/` | `src/pages/index.astro` | Home cover and channel lobby |
| `/articles/` | `src/pages/articles/[...page].astro` | Chronological article directory and pagination |
| `/articles/{channel}/{slug}/` | `src/pages/articles/[...slug]/index.astro` | Article reading page |
| `/channels/` | `src/pages/channels/index.astro` | Channel directory |
| `/channels/{channel}/` | `src/pages/channels/[channel]/index.astro` | Channel article and topic directory |
| `/topics/` | `src/pages/topics/index.astro` | Topic directory |
| `/topics/{topic}/` | `src/pages/topics/[topic]/index.astro` | Topic article directory |
| `/tags/` | `src/pages/tags/index.astro` | Tag directory |
| `/tags/{tag}/{page}/` | `src/pages/tags/[tag]/[...page].astro` | Paginated tag directory |
| `/projects/` | `src/pages/projects/index.astro` | Case study directory |
| `/archives/` | `src/pages/archives/index.astro` | Published article archive |
| `/search/` | `src/pages/search.astro` | Pagefind search UI |
| `/about/` | `src/pages/about.astro` | About page |
| `/rss.xml` | `src/pages/rss.xml.ts` | Publication feed |
| `/robots.txt` | `src/pages/robots.txt.ts` | Crawler policy |

The site uses the default `zh-CN` locale without a locale prefix. Article identity is
`{channel}/{slug}` and the article route is the only public route that depends on it.

## Public API field contract

The first Django API version is rooted at `/api/publication/v1/`.

### Article DTO

| Field | JSON type | Public meaning |
| --- | --- | --- |
| `id` | string | Stable `{channel}/{slug}` identity |
| `slug` | string | Channel-local article slug |
| `title` | string | Article title |
| `description` | string | 20-180 character summary |
| `bodyMarkdown` | string | Unsanitized Markdown source; no executable MDX |
| `pubDatetime` | ISO-8601 string | Publication time |
| `modDatetime` | ISO-8601 string or null | Last substantive update |
| `channel` | string | `technology`, `life`, or `investment` |
| `topics` | string[] | One or more topic slugs |
| `primaryTopic` | string or null | Topic used for article context |
| `tags` | string[] | Cross-channel discovery labels |
| `kind` | string | `article` or `case-study` |
| `status` | string | `complete`, `evolving`, or `archived` |
| `draft` | boolean | Always `false` in the public response |
| `featuredRank` | integer or null | Optional channel home ordering, 1-99 |
| `series` | object or null | `{ id: string, order: positive integer }` |
| `related` | string[] | Up to three ordered article identities |
| `heroImage` | object or null | `{ url, alt, width, height }` |
| `ogImage` | string or null | Absolute or API-resolved sharing image URL |
| `canonicalURL` | string or null | Optional canonical URL |
| `revisions` | object[] | `{ date: ISO-8601 string, summary: string }` |

### Other responses

`GET /taxonomy/` returns active channel and topic display objects. Each channel
contains `slug`, `name`, `description`, and `accent`; each topic contains those same
display fields plus its channel slug. `GET /health/` returns a small status object and
does not expose content or management fields.

## Fixture and regression baseline

`backend/content/fixtures/publication.json` is generated from every existing Markdown
article by `pnpm fixture:publication`. It includes published articles and the current
draft so contract tests can verify publication filtering. Missing frontmatter values
are normalized to the defaults currently applied by `src/content.config.ts`.

The Playwright baseline is the existing home, directory, article, SEO, search,
navigation, no-JS, theme, and site-health suite under `tests/e2e`. Run it with:

```text
pnpm test
pnpm test:e2e
pnpm check
pnpm build
```

The baseline must remain green before the Astro content source is changed.

Baseline captured on 2026-09-29:

- `pnpm test`: 41 tests passed.
- `pnpm test:e2e`: 34 tests passed across Chromium and no-JS projects.
- `pnpm check`: passed with zero Astro diagnostics, lint errors, or formatting errors.
- `pnpm build`: passed; 70 static pages built and 20 published articles indexed by Pagefind.
- `python backend/manage.py check`: passed with zero Django system-check errors.
- `python backend/manage.py test content`: 13 model, Admin form, and Admin smoke tests passed.
