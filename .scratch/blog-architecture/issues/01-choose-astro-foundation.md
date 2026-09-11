# Choose the Astro Foundation and Reuse Boundary

Type: research
Status: resolved
Blocked by:

## Question

Which maintained and clearly licensed Astro project should provide the blog foundation, and which parts of the referenced art portfolio can be reused safely and effectively?

## Answer

Use [AstroPaper](https://github.com/satnaing/astro-paper) as the publication foundation and build a new home page inspired by the visual rhythm of [astro-art-portfolio](https://github.com/EmaSuriano/astro-art-portfolio).

The referenced site is an active Astro 7 and Tailwind CSS 4 art-gallery template. It already implements system-aware light/dark themes, persistence, responsive CSS-column masonry, image optimization, view transitions, and PhotoSwipe. However, its content source is a minimal Notion image database, and it has no article collections, article routes, code-focused reading experience, taxonomy, archive, search, RSS, or technical SEO model. Extending it into a serious publication would mean constructing most of the blog platform from scratch.

AstroPaper supplies the relevant publication capabilities: Markdown/MDX content, article pages, tags, search, RSS, sitemap, code rendering, SEO metadata, and an established theme system. Replacing its home composition is a smaller and clearer change than turning the art portfolio into a blog.

There is also a licensing boundary. The art portfolio README says MIT, but its repository does not contain a license file and GitHub reports no detected license. A public template repository is not sufficient evidence for unrestricted copying. Treat its layout as visual reference and reimplement the composition. AstroPaper includes an MIT license and is the safer base.

Research checked on 2026-09-10:

- Reference site: https://astro-art-portfolio.netlify.app/
- Reference source: https://github.com/EmaSuriano/astro-art-portfolio
- Reference theme implementation: https://github.com/EmaSuriano/astro-art-portfolio/blob/main/src/components/ThemeToggle.astro
- Reference package manifest: https://github.com/EmaSuriano/astro-art-portfolio/blob/main/package.json
- Chosen foundation: https://github.com/satnaing/astro-paper
- Alternative considered: https://github.com/chrismwilliams/astro-theme-cactus
- Alternative considered: https://github.com/markhorn-dev/astro-sphere

