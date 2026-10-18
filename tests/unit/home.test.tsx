import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/[locale]/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("home targets spot the difference with a playable board in the first screen (not a hub)", () => {
  render(HomePage());
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Spot the Difference");
  const hero = screen.getByTestId("kw-hero");
  const board = within(hero).getByTestId("quick-board");
  expect(within(board).getAllByTestId("quick-cell")).toHaveLength(16);
  expect(within(board).getByTestId("quick-start")).toBeInTheDocument();
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
