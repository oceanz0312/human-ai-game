import type { T } from "./messages";

/** Anonymous players are stored as "玩家 XXXX"; render that through the catalog ("Player XXXX"). */
export function displayNickname(nickname: string, t: T) {
  const match = /^玩家 ([A-Za-z0-9]{4})$/.exec(nickname);
  return match ? t("玩家 {tag}", { tag: match[1] }) : nickname;
}
