import type {
  ChannelDefinition,
  ChannelId,
  TopicDefinition,
} from "@/data/taxonomy";
import type { Article, ArticleImage, ArticleRevision } from "./article";

interface ArticleDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  pubDatetime: string;
  modDatetime: string | null;
  channel: string;
  topics: string[];
  primaryTopic: string | null;
  tags: string[];
  kind: Article["kind"];
  status: Article["status"];
  draft: false;
  featuredRank: number | null;
  series: Article["series"];
  related: string[];
  heroImage: ArticleImage | null;
  ogImage: string | null;
  canonicalURL: string | null;
  revisions: Array<{ date: string; summary: string }>;
}

interface TaxonomyDto {
  channels: Array<{
    slug: string;
    name: string;
    description: string;
    accent: ChannelDefinition["accent"];
  }>;
  topics: Array<{
    slug: string;
    name: string;
    description: string;
    accent: ChannelDefinition["accent"];
    channel: string;
  }>;
}

export interface PublicationTaxonomy {
  channels: ChannelDefinition[];
  topics: TopicDefinition[];
}

const defaultApiUrl = "http://127.0.0.1:8000/api/publication/v1/";

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Django content API returned an invalid ${field}: ${value}`
    );
  }
  return date;
}

function mapRevision(revision: {
  date: string;
  summary: string;
}): ArticleRevision {
  return {
    date: parseDate(revision.date, "revision date"),
    summary: revision.summary,
  };
}

function mapArticle(dto: ArticleDto): Article {
  return {
    ...dto,
    channel: dto.channel as ChannelId,
    pubDatetime: parseDate(dto.pubDatetime, "publication date"),
    modDatetime: dto.modDatetime
      ? parseDate(dto.modDatetime, "modified date")
      : null,
    revisions: dto.revisions.map(mapRevision),
  };
}

function mapTaxonomy(dto: TaxonomyDto): PublicationTaxonomy {
  return {
    channels: dto.channels.map(channel => ({
      id: channel.slug as ChannelId,
      name: channel.name,
      description: channel.description,
      accent: channel.accent,
      href: `/channels/${channel.slug}/` as ChannelDefinition["href"],
    })),
    topics: dto.topics.map(topic => ({
      id: topic.slug,
      name: topic.name,
      description: topic.description,
      channel: topic.channel as ChannelId,
      href: `/topics/${topic.slug}/`,
    })),
  };
}

export class DjangoArticleSource {
  readonly baseUrl: string;
  readonly mediaOrigin: string;
  private healthRequest: Promise<void> | undefined;
  private articlesRequest: Promise<Article[]> | undefined;
  private taxonomyRequest: Promise<PublicationTaxonomy> | undefined;

  constructor(baseUrl = process.env.CONTENT_API_URL ?? defaultApiUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.mediaOrigin = new URL(this.baseUrl).origin;
  }

  async getPublishedArticles(): Promise<Article[]> {
    this.articlesRequest ??= this.request<ArticleDto[]>("articles/").then(
      dtos => dtos.map(mapArticle)
    );
    return this.articlesRequest;
  }

  async getArticle(id: string): Promise<Article | null> {
    const [channel, slug, extra] = id.split("/");
    if (!channel || !slug || extra) return null;
    try {
      const dto = await this.request<ArticleDto>(
        `articles/${channel}/${slug}/`
      );
      return mapArticle(dto);
    } catch (error) {
      if (error instanceof ArticleNotFoundError) return null;
      throw error;
    }
  }

  async getTaxonomy(): Promise<PublicationTaxonomy> {
    this.taxonomyRequest ??=
      this.request<TaxonomyDto>("taxonomy/").then(mapTaxonomy);
    return this.taxonomyRequest;
  }

  private async request<T>(path: string): Promise<T> {
    await this.ensureHealthy();
    const url = `${this.baseUrl}/${path}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error(
        `Could not reach Django content API at ${url}. Start Django or set CONTENT_API_URL.`,
        { cause: error }
      );
    }
    if (response.status === 404) throw new ArticleNotFoundError(url);
    if (!response.ok) {
      throw new Error(
        `Django content API returned HTTP ${response.status} for ${url}.`
      );
    }
    return (await response.json()) as T;
  }

  private async ensureHealthy(): Promise<void> {
    this.healthRequest ??= fetch(`${this.baseUrl}/health/`)
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Django content API health check returned HTTP ${response.status}.`
          );
        }
      })
      .catch(error => {
        throw new Error(
          `Django content API is unavailable at ${this.baseUrl}. Start Django or set CONTENT_API_URL.`,
          { cause: error }
        );
      });
    return this.healthRequest;
  }
}

class ArticleNotFoundError extends Error {
  constructor(url: string) {
    super(`Article does not exist in Django content API: ${url}`);
  }
}

let defaultSource: DjangoArticleSource | undefined;

export function getDjangoArticleSource(): DjangoArticleSource {
  defaultSource ??= new DjangoArticleSource();
  return defaultSource;
}

export async function getPublicationSnapshot(): Promise<{
  articles: Article[];
  taxonomy: PublicationTaxonomy;
}> {
  const source = getDjangoArticleSource();
  const [articles, taxonomy] = await Promise.all([
    source.getPublishedArticles(),
    source.getTaxonomy(),
  ]);
  return { articles, taxonomy };
}
