import type { Sprite } from "./sprites";

/** Horizontal runs of one colour → few <rect>s per sprite. */
function runs(sprite: Sprite) {
  const out: Array<{ x: number; y: number; w: number; fill: string }> = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (row[x + w] === c) w++;
      if (c !== ".") out.push({ x, y, w, fill: sprite.palette[c] ?? "#000" });
      x += w;
    }
  });
  return out;
}

/** <symbol> definition; cells reference it with <use>. */
export function SpriteSymbol({ id, sprite }: { id: string; sprite: Sprite }) {
  return (
    <symbol id={id} viewBox="0 0 8 8">
      {runs(sprite).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </symbol>
  );
}

export function SpriteDefs({ prefix, sprites }: { prefix: string; sprites: Sprite[] }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        {sprites.map((sprite) => (
          <SpriteSymbol key={sprite.id} id={`${prefix}-${sprite.id}`} sprite={sprite} />
        ))}
      </defs>
    </svg>
  );
}

export function SpriteUse({ href, title }: { href: string; title?: string }) {
  return (
    <svg viewBox="0 0 8 8" shapeRendering="crispEdges" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <use href={`#${href}`} />
    </svg>
  );
}

/** Standalone sprite (gallery thumbnails). */
export function PixelSprite({ sprite, title }: { sprite: Sprite; title?: string }) {
  return (
    <svg viewBox="0 0 8 8" shapeRendering="crispEdges" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {runs(sprite).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
