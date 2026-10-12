import { test, expect } from "@playwright/test";

test.describe("无 JavaScript 基础能力", () => {
  test("首页可以进入频道，频道页可以进入文章", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: "文章" })
      .click();
    await expect(page).toHaveURL(/\/articles\/$/);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "技术记录" })).toHaveAttribute(
      "href",
      "/channels/technology/"
    );
    await page.getByRole("link", { name: "技术记录" }).click();
    await expect(page).toHaveURL(/\/channels\/technology\/$/);

    const articleLink = page.locator("[data-article-item] a").first();
    await expect(articleLink).toHaveAttribute("href", /^\/articles\//);
    await articleLink.click();
    await expect(page).toHaveURL(/\/articles\/technology\//);
  });

  test("文章正文、目录锚点和基础导航可访问", async ({ page }) => {
    await page.goto("/articles/technology/event-loop-notes/");

    await expect(
      page.getByRole("navigation", { name: "主导航" })
    ).toBeVisible();
    await expect(page.locator("#article")).toBeVisible();
    const outline = page.getByRole("navigation", { name: "本文目录" });
    await expect(outline.getByRole("link")).toHaveCount(5);
    const firstOutlineLink = outline.getByRole("link").first();
    await expect(firstOutlineLink).toHaveAttribute("href", /^#/);
    await firstOutlineLink.click();
    await expect(page).toHaveURL(/#.+$/);
    await expect(page.locator("#结论")).toBeVisible();
  });
});
