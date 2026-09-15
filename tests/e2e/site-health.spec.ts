import { test, expect, type Page } from "@playwright/test";

const HEALTH_ROUTES = [
  "/",
  "/channels/technology/",
  "/channels/life/",
  "/channels/investment/",
  "/articles/",
  "/topics/",
  "/projects/",
  "/about/",
  "/articles/technology/event-loop-notes/",
  "/articles/life/reading-with-questions/",
  "/articles/investment/decision-journal/",
];

async function collectHealthFailures(page: Page, route: string) {
  const failures: string[] = [];
  page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", request =>
    failures.push(`request: ${request.url()} (${request.failure()?.errorText})`)
  );

  const response = await page.goto(route);
  expect(response?.status(), route).toBeLessThan(400);

  const images = page.locator("img");
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          image.evaluate(element => (element as HTMLImageElement).naturalWidth),
        {
          message: `image ${index} on ${route} did not load`,
        }
      )
      .toBeGreaterThan(0);
  }

  const links = await page.locator("a[href]").evaluateAll(anchors =>
    anchors
      .map(anchor => (anchor as HTMLAnchorElement).href)
      .filter(url => {
        const parsed = new URL(url);
        return parsed.origin === window.location.origin;
      })
  );
  for (const url of [...new Set(links)]) {
    const parsed = new URL(url);
    const targetUrl = new URL(parsed);
    targetUrl.hash = "";
    const linkResponse = await page.request.get(targetUrl.href);
    if (linkResponse.status() >= 400) {
      failures.push(`link: ${targetUrl.href} (${linkResponse.status()})`);
      continue;
    }

    if (parsed.hash) {
      const current = new URL(page.url());
      if (
        parsed.pathname === current.pathname &&
        parsed.search === current.search
      ) {
        const targetId = decodeURIComponent(parsed.hash.slice(1));
        const targetExists = await page
          .locator("[id]")
          .evaluateAll(
            (elements, id) => elements.some(element => element.id === id),
            targetId
          );
        if (!targetExists) {
          failures.push(`anchor: ${url}`);
        }
      }
    }
  }

  expect(failures, route).toEqual([]);
}

test.describe("站点健康检查", () => {
  for (const route of HEALTH_ROUTES) {
    test(route, async ({ page }) => {
      await collectHealthFailures(page, route);
    });
  }
});
