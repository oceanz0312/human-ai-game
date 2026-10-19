import { defineConfig } from "@playwright/test";
// Seasonal home skin: fixed date for a deterministic suite; single tests override it with ?skinDate= / ?skin=.
import { E2E_SKIN_DATE } from "./tests/e2e/skin-date";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const mobile = (width: number, height: number) => ({
  viewport: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

const desktop = (width: number, height: number) => ({ viewport: { width, height }, deviceScaleFactor: 1 });
const tablet = (width: number, height: number) => ({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
/** Layout + responsive specs run at every acceptance viewport; the full functional suite runs once at 375x667. */
const LAYOUT = /@layout|@viewport/;
/** Local-only bypass so the suite's many runs never hit the daily play limit (the limit spec opts out). */
export const E2E_BYPASS = "local-e2e-bypass-0123456789";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium", channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
    extraHTTPHeaders: { "x-play-limit-bypass": E2E_BYPASS },
  },
  projects: [
    { name: "375x667", use: mobile(375, 667) },
    { name: "390x844", use: mobile(390, 844), grep: LAYOUT },
    { name: "820x1180", use: tablet(820, 1180), grep: LAYOUT },
    { name: "1024x768", use: desktop(1024, 768), grep: LAYOUT },
    { name: "1280x720", use: desktop(1280, 720), grep: LAYOUT },
    { name: "1440x900", use: desktop(1440, 900), grep: LAYOUT },
  ],
  webServer: {
    command: `rm -f e2e.db && npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:./e2e.db",
      DECISIONS_MODE: "fake",
      FAKE_AI_ERROR_LEVELS: "2",
      RESULT_SIGNING_SECRET: "e2e-signing-secret-0123456789abcdef",
      PUBLIC_BASE_URL: `http://127.0.0.1:${PORT}`,
      PLAY_LIMIT_BYPASS_SECRET: E2E_BYPASS,
      SKIN_DATE: E2E_SKIN_DATE,
      SKIN_OVERRIDE_ENABLED: "1",
    },
  },
});
