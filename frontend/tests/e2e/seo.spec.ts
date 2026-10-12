import { expect, test } from "@playwright/test";

test("文章只有一个公开 URL", async ({ page, request }) => {
  const articlePath = "/articles/technology/event-loop-notes/";

  const articleResponse = await page.goto(articlePath);
  expect(articleResponse?.status()).toBe(200);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new URL(articlePath, "http://localhost:4321").href
  );

  expect(
    (await request.get("/posts/technology/event-loop-notes/")).status()
  ).toBe(404);
});
