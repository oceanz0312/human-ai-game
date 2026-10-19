import { render } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import PrintablePage, { generateMetadata } from "@/app/[locale]/printable/page";
import ChristmasPage from "@/app/[locale]/christmas/page";
import { answerLines, SHEETS } from "@/content/printables";
import generated from "@/content/printables.generated.json";
import { CHRISTMAS } from "@/games/spot-the-difference/quick/sprites";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("/printable: title and H1 unchanged, description is the final-copy version with 'and winter'", () => {
  const meta = generateMetadata();
  expect((meta.title as { absolute: string }).absolute).toBe("Spot the Difference Printable – Free Sheets with Answers | Spot The Difference Game");
  expect(meta.description).toBe("Free spot the difference printables with answer keys: easy, classic, Halloween, Thanksgiving, Christmas and winter sheets. Print or save as PDF for home or class.");
  const { container } = render(PrintablePage());
  expect(container.querySelector("h1")).toHaveTextContent(/^Spot the Difference Printable$/);
  expect(container.querySelector(".kw-lede")).toHaveTextContent(/^Six free sheets/);
});

test("Christmas sheet: H2 'Christmas Spot the Difference Printable' on a unique #christmas anchor, with intro and PDF downloads", () => {
  const { container } = render(PrintablePage());
  expect(container.querySelectorAll("#christmas")).toHaveLength(1);
  const sheet = container.querySelector("article#christmas")!;
  expect(sheet.querySelector("h2")).toHaveTextContent(/^Christmas Spot the Difference Printable$/);
  const intro = sheet.querySelector('[data-testid="christmas-intro"]')!;
  const words = intro.textContent!.split(/\s+/).filter(Boolean).length;
  expect(words).toBeGreaterThanOrEqual(80);
  expect(words).toBeLessThanOrEqual(100);
  expect(intro.querySelector('a[href="/christmas"]')).toHaveTextContent("online Christmas spot the difference");
  const links = [...sheet.querySelectorAll(".print-downloads a")].map((a) => [a.getAttribute("href"), a.textContent, a.hasAttribute("download")]);
  expect(links).toEqual([
    ["/printables/christmas-spot-the-difference.pdf", "⬇ Download PDF", true],
    ["/printables/christmas-spot-the-difference-answers.pdf", "Answer key (PDF)", true],
  ]);
});

test("Christmas intro only claims what the sheet really has (four grids that grow, row/column answer key, no sprite names)", () => {
  const xmas = SHEETS.find((s) => s.id === "christmas")!;
  expect(xmas.grids).toHaveLength(4);
  expect(xmas.grids[xmas.grids.length - 1]).toBeGreaterThan(xmas.grids[0]);
  expect(answerLines(xmas).every((l) => /row \d+, column \d+/.test(l))).toBe(true);
  const { container } = render(PrintablePage());
  const intro = container.querySelector('[data-testid="christmas-intro"]')!.textContent!.toLowerCase();
  expect(intro).toContain("four grids");
  for (const sprite of CHRISTMAS) expect(intro).not.toContain(sprite.name.toLowerCase());
});

test("in-page TOC: six links, each to an existing sheet id, in sheet order", () => {
  const { container } = render(PrintablePage());
  const toc = [...container.querySelectorAll('[data-testid="print-toc"] a')].map((a) => [a.getAttribute("href"), a.textContent]);
  expect(toc).toEqual([["#easy", "Easy"], ["#classic", "Classic"], ["#halloween", "Halloween"], ["#thanksgiving", "Thanksgiving"], ["#christmas", "Christmas"], ["#winter", "Winter"]]);
  for (const [href] of toc) expect(container.querySelector(`article${href}`)).not.toBeNull();
});

test("PDFs are committed, real PDFs, and match the current puzzles (regenerate with npm run printables:generate)", () => {
  const withPdf = SHEETS.filter((s) => s.pdf);
  expect(withPdf.map((s) => s.id)).toEqual(["christmas", "winter"]);
  for (const sheet of withPdf) {
    for (const url of [sheet.pdf!.sheet, sheet.pdf!.answers]) {
      const file = path.join("public", url);
      const bytes = fs.readFileSync(file);
      expect(bytes.length, url).toBeGreaterThan(5_000);
      expect(bytes.subarray(0, 5).toString(), url).toBe("%PDF-");
      expect((generated as Record<string, string[]>)[url], `${url} is stale`).toEqual(answerLines(sheet));
    }
  }
});

test("/christmas links /printable#christmas with the keyword anchor only in the FAQ and Holiday ideas", () => {
  const { container } = render(ChristmasPage());
  const links = [...container.querySelectorAll('a[href="/printable#christmas"]')];
  expect(links.map((a) => a.textContent)).toEqual(["Christmas spot the difference printable", "Christmas spot the difference printable"]);
  expect(links[0].closest("li")?.textContent).toBe("Print the Christmas spot the difference printable for a classroom party.");
  expect(links[1].closest(".faq-item")?.querySelector("summary")).toHaveTextContent("Are there printable Christmas puzzles?");
  expect(container.querySelector('.info-links a[href="/printable"]')).toHaveTextContent(/^Printable spot the difference/);
});
