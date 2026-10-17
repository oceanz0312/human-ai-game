import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/[locale]/page";
import { liveGames, plannedGames } from "@/games/registry";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("home is the platform hub, listing every registry game", async () => {
  render(await HomePage({ params: Promise.resolve({ locale: "zh" }) }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/人类 VS AI.*和真实 AI 同场对战/);
  const list = screen.getByTestId("game-list");
  expect(within(list).getAllByTestId("game-card")).toHaveLength(liveGames().length);
  expect(within(list).getByRole("link", { name: "大家来找茬" })).toHaveAttribute("href", "/zh/spot-the-difference");
  // planned placeholders + the generic “more games” card, all clearly 筹备中
  const planned = within(list).getAllByTestId("planned-card");
  expect(planned).toHaveLength(plannedGames.length + 1);
  for (const card of planned) expect(card).toHaveTextContent("筹备中");
  expect(within(list).getAllByText("暂定名")).toHaveLength(plannedGames.length);
  expect(screen.getByRole("button", { name: "开始挑战" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "怎么玩" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "常见问题" })).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/命|20 关/);
});

test("home JSON-LD carries WebSite, Organization and an ItemList of live games only", async () => {
  const { container } = render(await HomePage({ params: Promise.resolve({ locale: "en" }) }));
  const blocks = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!) as { "@type": string; itemListElement?: { name: string }[] }[];
  const types = blocks.map((block) => block["@type"]);
  expect(types).toEqual(expect.arrayContaining(["WebSite", "Organization", "ItemList"]));
  const list = blocks.find((block) => block["@type"] === "ItemList")!;
  expect(list.itemListElement!.map((item) => item.name)).toEqual(["Spot the Difference"]);
});
