import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8787",
    locale: "ar",
    trace: "retain-on-failure",
  },
  projects: [
    // Signs each test role in once (login is rate limited) and saves the session.
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"] },
  ],
  webServer: [
    { command: "node tests/e2e/telegram-capture.mjs", url: "http://127.0.0.1:8799/messages", reuseExistingServer: false },
    { command: "bash scripts/e2e-server.sh", url: "http://127.0.0.1:8787/", timeout: 240_000, reuseExistingServer: !process.env.CI },
  ],
});
