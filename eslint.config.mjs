import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "drizzle/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "workers/decisions/.wrangler/**", ".open-next/**", ".wrangler/**"] },
  ...next,
];

export default config;
