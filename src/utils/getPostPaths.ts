import { getRelativeLocaleUrl } from "astro:i18n";
import { slugifyStr } from "./slugify";
import config from "@/config";

function getPostSlugPath(id: string): string {
  const segments = id.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new Error(`Article id must use channel/slug: ${id}`);
  }
  return segments.map(slugifyStr).join("/");
}

/**
 * Returns the slug-only path for use as a route param in `getStaticPaths`.
 * No base prefix, no locale — Astro handles those at a higher level.
 * e.g. `/examples/my-post`
 */
export function getPostSlug(id: string): string {
  return `/${getPostSlugPath(id)}`;
}

/**
 * Returns a fully navigable URL for use in `<a href>` and RSS links.
 * Applies both locale routing and the configured Astro base via
 * `getRelativeLocaleUrl`.
 * e.g. `/articles/my-post` or `/en/articles/my-post`
 */
export function getPostUrl(
  id: string,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `articles/${getPostSlugPath(id)}`);
}
