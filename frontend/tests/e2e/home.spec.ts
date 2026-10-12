import { test, expect } from "@playwright/test";

test.describe("首页", () => {
  test("在同一页面连接封面和三个频道入口", async ({ page }) => {
    await page.goto("/");

    const cover = page.locator("#cover");
    const lobby = page.locator("#content-lobby");
    await expect(cover).toBeVisible();
    await expect(lobby).toBeVisible();
    await expect(cover.getByRole("heading", { level: 1 })).toHaveText(
      "系统工程笔记"
    );

    const continueLink = cover.getByRole("link", { name: "浏览最新内容" });
    await expect(continueLink).toHaveAttribute("href", "#content-lobby");

    const channelCards = lobby.locator("[data-channel-card]");
    await expect(channelCards).toHaveCount(3);
    await expect(
      channelCards.getByRole("link", { name: "技术记录" })
    ).toHaveAttribute("href", "/channels/technology/");
    await expect(
      channelCards.getByRole("link", { name: "生活记录" })
    ).toHaveAttribute("href", "/channels/life/");
    await expect(
      channelCards.getByRole("link", { name: "投资记录" })
    ).toHaveAttribute("href", "/channels/investment/");

    for (const card of await channelCards.all()) {
      const articleLinks = card.locator("[data-article-link]");
      await expect(articleLinks).toHaveCount(3);
      await expect(articleLinks.first()).toHaveAttribute(
        "href",
        /^\/articles\//
      );
    }
  });

  test("移动端首页没有页面级横向溢出并露出内容大厅", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const cover = page.locator("#cover");
    const lobby = page.locator("#content-lobby");
    await expect(cover).toBeVisible();
    await expect(lobby).toBeVisible();
    await expect(lobby).toBeInViewport({ ratio: 0.01 });

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
