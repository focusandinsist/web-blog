# Set the Hosting and Service Boundaries

Type: grilling
Status: resolved
Blocked by: 01

## Question

Which hosting, search, analytics, comments, syndication, and deployment services belong in the initial release given the desired ownership, privacy, maintenance cost, and expected audience?

## Answer

The initial release is a fully static, globally deployed publication with near-zero operational maintenance. It targets global access while making a best effort for readers in Mainland China; it does not claim guaranteed Mainland China performance.

Cloudflare Pages is the deployment target. It builds the Astro site from the owner's repository, publishes preview deployments for non-production changes, and serves production from an independent domain. The platform-provided `pages.dev` domain is a preview and fallback address, not the canonical public URL. The owner retains control of Git operations and repository integration.

Pagefind provides search as a post-build static index. It indexes public Article content and exposes Channel, Topic, and Tag filters. Navigation chrome, the decorative Cover, draft content, and duplicate summary text are excluded from indexing. Search remains usable without a server or external search account.

Cloudflare Web Analytics supplies aggregate page views, popular pages, referrers, visitor geography, and real-user performance. The initial release does not use Google Analytics, advertising pixels, session replay, user profiles, custom conversion funnels, or first-party analytics cookies.

Giscus supplies optional Article comments through GitHub Discussions. It is loaded lazily after the Article body, follows the active light/dark theme, and is omitted from previews unless a safe discussion mapping is configured. GitHub authorization is required to comment. Failure or blocking of Giscus never prevents Article reading, navigation, or printing.

Syndication consists of one canonical RSS 2.0 feed for all published Articles and one feed for each Channel. Feeds use the same validated Content Collections as the site and advertise themselves from document metadata. A duplicate Atom feed, email newsletter, account system, and social-platform-only publishing strategy are outside the initial release.

The production site self-hosts fonts, icons, cover images, and Article media wherever licensing permits. This avoids making core rendering depend on Google Fonts, GitHub attachment URLs, or other third-party asset origins. Sitemap, canonical URLs, robots rules, Open Graph metadata, and structured data are generated during the static build.

Guaranteed delivery inside Mainland China is outside the initial release. Cloudflare's in-China network is a separate Enterprise offering and requires a valid ICP filing or license. The site instead uses small static pages, optimized images, self-hosted assets, and progressive enhancement. Comments and analytics may disappear under network filtering without degrading the publication.

The site includes a concise privacy page that explains Cloudflare Web Analytics and the GitHub/Giscus boundary. No visitor account or personal profile exists.

Supporting evidence is recorded in [Hosting and Service Boundary Research](../research/service-boundaries.md).
