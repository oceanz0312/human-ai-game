import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { PRIVATE_LEVELS_V1 } from "@/server/levels/catalog";

test("v1 has exactly twenty fixed levels with the 3×3 → 9×9 jump at level 6", () => {
  expect(PUBLIC_LEVELS_V1).toHaveLength(20);
  expect(PRIVATE_LEVELS_V1).toHaveLength(20);
  expect(PRIVATE_LEVELS_V1.map((level) => level.gridSize)).toEqual([3, 3, 3, 3, 3, ...Array(15).fill(9)]);
});

test("time limits never increase from one level to the next", () => {
  const limits = PRIVATE_LEVELS_V1.map((level) => level.limitMs);
  expect(limits[0]).toBe(8000);
  expect(limits[19]).toBe(3000);
  for (let index = 6; index < limits.length; index += 1) expect(limits[index]).toBeLessThanOrEqual(limits[index - 1]);
});

test.each(PRIVATE_LEVELS_V1)("level $level has a unique valid answer", (level) => {
  expect(level.choices).toHaveLength(level.gridSize ** 2);
  expect(new Set(level.choices).size).toBe(level.choices.length);
  expect(level.choices.filter((choice) => choice === level.correctChoice)).toHaveLength(1);
  expect(level.choices.length).toBeLessThanOrEqual(255);
});

test("public metadata never includes the answer", async () => {
  expect(JSON.stringify(PUBLIC_LEVELS_V1)).not.toContain("correctChoice");
  for (const level of PRIVATE_LEVELS_V1) {
    const publicLevel = PUBLIC_LEVELS_V1[level.level - 1];
    expect(publicLevel).toEqual({ version: "v1", level: level.level, gridSize: level.gridSize, limitMs: level.limitMs, imageUrl: level.imageUrl, choices: level.choices });
  }
  const source = await readFile(path.join(process.cwd(), "src/levels/public-catalog.generated.ts"), "utf8");
  expect(source).not.toContain("correctChoice");
});
