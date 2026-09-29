import type { ChannelId } from "@/data/taxonomy";

export interface ArticleRevision {
  date: Date;
  summary: string;
}

export interface ArticleImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  pubDatetime: Date;
  modDatetime: Date | null;
  channel: ChannelId;
  topics: string[];
  primaryTopic: string | null;
  tags: string[];
  kind: "article" | "case-study";
  status: "complete" | "evolving" | "archived";
  draft: boolean;
  featuredRank: number | null;
  series: { id: string; order: number } | null;
  related: string[];
  heroImage: ArticleImage | null;
  ogImage: string | null;
  canonicalURL: string | null;
  revisions: ArticleRevision[];
}

export type PublishedArticle = Article & {
  readonly __published: unique symbol;
};
