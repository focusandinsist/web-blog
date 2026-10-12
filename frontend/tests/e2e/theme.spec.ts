import { test, expect } from "@playwright/test";

test.describe("主题系统", () => {
  test("支持 system/light/dark 三态并在刷新后持久化", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("blog-theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      /light|dark/
    );

    const themeButton = page.getByRole("button", { name: /主题/ });
    await themeButton.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitemradio", { name: "暗色" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page).toHaveTitle(/./);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await themeButton.click();
    await page.getByRole("menuitemradio", { name: "跟随系统" }).click();
    await expect(
      page.evaluate(() => localStorage.getItem("blog-theme"))
    ).resolves.toBe("system");
  });

  test("主题菜单支持键盘导航和 Escape 关闭", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("blog-theme", "light"));
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /主题设置/ }).first();
    await trigger.focus();
    await trigger.press("Enter");
    const selected = page.getByRole("menuitemradio", { checked: true }).first();
    await expect(selected).toBeFocused();
    await selected.press("ArrowDown");
    const darkChoice = page.getByRole("menuitemradio").nth(1);
    await expect(darkChoice).toBeFocused();
    await darkChoice.press("Enter");
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await trigger.press("Enter");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
