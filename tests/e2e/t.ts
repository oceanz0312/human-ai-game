import { translate, type Vars } from "../../src/i18n/messages";

/** The public site is English only: specs address UI copy by its gettext id and assert the English text. */
export const t = (id: string, vars?: Vars) => translate("en", id, vars);
/** Escaped English text for building RegExps. */
export const rx = (id: string, vars?: Vars) => t(id, vars).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const START = /^Play 20 levels vs AI/;
