import { render } from "@testing-library/react";
import WinterPage from "@/app/[locale]/winter/page";
import PrintablePage from "@/app/[locale]/printable/page";
import ChristmasPage from "@/app/[locale]/christmas/page";
import { KEYWORD_PAGES } from "@/content/keyword-pages";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const words = (el: Element) => (el.textContent ?? "").split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;

test("/winter renders its H1, a winter board and ≥300 words of body copy", () => {
  const { container } = render(WinterPage());
  expect(container.querySelector("h1")).toHaveTextContent(/^Winter Spot the Difference$/);
  container.querySelectorAll("script").forEach((el) => el.remove());
  expect(words(container.querySelector("main")!)).toBeGreaterThanOrEqual(300);
  expect(KEYWORD_PAGES["/winter"].board.mode).toBe("winter");
});

test("/winter copy matches the code: 4×4/5×5/6×6, two pixels, the 8 winter sprites, polar bear not snowman", () => {
  const p = KEYWORD_PAGES["/winter"].sections[0].paragraphs!.join(" ");
  expect(p).toContain("4×4, 5×5 or 6×6");
  expect(p).toContain("two pixels changed");
  for (const name of ["snowflake", "mitten", "hot cocoa", "knit hat", "ice skate", "sled", "penguin", "polar bear"]) expect(p).toContain(name);
  expect(p).not.toMatch(/snowman|tree|gift|santa/i);
  expect(p).not.toContain("where Luna AI looks");
});

test("/winter: Christmas words only in the boundary FAQ; FAQ and list link the printable #winter anchor and /christmas", () => {
  const { container } = render(WinterPage());
  const body = container.querySelector(".kw-body")!;
  const boundary = [...body.querySelectorAll(".faq-item")].find((d) => d.textContent?.includes("Is this different from the Christmas page?"))!;
  expect(boundary.querySelector('a[href="/christmas"]')).toHaveTextContent("Christmas spot the difference");
  container.querySelectorAll("script").forEach((el) => el.remove()); // FAQPage JSON-LD repeats the boundary answer
  const rest = (container.querySelector("main")!.textContent ?? "").replace(boundary.textContent ?? "", "");
  expect(rest).not.toMatch(/\b(santa|trees?|gifts?|snowm[ae]n)\b/i);
  expect(body.querySelectorAll('a[href="/printable#winter"]').length).toBeGreaterThanOrEqual(2);
});

test("/printable: six sheets, each addressable by #id, Sheet 6 is winter", () => {
  const { container } = render(PrintablePage());
  const ids = [...container.querySelectorAll('[data-testid="print-sheet"]')].map((el) => el.id);
  expect(ids).toEqual(["easy", "classic", "halloween", "thanksgiving", "christmas", "winter"]);
  expect(container.querySelector("#winter h2")).toHaveTextContent("Sheet 6 · Winter");
});

test("/christmas links /halloween, /thanksgiving and /winter (seasonal ring)", () => {
  const { container } = render(ChristmasPage());
  const hrefs = [...container.querySelectorAll(".info-links a")].map((a) => a.getAttribute("href"));
  expect(hrefs).toEqual(expect.arrayContaining(["/halloween", "/thanksgiving", "/winter", "/printable"]));
});
