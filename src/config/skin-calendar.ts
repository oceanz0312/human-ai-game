/**
 * Seasonal skin calendar (plan: proposals/seasonal-skin-plan.md, approved 2026-10-19).
 *
 * Pure date logic, no imports: shared by the edge middleware (picks the prerendered home variant per request) and
 * the server components (game layout accent). Dates are calendar days in America/New_York (US audience).
 * Windows are inclusive. A holiday window beats a season; when two holiday windows overlap (e.g. St Patrick's and
 * Easter in 2027) the holiday whose date is closer wins, ties go to the upcoming one.
 */
export const SKIN_TIME_ZONE = "America/New_York";

export const HOLIDAY_SKINS = ["halloween", "thanksgiving", "christmas", "new-year", "valentines", "st-patricks", "easter", "july-4"] as const;
export const SEASON_SKINS = ["winter", "spring", "summer", "fall"] as const;
export const SKIN_IDS = [...HOLIDAY_SKINS, ...SEASON_SKINS] as const;
export type HolidaySkinId = (typeof HOLIDAY_SKINS)[number];
export type SeasonSkinId = (typeof SEASON_SKINS)[number];
export type SkinId = (typeof SKIN_IDS)[number];

export const isSkinId = (value: unknown): value is SkinId => typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);

/** A calendar day as a count of days since 1970-01-01 (no time zone involved once computed). */
export type DayNumber = number;
export const dayNumber = (year: number, month: number, day: number): DayNumber => Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
export const dayParts = (n: DayNumber) => {
  const d = new Date(n * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

/** Western (Gregorian) Easter Sunday, anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** US Thanksgiving: the fourth Thursday of November (Nov 22–28). */
export function thanksgivingDay(year: number): number {
  const weekdayOfNov1 = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // 0 = Sunday … 4 = Thursday
  const firstThursday = 1 + ((4 - weekdayOfNov1 + 7) % 7);
  return firstThursday + 21;
}

/** The holiday date ("anchor") in a given year plus the window offsets in days around it (inclusive). */
const HOLIDAYS: Record<HolidaySkinId, { anchor: (year: number) => DayNumber; before: number; after: number }> = {
  halloween: { anchor: (y) => dayNumber(y, 10, 31), before: 7, after: 7 }, // Oct 24 – Nov 7
  thanksgiving: { anchor: (y) => dayNumber(y, 11, thanksgivingDay(y)), before: 7, after: 3 }, // short tail: Christmas warm-up follows
  christmas: { anchor: (y) => dayNumber(y, 12, 25), before: 7, after: 3 }, // Dec 18 – 28
  "new-year": { anchor: (y) => dayNumber(y, 1, 1), before: 3, after: 6 }, // Dec 29 – Jan 7
  valentines: { anchor: (y) => dayNumber(y, 2, 14), before: 7, after: 7 }, // Feb 7 – 21
  "st-patricks": { anchor: (y) => dayNumber(y, 3, 17), before: 7, after: 7 }, // Mar 10 – 24
  easter: { anchor: (y) => { const e = easterSunday(y); return dayNumber(y, e.month, e.day); }, before: 7, after: 7 },
  "july-4": { anchor: (y) => dayNumber(y, 7, 4), before: 7, after: 7 }, // Jun 27 – Jul 11
};

export function holidayWindow(id: HolidaySkinId, year: number): { from: DayNumber; anchor: DayNumber; until: DayNumber } {
  const h = HOLIDAYS[id];
  const anchor = h.anchor(year);
  return { from: anchor - h.before, anchor, until: anchor + h.after };
}

export function seasonFor(month: number): SeasonSkinId {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

/** Skin for a calendar day (year, month 1–12, day). Every day has one: a holiday if a window is open, else the season. */
export function skinForDay(year: number, month: number, day: number): SkinId {
  const today = dayNumber(year, month, day);
  let best: { id: HolidaySkinId; distance: number; upcoming: boolean } | null = null;
  for (const id of HOLIDAY_SKINS) {
    // Windows can wrap the year (New Year), so check the holiday in the neighboring years too.
    for (const y of [year - 1, year, year + 1]) {
      const w = holidayWindow(id, y);
      if (today < w.from || today > w.until) continue;
      const distance = Math.abs(w.anchor - today);
      const upcoming = w.anchor >= today;
      if (!best || distance < best.distance || (distance === best.distance && upcoming && !best.upcoming)) best = { id, distance, upcoming };
    }
  }
  return best ? best.id : seasonFor(month);
}

const NY_PARTS = new Intl.DateTimeFormat("en-US", { timeZone: SKIN_TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" });

/** The calendar day in New York at an instant. */
export function nyDay(now: Date): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(NY_PARTS.formatToParts(now).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

export function skinAt(now: Date): SkinId {
  const { year, month, day } = nyDay(now);
  return skinForDay(year, month, day);
}

/** "YYYY-MM-DD" → day parts, or null (strict: real calendar dates only). */
export function parseSkinDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const back = dayParts(dayNumber(year, month, day));
  return back.year === year && back.month === month && back.day === day ? back : null;
}

/**
 * Skin for a request. `override` comes from ?skin= / ?skinDate= and is only honored when overrides are enabled
 * (non-production builds, or SKIN_OVERRIDE_ENABLED=1). `envDate` is SKIN_DATE (E2E / preview; never set in production).
 */
export function resolveSkin(opts: { now: Date; envDate?: string | null; override?: { skin?: string | null; date?: string | null } | null }): { skin: SkinId; overridden: boolean } {
  const o = opts.override;
  if (o) {
    if (isSkinId(o.skin)) return { skin: o.skin, overridden: true };
    const d = parseSkinDate(o.date);
    if (d) return { skin: skinForDay(d.year, d.month, d.day), overridden: true };
  }
  const env = parseSkinDate(opts.envDate);
  if (env) return { skin: skinForDay(env.year, env.month, env.day), overridden: false };
  return { skin: skinAt(opts.now), overridden: false };
}
