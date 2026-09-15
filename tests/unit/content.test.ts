import { describe, expect, it } from "vitest";
import { getUniqueTags } from "@/utils/getUniqueTags";
import {
  getChannelArticles,
  getChannelDirectory,
  getHomeChannels,
  getPublishedArticles,
  getFurtherReading,
  getProjectArticles,
  getSeriesContext,
  getTopicContext,
  getTopicDirectory,
  getTopicArticles,
  type ArticleEntry,
} from "@/utils/content";

const NOW = new Date("2026-09-10T12:00:00.000Z");

function article(
  id: string,
  overrides: Partial<ArticleEntry["data"]> = {}
): ArticleEntry {
  return {
    id,
    collection: "posts",
    data: {
      author: "Author",
      title: id,
      description: `Description for ${id} with enough detail.`,
      pubDatetime: new Date("2026-09-01T00:00:00.000Z"),
      channel: "technology",
      topics: ["systems"],
      tags: [],
      kind: "article",
      status: "complete",
      draft: false,
      related: [],
      revisions: [],
      ...overrides,
    },
  } as ArticleEntry;
}

function published(entries: ArticleEntry[]) {
  return getPublishedArticles(entries, NOW);
}

describe("getPublishedArticles", () => {
  it("applies publication eligibility and update ordering as one rule", () => {
    const entries = [
      article("published", {
        pubDatetime: new Date("2026-09-09T00:00:00.000Z"),
      }),
      article("draft", { draft: true }),
      article("future", {
        pubDatetime: new Date("2026-09-10T12:00:01.000Z"),
      }),
      article("recently-updated", {
        pubDatetime: new Date("2026-08-01T00:00:00.000Z"),
        modDatetime: new Date("2026-09-10T11:00:00.000Z"),
      }),
      article("available-now", { pubDatetime: new Date(NOW) }),
    ];

    expect(getPublishedArticles(entries, NOW).map(entry => entry.id)).toEqual([
      "available-now",
      "recently-updated",
      "published",
    ]);
  });

  it("excludes drafts", () => {
    const entries = [article("published"), article("draft", { draft: true })];

    expect(getPublishedArticles(entries, NOW).map(entry => entry.id)).toEqual([
      "published",
    ]);
  });

  it("excludes articles scheduled after the supplied time", () => {
    const entries = [
      article("available", { pubDatetime: new Date(NOW) }),
      article("future", {
        pubDatetime: new Date("2026-09-10T12:00:01.000Z"),
      }),
    ];

    expect(getPublishedArticles(entries, NOW).map(entry => entry.id)).toEqual([
      "available",
    ]);
  });

  it("sorts by modification time and falls back to publication time", () => {
    const entries = [
      article("older", {
        pubDatetime: new Date("2026-08-01T00:00:00.000Z"),
      }),
      article("recently-updated", {
        pubDatetime: new Date("2026-07-01T00:00:00.000Z"),
        modDatetime: new Date("2026-09-09T00:00:00.000Z"),
      }),
      article("newer", {
        pubDatetime: new Date("2026-09-05T00:00:00.000Z"),
      }),
    ];

    expect(getPublishedArticles(entries, NOW).map(entry => entry.id)).toEqual([
      "recently-updated",
      "newer",
      "older",
    ]);
  });
});

describe("content groupings", () => {
  const entries = published([
    article("tech-new", {
      channel: "technology",
      topics: ["systems", "concurrency"],
    }),
    article("life", { channel: "life", topics: ["learning"] }),
    article("tech-old", {
      channel: "technology",
      topics: ["systems"],
    }),
    article("investment", {
      channel: "investment",
      topics: ["decision-making"],
    }),
  ]);

  it("filters articles by channel without changing their order", () => {
    expect(
      getChannelArticles(entries, "technology").map(entry => entry.id)
    ).toEqual(["tech-new", "tech-old"]);
  });

  it("filters articles containing the requested topic", () => {
    expect(getTopicArticles(entries, "systems").map(entry => entry.id)).toEqual(
      ["tech-new", "tech-old"]
    );
  });

  it("builds home channels in editorial order and applies the limit", () => {
    const manyEntries = published([
      ...Array.from({ length: 6 }, (_, index) =>
        article(`technology-${index + 1}`, { channel: "technology" })
      ),
      article("life-1", { channel: "life" }),
      article("investment-1", { channel: "investment" }),
    ]);

    const defaultHome = getHomeChannels(manyEntries);
    const compactHome = getHomeChannels(manyEntries, 2);

    expect(defaultHome.map(channel => channel.id)).toEqual([
      "technology",
      "life",
      "investment",
    ]);
    expect(defaultHome.map(channel => channel.articles.length)).toEqual([
      5, 1, 1,
    ]);
    expect(compactHome[0]?.articles.map(entry => entry.id)).toEqual([
      "technology-1",
      "technology-2",
    ]);
  });

  it("ranks featured articles before unranked articles within each channel", () => {
    const entries = published([
      article("unranked-new", {
        channel: "technology",
        pubDatetime: new Date("2026-09-09T00:00:00.000Z"),
      }),
      article("ranked-late", {
        channel: "technology",
        featuredRank: 2,
        pubDatetime: new Date("2026-09-01T00:00:00.000Z"),
      }),
      article("ranked-first", {
        channel: "technology",
        featuredRank: 1,
        pubDatetime: new Date("2026-08-01T00:00:00.000Z"),
      }),
      article("unranked-old", {
        channel: "technology",
        pubDatetime: new Date("2026-08-01T00:00:00.000Z"),
        modDatetime: new Date("2026-09-10T00:00:00.000Z"),
      }),
    ]);

    expect(
      getHomeChannels(entries, 4)
        .find(channel => channel.id === "technology")
        ?.articles.map(entry => entry.id)
    ).toEqual(["ranked-first", "ranked-late", "unranked-old", "unranked-new"]);
  });

  it("builds channel and topic directory models without page-level filtering", () => {
    const channelDirectory = getChannelDirectory(entries);
    const topicDirectory = getTopicDirectory(entries);

    expect(
      channelDirectory
        .find(channel => channel.id === "technology")
        ?.topics.slice(0, 5)
        .map(topic => topic.id)
    ).toEqual([
      "systems-programming",
      "concurrency-engineering",
      "realtime-systems",
      "data-systems",
      "game-technology",
    ]);
    expect(
      topicDirectory.find(topic => topic.id === "systems")?.articles.length
    ).toBe(2);
    expect(
      topicDirectory.find(topic => topic.id === "game-technology")?.articles
    ).toEqual([]);
  });

  it("returns only project case studies", () => {
    const project = article("project", { kind: "case-study" });
    const regular = article("regular", { kind: "article" });

    expect(getProjectArticles(published([project, regular]))).toEqual([
      project,
    ]);
  });
});

describe("getTopicContext", () => {
  const entries = published(
    Array.from({ length: 6 }, (_, index) =>
      article(`technology/article-${index + 1}`, { topics: ["systems"] })
    )
  );

  it("returns the current article with up to two neighbors on each side", () => {
    const context = getTopicContext(entries, "technology/article-3");

    expect(context.topic).toBe("systems");
    expect(
      context.articles.map(item => [item.article.id, item.isCurrent])
    ).toEqual([
      ["technology/article-1", false],
      ["technology/article-2", false],
      ["technology/article-3", true],
      ["technology/article-4", false],
      ["technology/article-5", false],
    ]);
  });

  it("keeps the first article at the start of a partial window", () => {
    const context = getTopicContext(entries, "technology/article-1");

    expect(context.articles.map(item => item.article.id)).toEqual([
      "technology/article-1",
      "technology/article-2",
      "technology/article-3",
    ]);
  });

  it("keeps the last article at the end of a partial window", () => {
    const context = getTopicContext(entries, "technology/article-6");

    expect(context.articles.map(item => item.article.id)).toEqual([
      "technology/article-4",
      "technology/article-5",
      "technology/article-6",
    ]);
  });

  it("rejects an unknown current slug", () => {
    expect(() => getTopicContext(entries, "missing")).toThrow(
      'Article "missing" was not found.'
    );
  });
});

describe("getFurtherReading", () => {
  it("prioritizes manual related slugs and fills gaps from the primary topic", () => {
    const entries = published([
      article("current", {
        topics: ["systems"],
        related: ["manual-2", "missing", "manual-1"],
      }),
      article("fallback-1", { topics: ["systems"] }),
      article("manual-1", { topics: ["different-topic"] }),
      article("fallback-2", { topics: ["systems"] }),
      article("manual-2", { topics: ["another-topic"] }),
      article("fallback-3", { topics: ["systems"] }),
    ]);

    expect(
      getFurtherReading(entries, "current").map(entry => entry.id)
    ).toEqual(["manual-2", "manual-1", "fallback-1"]);
  });

  it("falls back to at most three articles from the primary topic", () => {
    const entries = published([
      article("fallback-1", { topics: ["systems"] }),
      article("current", { topics: ["systems"], related: [] }),
      article("fallback-2", { topics: ["systems"] }),
      article("fallback-3", { topics: ["systems"] }),
      article("fallback-4", { topics: ["systems"] }),
    ]);

    expect(
      getFurtherReading(entries, "current").map(entry => entry.id)
    ).toEqual(["fallback-1", "fallback-2", "fallback-3"]);
  });
});

describe("getSeriesContext", () => {
  it("orders the series and exposes adjacent articles", () => {
    const entries = published([
      article("part-3", { series: { id: "event-loop", order: 3 } }),
      article("other-series", { series: { id: "storage", order: 1 } }),
      article("part-1", { series: { id: "event-loop", order: 1 } }),
      article("part-2", { series: { id: "event-loop", order: 2 } }),
    ]);

    const context = getSeriesContext(entries, "part-2");

    expect(context?.id).toBe("event-loop");
    expect(context?.articles.map(entry => entry.id)).toEqual([
      "part-1",
      "part-2",
      "part-3",
    ]);
    expect(context?.currentIndex).toBe(1);
    expect(context?.previous?.id).toBe("part-1");
    expect(context?.next?.id).toBe("part-3");
  });

  it("returns null when the current article is not in a series", () => {
    expect(
      getSeriesContext(published([article("standalone")]), "standalone")
    ).toBeNull();
  });
});

describe("published-entry contract", () => {
  it("rejects raw collection entries in downstream queries", () => {
    const rawEntries = [article("raw")];

    // @ts-expect-error Raw entries must pass through getPublishedArticles first.
    getChannelArticles(rawEntries, "technology");
    // @ts-expect-error Tags must use the same published collection.
    getUniqueTags(rawEntries);
  });
});
