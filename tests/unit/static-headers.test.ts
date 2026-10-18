import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/** Parses Cloudflare's public/_headers format into { pattern: { header: value } }. */
function parseHeaders(text: string) {
  const rules: Record<string, Record<string, string>> = {};
  let current: string | null = null;
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = raw.trim();
      rules[current] = {};
    } else if (current) {
      const [name, ...rest] = raw.trim().split(":");
      rules[current][name.toLowerCase()] = rest.join(":").trim();
    }
  }
  return rules;
}

describe("public/_headers (static asset caching)", () => {
  const rules = parseHeaders(readFileSync(path.join(process.cwd(), "public/_headers"), "utf8"));

  test("hashed Next build output is immutable for a year", () => {
    expect(rules["/_next/static/*"]["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  test("unhashed public files are never marked immutable", () => {
    for (const [pattern, headers] of Object.entries(rules)) {
      if (pattern === "/_next/static/*") continue;
      expect(headers["cache-control"], pattern).not.toMatch(/immutable/);
      expect(headers["cache-control"], pattern).toMatch(/max-age=\d+/);
    }
  });

  test("no rule touches HTML, API or session routes", () => {
    for (const pattern of Object.keys(rules)) {
      expect(pattern).not.toMatch(/^\/(\*|api|play|result|share|games)/);
    }
  });
});
