import { defineConfig } from "@playwright/test";
import base, { E2E_BYPASS } from "./playwright.config";

/** Simulated-AI suite (production opponent). Reuses the build from `npm run test:e2e`; run after it. */
const PORT = Number(process.env.E2E_SIM_PORT ?? 3101);
export default defineConfig({
  ...base,
  testMatch: /.*\.sim\.ts$/,
  projects: [base.projects![0]],
  use: { ...base.use, baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `rm -f e2e-sim.db && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:./e2e-sim.db",
      AI_MODE: "simulated",
      RESULT_SIGNING_SECRET: "e2e-signing-secret-0123456789abcdef",
      PUBLIC_BASE_URL: `http://127.0.0.1:${PORT}`,
      PLAY_LIMIT_BYPASS_SECRET: E2E_BYPASS,
    },
  },
});
