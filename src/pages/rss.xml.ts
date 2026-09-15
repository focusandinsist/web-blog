import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPublishedArticles } from "@/utils/content";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export async function GET() {
  const posts = await getCollection("posts");
  const publishedArticles = getPublishedArticles(posts, new Date());

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: publishedArticles.map(({ data, id, filePath }) => ({
      link: getPostUrl(id, filePath, config.site.lang),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
