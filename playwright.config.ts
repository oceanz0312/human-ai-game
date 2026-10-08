import { defineConfig } from "@playwright/test";

const PORT = 3100;
const mobile = (width: number, height: number) => ({
  viewport: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium", trace: "retain-on-failure" },
  projects: [
    { name: "375x812", use: mobile(375, 812) },
    { name: "390x844", use: mobile(390, 844), grep: /@layout/ },
    { name: "430x932", use: mobile(430, 932), grep: /@layout/ },
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
    },
  },
});
