import { CHRISTMAS, EVERYDAY } from "@/games/spot-the-difference/quick/sprites";
import { makePuzzle, QUICK_MODES } from "@/games/spot-the-difference/quick/puzzle";

test("every sprite is 8×8 and only uses its palette", () => {
  for (const sprite of [...EVERYDAY, ...CHRISTMAS]) {
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
