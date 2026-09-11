import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ARTICLE_URL = "/articles/technology/event-loop-notes/";

test.describe("桌面文章阅读", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ARTICLE_URL);
  });

  test("展示文章路径、元数据、正文目录和专题上下文", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "事件循环中的延迟从哪里来"
    );

    const trail = page.getByRole("navigation", { name: "文章路径" });
    await expect(trail.getByRole("link", { name: "技术记录" })).toHaveAttribute(
      "href",
      "/channels/technology/"
    );
    await expect(trail.getByRole("link", { name: "并发工程" })).toHaveAttribute(
      "href",
      "/topics/concurrency-engineering/"
    );

    const metadata = page.locator("[data-article-meta]");
    await expect(metadata).toContainText("发布于");
    await expect(metadata).toContainText("分钟阅读");
    await expect(metadata).toContainText("完整");
    await expect(page.locator("#article")).toContainText("一次延迟尖峰");

    const rail = page.locator("[data-context-rail]");
    await expect(rail).toBeVisible();
    const outline = rail.getByRole("navigation", { name: "本文目录" });
    await expect(outline.getByRole("link")).toHaveCount(5);
    await expect(outline.getByRole("link").first()).toHaveAttribute(
      "href",
      /^#/
    );
    await page
      .locator("#结论")
      .evaluate(heading =>
        heading.scrollIntoView({ block: "start", behavior: "instant" })
      );
    await expect(outline.getByRole("link", { name: "结论" })).toHaveAttribute(
      "aria-current",
      "location"
    );

    const topicContext = rail.getByRole("navigation", { name: "同专题文章" });
    const topicLinks = topicContext.locator("ol a");
    expect(await topicLinks.count()).toBeGreaterThan(0);
    expect(await topicLinks.count()).toBeLessThanOrEqual(5);
    await expect(
      topicContext.getByRole("link", { name: "事件循环中的延迟从哪里来" })
    ).toHaveAttribute("aria-current", "page");
  });

  test("展示系列进度、前后文章、延伸阅读和修订记录", async ({ page }) => {
    const series = page.getByRole("navigation", { name: "系列进度" });
    await expect(series).toContainText("第 2 / 3 篇");
    await expect(series.getByRole("link", { name: /上一篇/ })).toContainText(
      "协议调试先确认事实"
    );
    await expect(series.getByRole("link", { name: /下一篇/ })).toContainText(
      "存储边界如何影响系统设计"
    );

    const furtherReading = page.getByRole("region", { name: "延伸阅读" });
    await expect(furtherReading.getByRole("link")).toHaveCount(3);
    await expect(page.getByRole("region", { name: "修订记录" })).toContainText(
      "补充延迟排查步骤"
    );
  });

  test("增强代码、图表、图片和语义表格", async ({ page }) => {
    const codeBlock = page.locator("pre").filter({ hasText: "queueDepth" });
    await expect(codeBlock).toContainText("latency.ts");
    await expect(codeBlock).toHaveAttribute("data-line-numbers", "true");
    await expect(codeBlock.locator(".line.highlighted")).toHaveCount(1);
    await expect(codeBlock.locator(".line.diff.add")).toHaveCount(1);
    await expect(codeBlock.locator(".line.diff.remove")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "复制代码" }).first()
    ).toBeVisible();

    await expect(page.locator("svg[id^='mermaid-']")).toHaveCount(1);
    await expect(page.locator("figure figcaption")).toContainText(
      "频道配色占位图"
    );
    await expect(page.locator("figure a[data-pswp-src]")).toHaveCount(1);
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("打印时隐藏导航和上下文栏并保留正文", async ({ page }) => {
    await page.emulateMedia({ media: "print" });

    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator("[data-context-rail]")).toBeHidden();
    await expect(page.locator("#article")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("移动文章阅读", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ARTICLE_URL);
  });

  test("页头离开视口后显示固定阅读栏并更新进度", async ({ page }) => {
    const rail = page.locator("[data-context-rail]");
    const readingBar = page.getByRole("region", { name: "移动阅读栏" });
    const progress = readingBar.getByRole("progressbar", { name: "阅读进度" });

    await expect(rail).toBeHidden();
    await expect(readingBar).toBeHidden();

    await page
      .locator("#article")
      .evaluate(article =>
        article.scrollIntoView({ block: "start", behavior: "instant" })
      );
    await expect(readingBar).toBeVisible();
    const firstProgress = await progress.evaluate(
      element => (element as HTMLProgressElement).value
    );

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect
      .poll(() =>
        progress.evaluate(element => (element as HTMLProgressElement).value)
      )
      .toBeGreaterThan(firstProgress);

    const barBox = await readingBar.boundingBox();
    expect(barBox?.height).toBe(64);
  });

  test("目录抽屉支持双面板、焦点圈定、焦点归还和无位移关闭", async ({
    page,
  }) => {
    await page
      .locator("#article")
      .evaluate(article =>
        article.scrollIntoView({ block: "start", behavior: "instant" })
      );

    const trigger = page.getByRole("button", { name: "打开阅读导航" });
    const dialog = page.getByRole("dialog", { name: "阅读导航" });
    const articleTab = dialog.getByRole("tab", { name: "本文" });
    const topicTab = dialog.getByRole("tab", { name: "专题" });
    const articlePanel = dialog.getByRole("tabpanel", { name: "本文" });
    const topicPanel = dialog.getByRole("tabpanel", { name: "专题" });
    const scrollBeforeOpen = await page.evaluate(() => window.scrollY);

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
    await expect(page.locator(".skip-link")).toHaveAttribute("inert", "");
    await expect(articleTab).toHaveAttribute("aria-selected", "true");
    await expect(articlePanel).toBeVisible();
    await expect(topicPanel).toBeHidden();
    await expect(
      articlePanel.getByRole("link", { name: "关键指标" })
    ).toBeHidden();

    await topicTab.click();
    await expect(topicTab).toHaveAttribute("aria-selected", "true");
    await expect(topicPanel).toBeVisible();
    await expect(
      topicPanel.getByRole("link", { name: "事件循环中的延迟从哪里来" })
    ).toHaveAttribute("aria-current", "page");

    for (let index = 0; index < 8; index += 1) await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]'))
      )
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator("#main-content")).not.toHaveAttribute(
      "inert",
      ""
    );
    await expect(page.locator(".skip-link")).not.toHaveAttribute("inert", "");
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

    await page
      .locator("#关键指标")
      .evaluate(heading =>
        heading.scrollIntoView({ block: "start", behavior: "instant" })
      );
    await trigger.click();
    await expect(
      articlePanel.getByRole("link", { name: "关键指标" })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("移动阅读抽屉通过自动无障碍扫描", async ({ page }) => {
    await page
      .locator("#article")
      .evaluate(article =>
        article.scrollIntoView({ block: "start", behavior: "instant" })
      );
    await page.getByRole("button", { name: "打开阅读导航" }).click();

    const articleResults = await new AxeBuilder({ page }).analyze();
    expect(articleResults.violations).toEqual([]);

    await page.getByRole("tab", { name: "专题" }).click();
    const topicResults = await new AxeBuilder({ page }).analyze();
    expect(topicResults.violations).toEqual([]);
  });

  test("文章在 320、390 和 768 像素宽度下没有页面级横向滚动", async ({
    page,
  }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(ARTICLE_URL);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    }
  });
});

test("投资文章固定显示风险提示", async ({ page }) => {
  await page.goto("/articles/investment/decision-journal/");
  await expect(page.getByRole("note")).toContainText("不构成任何投资建议");
});
