import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/[locale]/page";
import { liveGames } from "@/games/registry";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("zh is no longer a public locale: the home renders English", async () => {
  render(await HomePage({ params: Promise.resolve({ locale: "zh" }) }));
  expect(document.body.textContent).not.toMatch(/\p{Script=Han}/u);
  expect(within(screen.getByTestId("game-list")).getAllByTestId("game-card")).toHaveLength(liveGames().length);
});

test("home JSON-LD carries WebSite, Organization and an ItemList of live games only", async () => {
  const { container } = render(await HomePage({ params: Promise.resolve({ locale: "en" }) }));
  const blocks = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!) as { "@type": string; itemListElement?: { name: string }[] }[];
  const types = blocks.map((block) => block["@type"]);
  expect(types).toEqual(expect.arrayContaining(["WebSite", "Organization", "ItemList"]));
  const list = blocks.find((block) => block["@type"] === "ItemList")!;
  expect(list.itemListElement!.map((item) => item.name)).toEqual(["Spot the Difference"]);
});
