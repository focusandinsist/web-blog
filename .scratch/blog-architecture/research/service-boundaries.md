# Hosting and Service Boundary Research

Checked: 2026-09-10

## Recommendation

Use a portable static deployment with Cloudflare Pages, Pagefind, Cloudflare Web Analytics, Giscus, and Astro-generated RSS. The production site uses an independent domain. Every service enhancement is progressively enhanced: Articles, navigation, and feeds remain usable if analytics, comments, or third-party scripts fail.

## Findings

### Cloudflare Pages

Cloudflare Pages supports Git-based builds, preview deployments, static assets, and custom domains. Its Free plan currently documents 500 builds per month, one concurrent build, a 20-minute build timeout, 20,000 files, and up to 100 custom domains per project. These limits are comfortably above a personal static publication's expected needs.

An apex custom domain must be a zone in the same Cloudflare account and use Cloudflare nameservers. A subdomain can instead point to the Pages project through CNAME after it has been associated with the project in the Pages dashboard.

Sources:

- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/custom-domains/

### Mainland China Boundary

Cloudflare states that reliable low-latency delivery inside Mainland China requires infrastructure inside China. Its China Network is a separate Enterprise subscription operated with JD Cloud, and onboarding an apex domain requires a valid ICP filing or license. A normal Pages deployment on the global network therefore cannot promise Mainland China performance or availability.

The initial publication should make a best effort by self-hosting fonts and primary media, avoiding critical dependencies on blocked or unreliable third-party origins, and ensuring third-party comments fail without affecting reading. Guaranteed in-China delivery and ICP work are outside the initial architecture.

Source:

- https://developers.cloudflare.com/china-network/

### Pagefind

Pagefind runs after the static-site generator and writes a static search bundle into the generated site. It requires neither a search server nor a hand-built index. It can index static HTML and provide a prebuilt or custom search interface, matching the zero-operations boundary.

Source:

- https://pagefind.app/docs/

### Cloudflare Web Analytics

Cloudflare describes Web Analytics as free and privacy-first and states that it does not collect or use visitors' personal data. It uses a JavaScript beacon and browser Performance APIs to provide page-view and real-user performance metrics. It fits the selected aggregate-only analytics requirement; Google Analytics and behavioral event tracking are unnecessary initially.

Source:

- https://developers.cloudflare.com/web-analytics/about/

### Giscus

Giscus stores comments in GitHub Discussions and requires no separate comment database. Visitors must authorize the Giscus GitHub App to comment on their behalf, or comment directly in the associated Discussion. It supports themes and multiple languages, and moderation happens in GitHub.

Giscus remains an external runtime dependency and its own README warns that the actively developed GitHub Discussions API may change. Load it lazily after the Article, disclose the GitHub authorization boundary, and never make Article rendering depend on it.

Source:

- https://github.com/giscus/giscus
- https://raw.githubusercontent.com/giscus/giscus/main/README.md

### RSS

Astro's official `@astrojs/rss` package generates RSS feeds from Content Collections in static builds and supports RSS auto-discovery. A canonical all-content feed plus one feed per Channel can come from the same validated content source without another service. RSS 2.0 is sufficient initially; maintaining a duplicate Atom representation adds no product value.

Source:

- https://docs.astro.build/en/guides/rss/

## Rejected Initial Alternatives

- A self-hosted server, database, or comment backend: unnecessary operational ownership for a static personal publication.
- Google Analytics: more tracking and complexity than the selected aggregate metrics require.
- Hosted search SaaS: unnecessary while Pagefind can index the complete static corpus.
- Email newsletters: list management, consent, and unsubscribe obligations are deferred until publishing cadence proves demand.
- Mainland China acceleration or hosting: requires commercial and regulatory commitments beyond the initial release.

