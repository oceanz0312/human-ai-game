import { render } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  easterSunday,
  isSkinId,
  nyDay,
  parseSkinDate,
  resolveSkin,
  skinAt,
  skinForDay,
  SKIN_IDS,
  thanksgivingDay,
  type SkinId,
} from "@/config/skin-calendar";
import { SKINS } from "@/config/skins";
import { KEYWORD_PAGES, seasonalCard, themeCards, THEME_CARDS } from "@/content/keyword-pages";
import HomePage, { generateMetadata as homeMetadata } from "@/app/[locale]/page";
import SkinnedHomePage, { generateMetadata as skinMetadata, generateStaticParams, dynamicParams } from "@/app/[locale]/skin/[skin]/page";
import { staticSeoRoutes } from "@/seo/routes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));

/** "YYYY-MM-DD" → skin. */
const at = (ymd: string) => {
  const d = parseSkinDate(ymd)!;
  return skinForDay(d.year, d.month, d.day);
};
const expectDays = (cases: Record<string, SkinId>) => {
  for (const [day, skin] of Object.entries(cases)) expect([day, at(day)]).toEqual([day, skin]);
};

describe("skin calendar: holiday date algorithms", () => {
  test("Thanksgiving = 4th Thursday of November, 2026–2030", () => {
    expect([2026, 2027, 2028, 2029, 2030].map(thanksgivingDay)).toEqual([26, 25, 23, 22, 28]);
    for (let y = 2000; y <= 2100; y++) {
      const d = thanksgivingDay(y);
      expect(d).toBeGreaterThanOrEqual(22);
      expect(d).toBeLessThanOrEqual(28);
      expect(new Date(Date.UTC(y, 10, d)).getUTCDay()).toBe(4);
    }
  });

  test("Easter Sunday (Gregorian), incl. earliest/latest possible dates", () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
    expect(easterSunday(2028)).toEqual({ month: 4, day: 16 });
    expect(easterSunday(2029)).toEqual({ month: 4, day: 1 });
    expect(easterSunday(2030)).toEqual({ month: 4, day: 21 });
    expect(easterSunday(2038)).toEqual({ month: 4, day: 25 }); // latest possible
    expect(easterSunday(2285)).toEqual({ month: 3, day: 22 }); // earliest possible
    for (let y = 2000; y <= 2100; y++) {
      const { month, day } = easterSunday(y);
      expect(new Date(Date.UTC(y, month - 1, day)).getUTCDay()).toBe(0);
    }
  });
});

describe("skin calendar: window boundaries (day before / first / last / day after)", () => {
  test("Halloween Oct 24 – Nov 7", () => expectDays({ "2026-10-23": "fall", "2026-10-24": "halloween", "2026-10-31": "halloween", "2026-11-07": "halloween", "2026-11-08": "fall" }));
  test("Thanksgiving −7/+3 around the computed date (2026: Nov 19–29)", () => expectDays({ "2026-11-18": "fall", "2026-11-19": "thanksgiving", "2026-11-29": "thanksgiving", "2026-11-30": "fall" }));
  test("Thanksgiving window moves with the date (2030: Nov 21 – Dec 1, beats the winter season)", () => expectDays({ "2030-11-20": "fall", "2030-11-21": "thanksgiving", "2030-12-01": "thanksgiving", "2030-12-02": "winter" }));
  test("Christmas Dec 18 – 28", () => expectDays({ "2026-12-17": "winter", "2026-12-18": "christmas", "2026-12-25": "christmas", "2026-12-28": "christmas" }));
  test("New Year Dec 29 – Jan 7 across the year wrap", () => expectDays({ "2026-12-29": "new-year", "2026-12-31": "new-year", "2027-01-01": "new-year", "2027-01-07": "new-year", "2027-01-08": "winter" }));
  test("Valentine's Feb 7 – 21", () => expectDays({ "2027-02-06": "winter", "2027-02-07": "valentines", "2027-02-21": "valentines", "2027-02-22": "winter" }));
  test("St. Patrick's Mar 10 – 24 (2026, no Easter overlap)", () => expectDays({ "2026-03-09": "spring", "2026-03-10": "st-patricks", "2026-03-24": "st-patricks", "2026-03-25": "spring" }));
  test("Easter ±7 around the computed date (2026: Mar 29 – Apr 12)", () => expectDays({ "2026-03-28": "spring", "2026-03-29": "easter", "2026-04-12": "easter", "2026-04-13": "spring" }));
  test("4th of July Jun 27 – Jul 11", () => expectDays({ "2027-06-26": "summer", "2027-06-27": "july-4", "2027-07-11": "july-4", "2027-07-12": "summer" }));
  test("seasons fill the gaps: Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov fall (incl. Feb 29)", () =>
    expectDays({ "2027-02-28": "winter", "2028-02-29": "winter", "2027-03-01": "spring", "2027-05-31": "spring", "2027-06-01": "summer", "2027-08-31": "summer", "2026-09-01": "fall", "2026-11-30": "fall", "2026-12-01": "winter" }));
  test("every day of 2026–2032 has exactly one valid skin", () => {
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2033, 0, 1); t += 86_400_000) {
      const d = new Date(t);
      expect(isSkinId(skinForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()))).toBe(true);
    }
  });
});

describe("skin calendar: overlap rule (closer holiday wins)", () => {
  test("2027 St. Patrick's (Mar 17) vs Easter (Mar 28) overlap Mar 21–24", () =>
    expectDays({ "2027-03-20": "st-patricks", "2027-03-21": "st-patricks", "2027-03-22": "st-patricks", "2027-03-23": "easter", "2027-03-24": "easter", "2027-03-25": "easter", "2027-04-04": "easter", "2027-04-05": "spring" }));
  test("holidays always beat seasons", () => {
    expect(at("2026-11-01")).toBe("halloween"); // fall season
    expect(at("2026-12-20")).toBe("christmas"); // winter season
    expect(at("2027-07-04")).toBe("july-4"); // summer season
  });
});

describe("skin calendar: New York day vs UTC day", () => {
  test("UTC 2026-10-24 03:00 is still Oct 23 in New York (fall); 04:00Z is NY midnight (Halloween)", () => {
    expect(nyDay(new Date("2026-10-24T03:00:00Z"))).toEqual({ year: 2026, month: 10, day: 23 });
    expect(skinAt(new Date("2026-10-24T03:59:59Z"))).toBe("fall");
    expect(skinAt(new Date("2026-10-24T04:00:00Z"))).toBe("halloween");
  });
  test("UTC 2026-11-01 03:00 is Oct 31 in New York (EDT, UTC−4)", () => {
    expect(nyDay(new Date("2026-11-01T03:00:00Z"))).toEqual({ year: 2026, month: 10, day: 31 });
  });
  test("EST (UTC−5) in winter: Christmas starts at 05:00Z on Dec 18", () => {
    expect(skinAt(new Date("2026-12-18T04:59:59Z"))).toBe("winter");
    expect(skinAt(new Date("2026-12-18T05:00:00Z"))).toBe("christmas");
  });
  test("year wrap in New York time: 2027-01-01T04:00Z is still Dec 31; New Year ends at NY midnight Jan 8", () => {
    expect(nyDay(new Date("2027-01-01T04:00:00Z"))).toEqual({ year: 2026, month: 12, day: 31 });
    expect(skinAt(new Date("2027-01-08T04:59:59Z"))).toBe("new-year");
    expect(skinAt(new Date("2027-01-08T05:00:00Z"))).toBe("winter");
  });
  test("Thanksgiving window ends at NY midnight, not UTC midnight", () => {
    expect(skinAt(new Date("2026-11-30T04:59:59Z"))).toBe("thanksgiving"); // NY Nov 29 23:59 EST
    expect(skinAt(new Date("2026-11-30T05:00:00Z"))).toBe("fall");
  });
});

describe("test overrides", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  test("parseSkinDate accepts real YYYY-MM-DD dates only", () => {
    expect(parseSkinDate("2026-12-24")).toEqual({ year: 2026, month: 12, day: 24 });
    for (const bad of ["2026-02-30", "2026-13-01", "26-12-24", "2026-12-24T00:00", "", null, undefined]) expect(parseSkinDate(bad)).toBeNull();
  });
  test("resolveSkin: ?skin beats ?skinDate beats SKIN_DATE beats the clock; invalid values fall through", () => {
    expect(resolveSkin({ now })).toEqual({ skin: "fall", overridden: false });
    expect(resolveSkin({ now, envDate: "2026-11-26" })).toEqual({ skin: "thanksgiving", overridden: false });
    expect(resolveSkin({ now, envDate: "2026-11-26", override: { date: "2026-12-24" } })).toEqual({ skin: "christmas", overridden: true });
    expect(resolveSkin({ now, envDate: "2026-11-26", override: { skin: "summer", date: "2026-12-24" } })).toEqual({ skin: "summer", overridden: true });
    expect(resolveSkin({ now, override: { skin: "bogus", date: "nope" } })).toEqual({ skin: "fall", overridden: false });
    expect(resolveSkin({ now, envDate: "garbage" })).toEqual({ skin: "fall", overridden: false });
  });
});

describe("middleware", () => {
  afterEach(() => vi.unstubAllEnvs());
  const run = async (url: string) => (await import("@/middleware")).middleware(new NextRequest(url));

  test("rewrites / to today's prerendered variant (SKIN_DATE), URL unchanged, short shared-cache TTL", async () => {
    vi.stubEnv("SKIN_DATE", "2026-10-31");
    const res = await run("https://spotthedifferencegame.com/");
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://spotthedifferencegame.com/en/skin/halloween");
    expect(res.headers.get("x-skin")).toBe("halloween");
    expect(res.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=3600, must-revalidate");
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });

  test("/skin/* is never served under its own URL: 301 to /", async () => {
    const res = await run("https://spotthedifferencegame.com/skin/christmas");
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  test("?skin= / ?skinDate= overrides: no-store + noindex when enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIN_OVERRIDE_ENABLED", "1");
    const res = await run("https://spotthedifferencegame.com/?skinDate=2026-12-24");
    expect(res.headers.get("x-skin")).toBe("christmas");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  test("overrides are ignored in production unless SKIN_OVERRIDE_ENABLED=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIN_OVERRIDE_ENABLED", "");
    vi.stubEnv("SKIN_DATE", "2026-10-31");
    const res = await run("https://spotthedifferencegame.com/?skin=christmas&skinDate=2026-12-24");
    expect(res.headers.get("x-skin")).toBe("halloween");
    expect(res.headers.get("cache-control")).not.toContain("no-store");
  });
});

describe("home cards per skin", () => {
  test("holidays with a page put their card first: Halloween, Thanksgiving (+5 evergreen)", () => {
    expect(themeCards("halloween").map((c) => c.href)).toEqual(["/halloween", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]);
    expect(themeCards("thanksgiving").map((c) => c.href)).toEqual(["/thanksgiving", "/easy", "/hard", "/for-kids", "/christmas", "/pictures"]);
  });
  test("Christmas moves its evergreen card first without a duplicate", () => {
    expect(themeCards("christmas").map((c) => c.href)).toEqual(["/christmas", "/easy", "/hard", "/for-kids", "/pictures"]);
  });
  test("skins whose page is not built yet (winter, spring, summer, fall and their holidays) get visuals only, no dead link", () => {
    for (const skin of ["winter", "new-year", "valentines", "spring", "st-patricks", "easter", "summer", "july-4", "fall"] as const) {
      expect(KEYWORD_PAGES[SKINS[skin].page]).toBeUndefined();
      expect(seasonalCard(skin)).toBeNull();
      expect(themeCards(skin)).toEqual(THEME_CARDS);
    }
    expect(themeCards(null)).toEqual(THEME_CARDS);
  });
  test("every card href any skin can render has a route file", () => {
    for (const skin of SKIN_IDS) {
      for (const card of themeCards(skin)) expect(fs.existsSync(path.join("src/app/[locale]", card.href, "page.tsx")), card.href).toBe(true);
    }
  });
});

describe("skinned home variants", () => {
  const snapshot = (container: HTMLElement) => ({
    h1: container.querySelector("h1")!.outerHTML,
    lede: container.querySelector(".kw-lede")!.outerHTML,
    body: container.querySelector(".kw-body")!.innerHTML,
    ld: container.querySelector('script[type="application/ld+json"]')!.textContent,
    links: container.querySelector(".info-links")!.innerHTML,
    cta: container.querySelector(".primary-action")!.textContent,
  });

  test("title, meta, canonical and robots are the home page's exactly (variants are served at /)", async () => {
    const home = homeMetadata();
    expect(skinMetadata()).toEqual(home);
    expect(home.alternates?.canonical).toBe("https://spotthedifferencegame.com");
    expect(home.robots).toMatchObject({ index: true, follow: true });
    expect((home.title as { absolute: string }).absolute).toBe("Spot the Difference – Play Free Online | Spot The Difference Game");
  });

  test("H1, lede, body copy, FAQ, JSON-LD and links are identical for every skin", async () => {
    const base = snapshot(render(HomePage()).container);
    document.body.innerHTML = "";
    for (const skin of SKIN_IDS) {
      const { container, unmount } = render(await SkinnedHomePage({ params: Promise.resolve({ skin }) }));
      expect(snapshot(container), skin).toEqual(base);
      expect(container.querySelector(".site-page")!.getAttribute("data-skin")).toBe(skin);
      expect(container.querySelector('[data-testid="skin-mark"]')!.getAttribute("aria-hidden")).toBe("true");
      expect(container.querySelector(".skin-mark")!.textContent).toBe("");
      unmount();
    }
  });

  test("the base home (fallback) has no skin and the five evergreen cards", () => {
    const { container } = render(HomePage());
    expect(container.querySelector("[data-skin]")).toBeNull();
    expect(container.querySelectorAll(".kw-theme")).toHaveLength(5);
  });

  test("variants: English only, no other params, unknown skin is a 404", async () => {
    expect(dynamicParams).toBe(false);
    expect((await generateStaticParams({ params: { locale: "en" } })).map((p) => p.skin)).toEqual([...SKIN_IDS]);
    expect(await generateStaticParams({ params: { locale: "zh" } })).toEqual([]);
    await expect(SkinnedHomePage({ params: Promise.resolve({ skin: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  test("sitemap routes unchanged: no /skin variants (17 static + 1 leaderboard = 18 URLs)", () => {
    const paths = staticSeoRoutes().map((r) => r.path);
    expect(paths).toHaveLength(17);
    expect(paths.some((p) => p.includes("skin"))).toBe(false);
  });

  test("every skin has an accent color and at least one 8×8 sprite mark", () => {
    for (const skin of SKIN_IDS) {
      expect(SKINS[skin].accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(SKINS[skin].marks.length).toBeGreaterThan(0);
      for (const m of SKINS[skin].marks) expect(m.rows.every((r) => r.length === 8) && m.rows.length === 8).toBe(true);
    }
  });
});
