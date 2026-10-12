import rss from "@astrojs/rss";
import { getPublishedArticles } from "@/utils/content";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";
import { getDjangoArticleSource } from "@/data/djangoArticleSource";

export async function GET() {
  const posts = await getDjangoArticleSource().getPublishedArticles();
  const publishedArticles = getPublishedArticles(posts, new Date());

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: publishedArticles.map(article => ({
      link: getPostUrl(article.id, config.site.lang),
      title: article.title,
      description: article.description,
      pubDate: article.modDatetime ?? article.pubDatetime,
    })),
  });
}
