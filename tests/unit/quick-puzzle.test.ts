import { CHRISTMAS, EVERYDAY, HALLOWEEN, spritesFor, THANKSGIVING, WINTER } from "@/games/spot-the-difference/quick/sprites";
import { makePuzzle, QUICK_MODES } from "@/games/spot-the-difference/quick/puzzle";

test("every sprite is 8×8 and only uses its palette", () => {
  for (const sprite of [...EVERYDAY, ...CHRISTMAS, ...HALLOWEEN, ...THANKSGIVING, ...WINTER]) {
    expect(sprite.rows, sprite.id).toHaveLength(8);
    for (const row of sprite.rows) {
      expect(row, sprite.id).toHaveLength(8);
      for (const c of row) expect(c === "." || c in sprite.palette, `${sprite.id}:${c}`).toBe(true);
    }
  }
});

test("puzzles are deterministic, have exactly one odd cell and a real pixel difference", () => {
  for (const mode of Object.values(QUICK_MODES)) {
    mode.grids.forEach((grid, i) => {
      const a = makePuzzle(`t-${mode.key}-${i}`, { theme: mode.theme, grid, changes: mode.changes });
      expect(makePuzzle(`t-${mode.key}-${i}`, { theme: mode.theme, grid, changes: mode.changes })).toEqual(a);
      expect(a.oddIndex).toBeGreaterThanOrEqual(0);
      expect(a.oddIndex).toBeLessThan(grid * grid);
      expect(a.changed).toHaveLength(mode.changes);
      const diff = a.base.rows.join("").split("").filter((c, k) => c !== a.odd.rows.join("")[k]).length;
      expect(diff).toBe(mode.changes);
    });
  }
});

/** WCAG relative luminance contrast between two hex colors. */
const contrast = (a: string, b: string) => {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const rgbDistance = (a: string, b: string) => Math.hypot(...[1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)));

test("holiday sets: 8 unique sprites, every color visible on the white cell and distinct from the others", () => {
  for (const set of [HALLOWEEN, THANKSGIVING, WINTER]) {
    expect(set).toHaveLength(8);
    expect(new Set(set.map((sprite) => sprite.id)).size).toBe(8);
    for (const sprite of set) {
      const colors = Object.values(sprite.palette);
      // A pixel that turns transparent shows the white cell: it must not look like a light palette color.
      for (const color of colors) expect(contrast(color, "#ffffff"), `${sprite.id} ${color} vs white`).toBeGreaterThanOrEqual(1.4);
      // Recolored pixels must read as a different color (hue counts too, so RGB distance rather than luminance).
      for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) expect(rgbDistance(colors[i], colors[j]), `${sprite.id} ${colors[i]}/${colors[j]}`).toBeGreaterThanOrEqual(45);
    }
  }
});

test("holiday puzzles never draw from another theme", () => {
  for (const [theme, set] of [["halloween", HALLOWEEN], ["thanksgiving", THANKSGIVING], ["winter", WINTER]] as const) {
    const ids = new Set(set.map((sprite) => sprite.id));
    expect(spritesFor(theme)).toBe(set);
    for (let i = 0; i < 50; i++) expect(ids.has(makePuzzle(`h-${i}`, { theme, grid: 4, changes: 2 }).base.id)).toBe(true);
  }
});

test("winter set: the 8 approved sprites, no Christmas pictures (snowman stays on /christmas)", () => {
  expect(WINTER.map((sprite) => sprite.id)).toEqual(["snowflake", "mitten", "hot-cocoa", "knit-hat", "ice-skate", "sled", "penguin", "polar-bear"]);
  const christmas = new Set(CHRISTMAS.map((sprite) => sprite.id));
  expect(WINTER.some((sprite) => christmas.has(sprite.id))).toBe(false);
  expect(QUICK_MODES.winter).toMatchObject({ theme: "winter", grids: [4, 5, 6], changes: 2 });
});
