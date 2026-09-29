import { afterEach, describe, expect, it, vi } from "vitest";
import { DjangoArticleSource } from "@/data/djangoArticleSource";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DjangoArticleSource", () => {
  it("maps article dates, taxonomy, and media fields into the view model", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/health/")) return new Response("{}", { status: 200 });
      if (url.endsWith("/articles/technology/event-loop-notes/")) {
        return Response.json({
          id: "technology/event-loop-notes",
          slug: "event-loop-notes",
          title: "Event loop",
          description: "Latency notes",
          bodyMarkdown: "## Measure",
          pubDatetime: "2026-09-08T00:00:00Z",
          modDatetime: "2026-09-09T01:30:00Z",
          channel: "technology",
          topics: ["concurrency-engineering"],
          primaryTopic: "concurrency-engineering",
          tags: ["performance"],
          kind: "article",
          status: "complete",
          draft: false,
          featuredRank: null,
          series: { id: "event-loop", order: 1 },
          related: [],
          heroImage: {
            url: "http://django.test/media/hero.webp",
            alt: "Hero",
            width: 960,
            height: 540,
          },
          ogImage: "http://django.test/media/og.webp",
          canonicalURL: null,
          revisions: [{ date: "2026-09-09T01:30:00Z", summary: "Clarify" }],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = new DjangoArticleSource(
      "http://django.test/api/publication/v1/"
    );
    const article = await source.getArticle("technology/event-loop-notes");

    expect(article?.pubDatetime).toEqual(new Date("2026-09-08T00:00:00Z"));
    expect(article?.modDatetime).toEqual(new Date("2026-09-09T01:30:00Z"));
    expect(article?.revisions[0]?.date).toEqual(
      new Date("2026-09-09T01:30:00Z")
    );
    expect(article?.heroImage?.url).toBe("http://django.test/media/hero.webp");
    expect(article?.ogImage).toBe("http://django.test/media/og.webp");
    expect(source.mediaOrigin).toBe("http://django.test");
  });

  it("reports an actionable error when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const source = new DjangoArticleSource(
      "http://django.test/api/publication/v1/"
    );

    await expect(source.getPublishedArticles()).rejects.toThrow(
      "Django content API is unavailable at http://django.test/api/publication/v1"
    );
  });
});
