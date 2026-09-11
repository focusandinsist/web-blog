# Senior Backend Engineer Blog Architecture

Label: wayfinder:map

## Destination

Produce an approved, implementation-ready architecture and experience specification for a Chinese-first personal technical publication that expresses ten years of backend engineering experience through articles, topic collections, and project case studies. The specification must settle the content model, Astro foundation, visual system, reading experience, dark theme, and delivery boundaries before implementation begins.

## Notes

- Planning only. Do not scaffold or implement the site while this map is active.
- Do not perform Git operations; the owner will manage Git.
- The publication serves technical reputation, long-term knowledge capture, and professional presentation, in that priority order.
- Writing is Chinese-first, with English URL slugs and optional English summaries.
- Authoring uses repository-managed Markdown/MDX.
- The home page mixes articles, topics, and project case studies in an editorial card layout inspired by the referenced art portfolio.
- Preserve the reference site's visual rhythm, not its code or art-gallery information model.
- Consult Wayfinder, Grilling, Domain Modeling, and Brainstorming while resolving decisions.

## Decisions so far

- [Choose the Astro foundation and reuse boundary](issues/01-choose-astro-foundation.md): Use AstroPaper as the licensed blog foundation and reimplement the reference site's masonry-inspired home page; do not directly base the publication on the art portfolio.
- [Define the information architecture](issues/02-define-information-architecture.md): Organize content into three channels, place five engineering topics under Technology Notes, keep languages as tags, and separate ordered series from durable topics and anonymized project cases.
- [Choose the home visual direction](issues/03-choose-home-visual-direction.md): Use a single-route cover and content lobby, organize its editorial cards into Technology, Life, and Investment channels, keep card motion user-controlled, and provide direct navigation for repeat readers.
- [Define the technical reading experience](issues/04-define-reading-experience.md): Use one calm article shell with a desktop outline/topic context rail, a mobile reading drawer, rich static technical content, explicit revision and citation rules, and print support without initial offline complexity.
- [Set the hosting and service boundaries](issues/05-set-service-boundaries.md): Deploy a static site to Cloudflare Pages with Pagefind, privacy-first aggregate analytics, optional Giscus comments, per-channel RSS, self-hosted assets, and graceful degradation without promising Mainland China delivery.

## Not yet specified

- Migration from any existing private notes remains unknown until their source formats and intended publication status are known.

## Out of scope

- Building the production site while architecture decisions remain open.
- A custom authoring CMS or database-backed administration panel for the initial release.
- Full Chinese-English duplication of every article.
- Copying the reference site's artwork or treating its Notion image database as the blog content model.
- Guaranteed Mainland China delivery, ICP filing, and an Enterprise China CDN subscription.
- A self-hosted application server, comment database, visitor accounts, email newsletter, or behavioral tracking in the initial release.
