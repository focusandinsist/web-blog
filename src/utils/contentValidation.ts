import { TOPICS } from "@/data/taxonomy";
import type { ArticleEntry } from "./content";

export interface ContentValidationEntry {
  id: string;
  filePath: string;
  data: Pick<
    ArticleEntry["data"],
    "channel" | "topics" | "related" | "series" | "draft"
  >;
}

export interface ContentValidationIssue {
  articleId: string;
  field: "channel" | "topics" | "related" | "series";
  message: string;
}

export function validateContentIntegrity(
  entries: readonly ContentValidationEntry[]
): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const topicChannels = new Map(
    TOPICS.map(topic => [topic.id, topic.channel] as const)
  );
  const entriesById = new Map(entries.map(entry => [entry.id, entry]));
  const seriesOrders = new Map<string, Map<number, string>>();

  for (const entry of entries) {
    const topLevelDirectory = entry.filePath
      .replaceAll("\\", "/")
      .split("/")[0];
    if (topLevelDirectory !== entry.data.channel) {
      issues.push({
        articleId: entry.id,
        field: "channel",
        message: `Top-level directory "${topLevelDirectory}" does not match channel "${entry.data.channel}".`,
      });
    }

    for (const topic of entry.data.topics) {
      const topicChannel = topicChannels.get(topic);
      if (!topicChannel) {
        issues.push({
          articleId: entry.id,
          field: "topics",
          message: `Unknown topic "${topic}".`,
        });
      } else if (topicChannel !== entry.data.channel) {
        issues.push({
          articleId: entry.id,
          field: "topics",
          message: `Topic "${topic}" belongs to channel "${topicChannel}", not "${entry.data.channel}".`,
        });
      }
    }

    for (const relatedId of entry.data.related) {
      if (relatedId === entry.id) {
        issues.push({
          articleId: entry.id,
          field: "related",
          message: "Article cannot relate to itself.",
        });
        continue;
      }

      const relatedEntry = entriesById.get(relatedId);
      if (!relatedEntry) {
        issues.push({
          articleId: entry.id,
          field: "related",
          message: `Related article "${relatedId}" does not exist.`,
        });
      } else if (relatedEntry.data.draft) {
        issues.push({
          articleId: entry.id,
          field: "related",
          message: `Related article "${relatedId}" is a draft.`,
        });
      }
    }

    const series = entry.data.series;
    if (series) {
      const orders = seriesOrders.get(series.id) ?? new Map<number, string>();
      if (orders.has(series.order)) {
        issues.push({
          articleId: entry.id,
          field: "series",
          message: `Series "${series.id}" contains duplicate order ${series.order}.`,
        });
      } else {
        orders.set(series.order, entry.id);
        seriesOrders.set(series.id, orders);
      }
    }
  }

  for (const [seriesId, orders] of seriesOrders) {
    const sortedOrders = [...orders.keys()].toSorted(
      (left, right) => left - right
    );
    const gapIndex = sortedOrders.findIndex(
      (order, index) => order !== index + 1
    );
    if (gapIndex !== -1) {
      const offendingOrder = sortedOrders[gapIndex];
      issues.push({
        articleId: orders.get(offendingOrder)!,
        field: "series",
        message: `Series "${seriesId}" orders must be consecutive from 1; received ${sortedOrders.join(", ")}.`,
      });
    }
  }

  return issues;
}
