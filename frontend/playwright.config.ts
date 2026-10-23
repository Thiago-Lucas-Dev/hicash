import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
  },
  reporter: "list",
});
