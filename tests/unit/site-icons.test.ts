import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_ICONS, SITE_MANIFEST } from "@/config/site";
import { organizationLd } from "@/seo/jsonld";

describe("site icons", () => {
  it("every referenced icon and the manifest exist in public/", () => {
    for (const { url } of [...SITE_ICONS.icon, ...SITE_ICONS.apple]) expect(existsSync(`public${url}`)).toBe(true);
    const manifest = JSON.parse(readFileSync(`public${SITE_MANIFEST}`, "utf8"));
    expect(manifest.name).toBe("Spot The Difference Game");
    expect(manifest.theme_color).toBe("#c8003c");
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true);
  });

  it("Organization JSON-LD carries the logo", () => {
    const ld = organizationLd();
    expect(ld.logo).toBe("https://spotthedifferencegame.com/icon.png");
  });
});
