import { defineConfig } from "@playwright/test";

/** LIVE prod E2E: real Luna, real speed. Bypass secret comes from env (never logged). */
const mobile = (width: number, height: number) => ({
  viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const desktop = (width: number, height: number) => ({ viewport: { width, height }, deviceScaleFactor: 1 });
const tablet = (width: number, height: number) => ({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

export default defineConfig({
  testDir: "tests/live",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.LIVE_BASE_URL || "https://human-ai.zdychanges.workers.dev",
    browserName: "chromium",
    channel: "chrome",
    extraHTTPHeaders: { "x-play-limit-bypass": process.env.LIVE_BYPASS || "" },
  },
  projects: [
    { name: "375x667", use: mobile(375, 667) },
    { name: "390x844", use: mobile(390, 844) },
    { name: "820x1180", use: tablet(820, 1180) },
    { name: "1024x768", use: desktop(1024, 768) },
    { name: "1280x720", use: desktop(1280, 720) },
    { name: "1440x900", use: desktop(1440, 900) },
  ],
});
