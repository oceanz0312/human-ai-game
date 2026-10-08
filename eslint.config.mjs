import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "drizzle/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "workers/decisions/.wrangler/**"] },
  ...next,
];

export default config;
