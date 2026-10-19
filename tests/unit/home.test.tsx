import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/[locale]/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("home targets spot the difference with a playable board in the first screen (not a hub)", () => {
  render(HomePage());
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Spot the Difference");
  const hero = screen.getByTestId("kw-hero");
  const board = within(hero).getByTestId("quick-board");
  // Server-rendered, enabled cells: the board is playable from the first paint (tap = start in place).
  const cells = within(board).getAllByTestId("quick-cell");
  expect(cells).toHaveLength(16);
  expect(cells.every((cell) => !(cell as HTMLButtonElement).disabled)).toBe(true);
  expect(board).toHaveAttribute("data-phase", "demo");
  expect(within(board).getByTestId("quick-demo")).toBeInTheDocument();
  // No button on the board other than its cells (mobile: nothing covers the touch area).
  expect(within(board).queryByTestId("quick-start")).toBeNull();
  expect(within(board).getAllByRole("button")).toHaveLength(16);
  expect(screen.queryByTestId("game-list")).toBeNull();
  // No crawlable link to the hidden platform hub.
  expect([...document.querySelectorAll("a")].map((a) => a.getAttribute("href"))).not.toContain("/games");
});

test("home JSON-LD: VideoGame + FAQPage (with the AI question) + WebSite/Organization with the brand", () => {
  const { container } = render(HomePage());
  const blocks = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!) as Record<string, unknown>[];
  const types = blocks.map((block) => block["@type"]);
  expect(types).toEqual(expect.arrayContaining(["VideoGame", "FAQPage", "WebSite", "Organization"]));
  const faq = blocks.find((block) => block["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
  expect(faq.mainEntity.map((q) => q.name)).toContain("Can I play spot the difference against AI?");
  expect(blocks.find((block) => block["@type"] === "WebSite")!.name).toBe("Spot The Difference Game");
});

test("home hero v2: exactly one primary CTA, keyword lede, keyword-anchored internal link and five theme cards (+ seasonal)", async () => {
  const { container } = render(HomePage());
  const hero = screen.getByTestId("kw-hero");
  const primaries = container.querySelectorAll(".primary-action");
  expect(primaries).toHaveLength(1);
  expect(primaries[0]).toHaveTextContent(/^▶ Play Spot the Difference20 levels · vs AI$/);
  expect(hero.contains(primaries[0])).toBe(true);
  expect(within(hero).getByText(/^Spot the difference before the AI does\. Find the one picture that's different in 20 free levels — no download, right in your browser\.$/)).toBeInTheDocument();
  const more = screen.getByTestId("kw-more");
  const link = within(more).getByRole("link");
  expect(link).toHaveTextContent(/^spot the difference game$/);
  expect(link).toHaveAttribute("href", "/spot-the-difference-game");
  const themes = within(screen.getByTestId("kw-themes")).getAllByRole("link").map((a) => a.getAttribute("href"));
  const { themeCards } = await import("@/content/keyword-pages");
  expect(themes).toEqual(themeCards().map((card) => card.href));
  expect(themes.slice(-5)).toEqual(["/easy", "/hard", "/for-kids", "/christmas", "/pictures"]);
  // Honest difficulty copy, no stale "humans still win" claim.
  expect(container).toHaveTextContent(/The AI gets brutal around level \d+/);
  expect(container).not.toHaveTextContent(/still win/i);
});

test("header: no Play button, a plain 'Levels' text link to the 20-level game page", () => {
  const { container } = render(HomePage());
  const header = container.querySelector(".site-header")!;
  expect(header.querySelector(".nav-cta, .primary-action")).toBeNull();
  const levels = header.querySelector("a.nav-levels")!;
  expect(levels).toHaveTextContent("Levels");
  expect(levels).toHaveAttribute("href", "/spot-the-difference-game");
});

test("difficulty copy cites the level where the sim-AI curve's last band starts", async () => {
  const { FORMAL_DIFFICULTY } = await import("@/config/ai-difficulty");
  const { AI_BRUTAL_FROM_LEVEL } = await import("@/content/ai-curve");
  expect(AI_BRUTAL_FROM_LEVEL).toBe(FORMAL_DIFFICULTY.bands.at(-1)!.fromLevel);
  const { container } = render(HomePage());
  expect(container).toHaveTextContent(`The AI gets brutal around level ${AI_BRUTAL_FROM_LEVEL}`);
});
