import {
  CHANNELS,
  TOPICS,
  type ChannelDefinition,
  type ChannelId,
  type TopicDefinition,
} from "@/data/taxonomy";
import type { Article, PublishedArticle } from "@/data/article";
import type { PublicationTaxonomy } from "@/data/djangoArticleSource";

export type ArticleEntry = Article;
export type PublishedArticleEntry = PublishedArticle;

export type HomeChannel = ChannelDefinition & {
  articles: PublishedArticleEntry[];
};

export type TopicDirectoryItem = TopicDefinition & {
  articles: PublishedArticleEntry[];
  series: TopicSeries[];
};

export interface TopicSeries {
  id: string;
  articles: PublishedArticleEntry[];
}

export type ChannelDirectoryItem = ChannelDefinition & {
  articles: PublishedArticleEntry[];
  topics: TopicDirectoryItem[];
};

export interface TopicContextArticle {
  article: PublishedArticleEntry;
  isCurrent: boolean;
}

export interface TopicContext {
  topic: string;
  articles: TopicContextArticle[];
}

export interface SeriesContext {
  id: string;
  articles: PublishedArticleEntry[];
  currentIndex: number;
  previous: PublishedArticleEntry | null;
  next: PublishedArticleEntry | null;
}

function articleTimestamp(entry: Article): number {
  return (entry.modDatetime ?? entry.pubDatetime).getTime();
}

function compareHomeArticles(
  left: PublishedArticleEntry,
  right: PublishedArticleEntry
): number {
  const leftRank = left.featuredRank ?? undefined;
  const rightRank = right.featuredRank ?? undefined;

  if (leftRank !== undefined || rightRank !== undefined) {
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    if (leftRank !== rightRank) return leftRank - rightRank;
  }

  return articleTimestamp(right) - articleTimestamp(left);
}

function getArticleOrThrow(
  entries: readonly PublishedArticleEntry[],
  slug: string
): PublishedArticleEntry {
  const article = entries.find(entry => entry.id === slug);
  if (!article) throw new Error(`Article "${slug}" was not found.`);
  return article;
}

export function getPublishedArticles(
  entries: readonly ArticleEntry[],
  now: Date
): PublishedArticleEntry[] {
  const nowTimestamp = now.getTime();

  return entries
    .filter(
      entry => !entry.draft && entry.pubDatetime.getTime() <= nowTimestamp
    )
    .toSorted(
      (left, right) => articleTimestamp(right) - articleTimestamp(left)
    ) as PublishedArticleEntry[];
}

export function getChannelArticles(
  entries: readonly PublishedArticleEntry[],
  channel: ChannelId
): PublishedArticleEntry[] {
  return entries.filter(entry => entry.channel === channel);
}

export function getTopicArticles(
  entries: readonly PublishedArticleEntry[],
  topic: string
): PublishedArticleEntry[] {
  return entries.filter(entry => entry.topics.includes(topic));
}

export function getHomeChannels(
  entries: readonly PublishedArticleEntry[],
  limit = 5,
  channels: readonly ChannelDefinition[] = CHANNELS
): HomeChannel[] {
  return channels.map(channel => ({
    ...channel,
    articles: getChannelArticles(entries, channel.id)
      .toSorted(compareHomeArticles)
      .slice(0, limit),
  }));
}

function topicNameFromId(topic: string): string {
  return topic
    .split("-")
    .filter(Boolean)
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getTopicDirectory(
  entries: readonly PublishedArticleEntry[],
  topicDefinitions: readonly TopicDefinition[] = TOPICS
): TopicDirectoryItem[] {
  const definitions = [...topicDefinitions];
  const knownIds = new Set(definitions.map(topic => topic.id));

  for (const article of entries) {
    for (const topic of article.topics) {
      if (!knownIds.has(topic)) {
        definitions.push({
          id: topic,
          name: topicNameFromId(topic),
          description: `收录与 ${topicNameFromId(topic)} 相关的文章。`,
          channel: article.channel,
          href: `/topics/${topic}/`,
        });
        knownIds.add(topic);
      }
    }
  }

  return definitions.map(topic => {
    const articles = getTopicArticles(entries, topic.id);
    const seriesIds = [
      ...new Set(
        articles
          .map(article => article.series?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    return {
      ...topic,
      articles,
      series: seriesIds.map(id => ({
        id,
        articles: articles
          .filter(article => article.series?.id === id)
          .toSorted(
            (left, right) =>
              (left.series?.order ?? 0) - (right.series?.order ?? 0)
          ),
      })),
    };
  });
}

export function getChannelDirectory(
  entries: readonly PublishedArticleEntry[],
  taxonomy: PublicationTaxonomy = {
    channels: [...CHANNELS],
    topics: [...TOPICS],
  }
): ChannelDirectoryItem[] {
  const topics = getTopicDirectory(entries, taxonomy.topics);

  return taxonomy.channels.map(channel => ({
    ...channel,
    articles: getChannelArticles(entries, channel.id),
    topics: topics.filter(topic => topic.channel === channel.id),
  }));
}

export function getProjectArticles(
  entries: readonly PublishedArticleEntry[]
): PublishedArticleEntry[] {
  return entries.filter(entry => entry.kind === "case-study");
}

export function getTopicContext(
  entries: readonly PublishedArticleEntry[],
  currentSlug: string
): TopicContext {
  const currentArticle = getArticleOrThrow(entries, currentSlug);
  const topic = currentArticle.primaryTopic;
  if (!topic) {
    throw new Error(`Article "${currentSlug}" has no topic.`);
  }

  const topicArticles = getTopicArticles(entries, topic);
  const currentIndex = topicArticles.findIndex(
    entry => entry.id === currentSlug
  );
  const start = Math.max(0, currentIndex - 2);
  const end = currentIndex + 3;

  return {
    topic,
    articles: topicArticles.slice(start, end).map(article => ({
      article,
      isCurrent: article.id === currentSlug,
    })),
  };
}

export function getFurtherReading(
  entries: readonly PublishedArticleEntry[],
  currentSlug: string
): PublishedArticleEntry[] {
  const currentArticle = getArticleOrThrow(entries, currentSlug);
  const entriesBySlug = new Map(entries.map(entry => [entry.id, entry]));
  const selected: PublishedArticleEntry[] = [];
  const selectedSlugs = new Set([currentSlug]);

  for (const relatedSlug of currentArticle.related) {
    const relatedArticle = entriesBySlug.get(relatedSlug);
    if (relatedArticle && !selectedSlugs.has(relatedSlug)) {
      selected.push(relatedArticle);
      selectedSlugs.add(relatedSlug);
    }
  }

  const primaryTopic = currentArticle.primaryTopic;
  if (primaryTopic && selected.length < 3) {
    for (const candidate of getTopicArticles(entries, primaryTopic)) {
      if (!selectedSlugs.has(candidate.id)) {
        selected.push(candidate);
        selectedSlugs.add(candidate.id);
      }

      if (selected.length === 3) break;
    }
  }

  return selected.slice(0, 3);
}

export function getSeriesContext(
  entries: readonly PublishedArticleEntry[],
  currentSlug: string
): SeriesContext | null {
  const currentArticle = getArticleOrThrow(entries, currentSlug);
  const currentSeries = currentArticle.series;
  if (!currentSeries) return null;

  const articles = entries
    .filter(entry => entry.series?.id === currentSeries.id)
    .toSorted(
      (left, right) => (left.series?.order ?? 0) - (right.series?.order ?? 0)
    );
  const currentIndex = articles.findIndex(entry => entry.id === currentSlug);

  return {
    id: currentSeries.id,
    articles,
    currentIndex,
    previous: articles[currentIndex - 1] ?? null,
    next: articles[currentIndex + 1] ?? null,
  };
}
