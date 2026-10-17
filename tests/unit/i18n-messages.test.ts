import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import commonEn from "@/i18n/messages/en";
import { catalogFor, translate } from "@/i18n/messages";
import { gameMessageCatalogs } from "@/games/messages";

const en = catalogFor("en")!;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

test("every message id used in the app has an English translation", () => {
  const ids = new Set<string>();
  for (const file of sources("src")) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/(?:\bt|translator\(locale\))\("((?:[^"\\]|\\.)*)"/g)) ids.add(match[1]);
  }
  expect(ids.size).toBeGreaterThan(50);
  const missing = [...ids].filter((id) => !(id in en));
  expect(missing).toEqual([]);
});

test("interpolation and zh passthrough", () => {
  expect(translate("zh", "第 {n} 关", { n: 3 })).toBe("第 3 关");
  expect(translate("en", "第 {n} 关", { n: 3 })).toBe("Level 3");
});

test("English catalog has no CJK characters", () => {
  for (const [id, value] of Object.entries(en)) expect(value, id).not.toMatch(/\p{Script=Han}/u);
});

test("message namespaces: common and per-game catalogs never overlap", () => {
  const seen = new Map<string, string>(Object.keys(commonEn).map((id) => [id, "common"]));
  for (const catalog of gameMessageCatalogs) {
    for (const id of Object.keys(catalog.en ?? {})) {
      expect(seen.get(id), `${id} in ${catalog.game}`).toBeUndefined();
      seen.set(id, catalog.game);
    }
  }
});
