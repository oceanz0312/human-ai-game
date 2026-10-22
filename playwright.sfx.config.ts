import { defineConfig } from "@playwright/test";
import { E2E_SKIN_DATE } from "./tests/e2e/skin-date";

const E2E_BYPASS = "local-e2e-bypass-0123456789";

const PORT = Number(process.env.E2E_PORT ?? 3101);
const mobile = {
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "sfx-audio.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    extraHTTPHeaders: { "x-play-limit-bypass": E2E_BYPASS },
  },
  projects: [
    { name: "chromium-mobile", use: { ...mobile, browserName: "chromium" } },
    { name: "webkit-mobile", use: { ...mobile, browserName: "webkit" } },
  ],
  webServer: {
    command: `rm -f e2e-sfx.db && npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:./e2e-sfx.db",
      DECISIONS_MODE: "fake",
      RESULT_SIGNING_SECRET: "e2e-signing-secret-0123456789abcdef",
      PUBLIC_BASE_URL: `http://127.0.0.1:${PORT}`,
      PLAY_LIMIT_BYPASS_SECRET: E2E_BYPASS,
      SKIN_DATE: E2E_SKIN_DATE,
      SKIN_OVERRIDE_ENABLED: "1",
    },
  },
});
