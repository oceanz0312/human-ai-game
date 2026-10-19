import type { SkinId } from "./skin-calendar";
import { CHRISTMAS, EVERYDAY, HALLOWEEN, SKIN_SPRITES, THANKSGIVING, type Sprite } from "@/games/spot-the-difference/quick/sprites";

/**
 * Visuals per seasonal skin (plan: proposals/seasonal-skin-plan.md §5). A skin only adds an accent color (header
 * and footer stripe, seasonal card) and a small sprite mark beside the home H1; titles, headings, copy, meta and
 * JSON-LD never change. `page` is the keyword page the home card links to; the card only shows when that route
 * exists (see themeCards in src/content/keyword-pages.ts), so /winter, /spring, /summer and /fall stay
 * visuals-only until those pages ship.
 */
export interface Skin {
  id: SkinId;
  name: string;
  accent: string;
  marks: Sprite[];
  page: string;
}

const pick = (set: Sprite[], ...ids: string[]) => ids.map((id) => {
  const sprite = set.find((s) => s.id === id);
  if (!sprite) throw new Error(`missing sprite ${id}`);
  return sprite;
});

export const SKINS: Record<SkinId, Skin> = {
  halloween: { id: "halloween", name: "Halloween", accent: "#f39c34", marks: pick(HALLOWEEN, "pumpkin", "ghost"), page: "/halloween" },
  thanksgiving: { id: "thanksgiving", name: "Thanksgiving", accent: "#c4621d", marks: pick(THANKSGIVING, "turkey", "pumpkin-pie"), page: "/thanksgiving" },
  christmas: { id: "christmas", name: "Christmas", accent: "#1f9d55", marks: pick(CHRISTMAS, "tree", "gift"), page: "/christmas" },
  "new-year": { id: "new-year", name: "New Year", accent: "#d9932b", marks: [...pick(EVERYDAY, "star"), SKIN_SPRITES.firework], page: "/winter" },
  valentines: { id: "valentines", name: "Valentine's Day", accent: "#ff3b6b", marks: pick(EVERYDAY, "heart"), page: "/winter" },
  "st-patricks": { id: "st-patricks", name: "St. Patrick's Day", accent: "#3aa655", marks: [SKIN_SPRITES.shamrock], page: "/spring" },
  easter: { id: "easter", name: "Easter", accent: "#b48cf0", marks: [SKIN_SPRITES.egg], page: "/spring" },
  "july-4": { id: "july-4", name: "4th of July", accent: "#3a7bff", marks: [SKIN_SPRITES.firework, ...pick(EVERYDAY, "star")], page: "/summer" },
  winter: { id: "winter", name: "Winter", accent: "#3a9be0", marks: [SKIN_SPRITES.snowflake], page: "/winter" },
  spring: { id: "spring", name: "Spring", accent: "#ff6fb5", marks: pick(EVERYDAY, "flower"), page: "/spring" },
  summer: { id: "summer", name: "Summer", accent: "#ffcf3f", marks: [SKIN_SPRITES.sun], page: "/summer" },
  fall: { id: "fall", name: "Fall", accent: "#d9661f", marks: pick(THANKSGIVING, "maple-leaf", "acorn"), page: "/fall" },
};

/** Inline style carrying the accent as a CSS variable (consumed by shell.css / game.css / site.css). */
export const skinStyle = (skin: SkinId | null | undefined): React.CSSProperties | undefined =>
  skin ? ({ "--skin-accent": SKINS[skin].accent } as React.CSSProperties) : undefined;
