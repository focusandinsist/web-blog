import { test, expect } from "@playwright/test";

interface PagefindResultData {
  meta: Record<string, string>;
  url: string;
}

interface PagefindSearchResult {
  results: Array<{ data: () => Promise<PagefindResultData> }>;
}

interface PagefindApi {
  init: () => Promise<void>;
  search: (term: string) => Promise<PagefindSearchResult>;
  filters: () => Promise<Record<string, Record<string, number>>>;
}

test("生产搜索索引包含已发布文章、排除草稿并提供内容过滤器", async ({
  page,
}) => {
  await page.goto("/about/");

  const index = await page.evaluate(async () => {
    const importModule = new Function("path", "return import(path)") as (
      path: string
    ) => Promise<PagefindApi>;
    const pagefind = await importModule("/pagefind/pagefind.js");
    await pagefind.init();

    const published = await pagefind.search("epoll");
    const draft = await pagefind.search("draft-backpressure-token");
    const publishedData = await Promise.all(
      published.results.map(result => result.data())
    );

    return {
      titles: publishedData.map(result => result.meta.title),
      urls: publishedData.map(result => result.url),
      channels: publishedData.map(result => result.meta.channel),
      draftCount: draft.results.length,
      filters: await pagefind.filters(),
    };
  });

  expect(index.titles).toContain("epoll 与慢消费者：先看就绪队列");
  expect(index.urls).toContain("/articles/technology/epoll-slow-consumer/");
  expect(index.channels).toContain("technology");
  expect(index.draftCount).toBe(0);
  expect(index.filters["频道"]?.technology).toBeGreaterThan(0);
  expect(index.filters["专题"]?.["systems-programming"]).toBeGreaterThan(0);
  expect(index.filters["标签"]?.Linux).toBeGreaterThan(0);
});
