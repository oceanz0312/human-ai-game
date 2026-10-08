import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("shows the approved one-action landing page", () => {
  render(<HomePage />);
  expect(screen.getByText("HUMAN / AI")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /你比 AI\s*更快吗/ })).toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "开始挑战" })).toBeInTheDocument();
  expect(screen.getByText("固定 20 关")).toBeInTheDocument();
  expect(screen.getByText("全服同题")).toBeInTheDocument();
});
