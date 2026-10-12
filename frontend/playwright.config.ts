import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /no-js\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "no-js",
      testMatch: /no-js\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
  ],
  webServer: {
    command: "node scripts/start-playwright-server.mjs",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
  },
});
