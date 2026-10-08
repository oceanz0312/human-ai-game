import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { LEVEL_IMAGE_SIZE } from "../src/game/board";
import { LEVELS_V1 } from "../src/server/levels/spec";

if (LEVELS_V1.length !== 20) throw new Error(`Expected 20 levels, found ${LEVELS_V1.length}`);

for (const item of LEVELS_V1) {
  const expectedSize = item.level <= 5 ? 3 : 9;
  if (item.gridSize !== expectedSize) throw new Error(`Level ${item.level}: expected ${expectedSize}x${expectedSize}`);
  if (item.choices.length !== item.gridSize ** 2) throw new Error(`Level ${item.level}: wrong choice count`);
  if (new Set(item.choices).size !== item.choices.length) throw new Error(`Level ${item.level}: duplicate choices`);
  if (item.choices.filter((choice) => choice === item.correctChoice).length !== 1) throw new Error(`Level ${item.level}: answer not uniquely in choices`);
  const file = path.join(process.cwd(), "public", item.imageUrl);
  await access(file);
  if ((await stat(file)).size < 1024) throw new Error(`Level ${item.level}: image is unexpectedly small`);
  const meta = await sharp(await readFile(file)).metadata();
  if (meta.width !== LEVEL_IMAGE_SIZE || meta.height !== LEVEL_IMAGE_SIZE) throw new Error(`Level ${item.level}: image must be ${LEVEL_IMAGE_SIZE}px square`);
}

const publicCatalog = await readFile(path.join(process.cwd(), "src", "levels", "public-catalog.generated.ts"), "utf8");
if (publicCatalog.includes("correctChoice")) throw new Error("Public catalog leaks correct answers");

console.log("Validated 20 frozen v1 levels");
