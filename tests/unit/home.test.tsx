import { render, screen } from "@testing-library/react";
import HomePage from "@/app/[locale]/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("shows the approved one-action landing page", async () => {
  render(await HomePage({ params: Promise.resolve({ locale: "zh" }) }));
  expect(screen.getByText("HUMAN VS AI")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /你比 AI\s*更快吗/ })).toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "开始挑战" })).toBeInTheDocument();
  expect(screen.getByText("找出唯一不同")).toBeInTheDocument();
  expect(screen.getByText("全服同题")).toBeInTheDocument();
  expect(screen.getByTestId("home-race")).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/命|20 关/);
});
