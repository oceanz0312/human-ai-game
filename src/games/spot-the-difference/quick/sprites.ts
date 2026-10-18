/**
 * Pixel sprites for the instant "quick" puzzles (home page board, difficulty pages, Christmas set, printables).
 * Separate from the 20 ranked levels on purpose: answers here live in the browser, so they never touch the
 * leaderboard level set. 8×8 rows; "." is transparent, letters index the sprite's palette.
 */
export interface Sprite {
  id: string;
  name: string;
  rows: string[];
  palette: Record<string, string>;
}

const s = (id: string, name: string, palette: Record<string, string>, rows: string[]): Sprite => ({ id, name, rows, palette });

export const EVERYDAY: Sprite[] = [
  s("apple", "apple", { r: "#e5403a", g: "#3aa655", b: "#6b3d1f", w: "#ffd6d1" }, ["....b...", "...bg...", ".rrrgrr.", "rrwrrrrr", "rwrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rr.rr."]),
  s("cat", "cat", { k: "#3b3355", o: "#f39c34", p: "#ff8fb1", w: "#ffffff" }, ["o.....o.", "oo...oo.", "ooooooo.", "owkoowk.", "ooopooo.", "ooooooo.", ".ooooo..", ".o...o.."]),
  s("fish", "fish", { b: "#2f8fe0", y: "#ffd447", k: "#1d2440", w: "#ffffff" }, ["........", "..bbb..y", ".bbbbbyy", "bwkbbbyy", "bbbbbbyy", ".bbbbbyy", "..bbb..y", "........"]),
  s("house", "house", { r: "#d94b3d", y: "#f7e3a3", b: "#7a4a2a", s: "#7cc6ff" }, ["...rr...", "..rrrr..", ".rrrrrr.", "rrrrrrrr", ".yyyyyy.", ".ysyyby.", ".yyyyby.", ".yyyyby."]),
  s("heart", "heart", { r: "#ff3b6b", p: "#ffc2d2" }, [".rr..rr.", "rprrrrrr", "rprrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr...", "........"]),
  s("star", "star", { y: "#ffcf3f", o: "#f39c34" }, ["...yy...", "...yy...", "yyyyyyyy", ".yyyyyy.", "..yooy..", ".yyooyy.", ".yy..yy.", "y......y"]),
  s("mushroom", "mushroom", { r: "#e5403a", w: "#ffffff", c: "#f7e3c4" }, ["..rrrr..", ".rrwwrr.", "rrwwrrrr", "rrrrrwwr", "rrrrrrrr", "..cccc..", "..cccc..", "..cccc.."]),
  s("duck", "duck", { y: "#ffd447", o: "#f39c34", k: "#1d2440", b: "#3ab0ff" }, ["..yy....", ".yyky...", ".yyyyoo.", "..yy....", ".yyyyyy.", "yyyyyyyy", ".yyyyyy.", "bbbbbbbb"]),
  s("rocket", "rocket", { w: "#e9eef5", r: "#e5403a", b: "#3ab0ff", o: "#f39c34" }, ["...ww...", "..wwww..", "..wbbw..", "..wbbw..", "..wwww..", ".rwwwwr.", "rr.ww.rr", "...oo..."]),
  s("flower", "flower", { p: "#ff6fb5", y: "#ffd447", g: "#3aa655" }, [".pp.pp..", "pppppp..", ".ppypp..", "pppppp..", ".pp.pp..", "...g....", "..ggg...", "...g...."]),
];

export const CHRISTMAS: Sprite[] = [
  s("tree", "Christmas tree", { g: "#1f9d55", y: "#ffd447", r: "#e5403a", b: "#7a4a2a" }, ["...yy...", "...gg...", "..grgg..", "..gggg..", ".ggggyg.", ".grgggg.", "gggggrgg", "...bb..."]),
  s("gift", "gift box", { r: "#e5403a", y: "#ffd447", g: "#1f9d55" }, ["..y..y..", "...yy...", "rrryyrrr", "rrryyrrr", "yyyyyyyy", "rrryyrrr", "rrryyrrr", "rrryyrrr"]),
  s("snowman", "snowman", { w: "#ffffff", k: "#1d2440", o: "#f39c34", r: "#e5403a" }, ["..kkkk..", "..kkkk..", ".kwwwwk.", "..wkwo..", "..rrrr..", ".wwkwww.", "wwwkwwww", ".wwwwww."]),
  s("bell", "bell", { y: "#ffcf3f", o: "#d9932b", r: "#e5403a" }, ["...rr...", "..yyyy..", ".yyyyyy.", ".yoyyyy.", ".yoyyyy.", "yyyyyyyy", "yyyyyyyy", "...oo..."]),
  s("candy", "candy cane", { w: "#ffffff", r: "#e5403a" }, ["..rwrw..", ".w....r.", ".r....w.", "......r.", "......w.", "......r.", "......w.", "......r."]),
  s("stocking", "stocking", { r: "#e5403a", w: "#ffffff", g: "#1f9d55" }, ["..wwww..", "..wwww..", "..rrrr..", "..rgrr..", "..rrrr..", ".rrrrr..", "rrrrrg..", "rrrr...."]),
  s("ornament", "ornament", { b: "#3a7bff", y: "#ffd447", w: "#ffffff" }, ["...yy...", "..yyyy..", ".bbbbbb.", "bwbbbbbb", "byyyyyyb", "bbbbbbbb", ".bbbbbb.", "..bbbb.."]),
  s("reindeer", "reindeer", { b: "#8a5a32", t: "#c79a6a", r: "#e5403a", k: "#1d2440" }, ["t.t..t.t", ".tt..tt.", "..bbbb..", ".bkbbkb.", ".bbbbbb.", "..bbbb..", "..brrb..", "...rr..."]),
];

export type QuickTheme = "everyday" | "christmas";
export const spritesFor = (theme: QuickTheme) => (theme === "christmas" ? CHRISTMAS : EVERYDAY);
