import type { Locale } from "../i18n/config";
import spotEn from "./spot-the-difference/messages/en";

/** Per-game message namespaces. Adding a game = one entry here (see docs/adding-a-game.md). */
export const gameMessageCatalogs: Array<{ game: string } & Partial<Record<Locale, Record<string, string>>>> = [
  { game: "spot-the-difference", en: spotEn },
];
