import { test, expect } from "@playwright/test";

test.describe("全局导航", () => {
  test("桌面端展示六个直接入口和站点标识", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "文章" })).toHaveAttribute(
      "href",
      "/articles/"
    );
    await expect(nav.getByRole("link", { name: "频道" })).toHaveAttribute(
      "href",
      "/channels/"
    );
    await expect(nav.getByRole("link", { name: "专题" })).toHaveAttribute(
      "href",
      "/topics/"
    );
    await expect(nav.getByRole("link", { name: "项目" })).toHaveAttribute(
      "href",
      "/projects/"
    );
    await expect(nav.getByRole("link", { name: "关于" })).toHaveAttribute(
      "href",
      "/about/"
    );
    await expect(nav.getByRole("link", { name: /搜索/ })).toHaveAttribute(
      "href",
      "/search/"
    );
    await expect(
      page.getByRole("link", { name: "系统工程笔记" })
    ).toHaveAttribute("href", "/");
  });

  test("所有目录和频道路由可直接访问，未知频道返回 404", async ({
    request,
  }) => {
    const availableRoutes = [
      "/articles/",
      "/channels/",
      "/topics/",
      "/projects/",
      "/channels/technology/",
      "/channels/life/",
      "/channels/investment/",
    ];

    for (const route of availableRoutes) {
      expect((await request.get(route)).status(), route).toBe(200);
    }
    expect((await request.get("/channels/unknown/")).status()).toBe(404);
  });

  test("顶部导航可以绕过首页直接进入每个目录", async ({ page }) => {
    const destinations = [
      ["文章", "/articles/", "全部文章"],
      ["频道", "/channels/", "频道"],
      ["专题", "/topics/", "专题"],
      ["项目", "/projects/", "项目复盘"],
    ] as const;

    for (const [label, pathname, heading] of destinations) {
      await page.goto("/");
      await page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`${pathname.replaceAll("/", "\\/")}$`)
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("文章目录可按频道和专题筛选并显示空状态", async ({ page }) => {
    await page.goto("/articles/?channel=technology");
    await expect
      .poll(() => page.locator("[data-article-item]:visible").count())
      .toBeGreaterThanOrEqual(3);

    await page.getByLabel("频道").selectOption("life");
    await page.getByLabel("专题").selectOption("data-systems");
    await expect(page.getByText("没有符合当前条件的文章。")).toBeVisible();
  });

  test("投资频道固定展示风险提示", async ({ page }) => {
    await page.goto("/channels/investment/");
    await expect(page.getByRole("note")).toContainText("不构成任何投资建议");
  });

  test("移动端可以展开同一组入口", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const menu = page.getByRole("button", { name: /打开菜单/ });
    await menu.click();
    await expect(
      page.getByRole("button", { name: /关闭菜单/ })
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "频道" })
    ).toBeVisible();
  });
});
