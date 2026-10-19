/**
 * Pixel sprites for the instant "quick" puzzles (home page board, difficulty pages, holiday sets, printables).
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

/**
 * Halloween set (kid-friendly: no skulls or gore). Cells are white, so no color here is near-white – a pixel that
 * turns transparent must always be visible (unit test: holiday palettes keep contrast against the cell).
 */
export const HALLOWEEN: Sprite[] = [
  s("pumpkin", "jack-o'-lantern", { o: "#f39c34", d: "#c4621d", k: "#1d2440", g: "#3aa655" }, ["...gg...", ".oooooo.", "oooooooo", "okooooko", "oodoodoo", "okkkkkko", ".ookkoo.", "..oooo.."]),
  s("ghost", "ghost", { l: "#d3d9f0", s: "#7d86b3", k: "#1d2440" }, ["..ssss..", ".slllls.", "slllllls", "slkllkls", "slllllls", "sllkklls", "slllllls", "ss.ss.ss"]),
  s("bat", "bat", { p: "#5b3f8c", c: "#3b3355", y: "#ffd447" }, ["..c..c..", "p.cccc.p", "ppcyycpp", "pppccppp", "pppppppp", "p.pppp.p", "...pp...", "........"]),
  s("witch-hat", "witch hat", { h: "#2b2440", p: "#7b4fc9", y: "#ffd447" }, ["....h...", "...hh...", "...hhh..", "..hhhh..", "..hhhhh.", ".ppyypp.", "hhhhhhhh", "........"]),
  s("black-cat", "black cat", { c: "#3b3355", e: "#8be04e", p: "#ff8fb1" }, [".c...c..", ".ccccc..", ".cecec..", ".ccpcc..", "..ccc..c", ".ccccc.c", ".cccccc.", ".cc.cc.."]),
  s("candy-corn", "candy corn", { w: "#ead29c", o: "#f39c34", y: "#ffcf3f" }, ["...ww...", "...ww...", "..oooo..", "..oooo..", ".oooooo.", ".yyyyyy.", "yyyyyyyy", "yyyyyyyy"]),
  s("spider", "spider", { k: "#1d2440", p: "#7b4fc9", r: "#e5403a" }, ["k......k", ".k.kk.k.", "..kkkk..", "kkrkkrkk", "..kppk..", ".kkkkkk.", "k.kkkk.k", "...kk..."]),
  s("cauldron", "cauldron", { e: "#8be04e", k: "#1d2440", s: "#5a6080", o: "#f39c34", y: "#ffd447" }, ["..e...e.", ".eeeeee.", "kkkkkkkk", "kskkkkkk", "kskkkkkk", ".kkkkkk.", "..k..k..", ".oyoyoo."]),
];

/** Thanksgiving set (US harvest + football). Same contrast rules as the Halloween set. */
export const THANKSGIVING: Sprite[] = [
  s("turkey", "turkey", { r: "#e5403a", o: "#f39c34", y: "#ffcf3f", b: "#8a5a32", k: "#1d2440" }, ["..oyyo..", ".royyor.", "roybbyor", "robkbbor", "robbybor", ".bbrbbb.", "..bbbb..", "..o..o.."]),
  s("pumpkin-pie", "pumpkin pie", { c: "#d9a35a", f: "#c4621d", w: "#ead29c" }, ["..cccc..", ".cffffc.", "cffffffc", "cffwwffc", "cffwwffc", "cffffffc", ".cffffc.", "..cccc.."]),
  s("corn", "ear of corn", { y: "#ffd447", d: "#d99a1e", g: "#3aa655", h: "#8bd16a" }, ["...yy...", "..ydyy..", "..yydy..", "..ydyy..", "g.yydy.g", "ggydyygg", ".ghyyhg.", "..gggg.."]),
  s("acorn", "acorn", { b: "#6b3d1f", t: "#a0703f", n: "#c98a3a", h: "#e8b56a" }, ["....b...", ".bbbbbb.", "btbtbtbb", ".bbbbbb.", ".nnnnnn.", ".nhnnnn.", "..nnnn..", "...nn..."]),
  s("maple-leaf", "maple leaf", { r: "#e5403a", o: "#f39c34", b: "#6b3d1f" }, ["...r....", "r.rrr.r.", "rrrorrr.", ".rrorr..", "rrrorrr.", "..ror...", "...b....", "...b...."]),
  s("football", "football", { b: "#8a4b25", l: "#d8cbb0", k: "#5a2e14" }, ["........", "..bbbb..", ".bblblb.", "kbllllbk", ".bblblb.", "..bbbb..", "........", "........"]),
  s("cornucopia", "cornucopia", { h: "#c98a3a", d: "#8a5a32", r: "#e5403a", p: "#7b4fc9", g: "#3aa655" }, ["........", "....hhpp", "...hdhpp", "..hdhhrg", ".hdhhhrr", "hdhhhhgg", "h.dhhh..", "........"]),
  s("gourd", "gourd", { n: "#e9a54a", d: "#b8742a", g: "#3aa655" }, ["...g....", "...nn...", "...nn...", "..nnnn..", ".nnnnnn.", ".nndnnn.", ".nnnnnn.", "..nnnn.."]),
];

export type QuickTheme = "everyday" | "christmas" | "halloween" | "thanksgiving";
const SETS: Record<QuickTheme, Sprite[]> = { everyday: EVERYDAY, christmas: CHRISTMAS, halloween: HALLOWEEN, thanksgiving: THANKSGIVING };
export const spritesFor = (theme: QuickTheme) => SETS[theme];
