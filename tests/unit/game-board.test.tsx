import { fireEvent, render, screen } from "@testing-library/react";
import { GameBoard } from "@/components/GameBoard";
import { LevelReveal } from "@/components/LevelReveal";

test("a 9×9 level renders 81 full-cell buttons in row-major order", () => {
  render(<GameBoard gridSize={9} imageUrl="/levels/v1/06.png" disabled={false} selected={null} onChoose={() => undefined} />);
  const cells = screen.getAllByRole("button");
  expect(cells).toHaveLength(81);
  expect(cells[0]).toHaveAccessibleName("第 1 行第 1 列");
  expect(cells[80]).toHaveAccessibleName("第 9 行第 9 列");
});

test("disabled boards ignore taps and the selected cell is marked", () => {
  const onChoose = vi.fn();
  const { rerender } = render(<GameBoard gridSize={3} imageUrl="/levels/v1/01.png" disabled={false} selected={null} onChoose={onChoose} />);
  fireEvent.click(screen.getByRole("button", { name: "第 2 行第 2 列" }));
  expect(onChoose).toHaveBeenCalledWith("r2c2");
  rerender(<GameBoard gridSize={3} imageUrl="/levels/v1/01.png" disabled selected="r2c2" onChoose={onChoose} />);
  fireEvent.click(screen.getByRole("button", { name: "第 1 行第 1 列" }));
  expect(onChoose).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "第 2 行第 2 列" })).toHaveAttribute("aria-pressed", "true");
});

test("no grid is rendered before the image is ready", () => {
  render(<GameBoard gridSize={3} imageUrl={null} disabled selected={null} loadingLabel="正在加载关卡" onChoose={() => undefined} />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByText("正在加载关卡")).toBeInTheDocument();
});

test("the reveal shows both elapsed times and the faster count", () => {
  render(
    <LevelReveal
      round={{ id: "r", level: 6, gridSize: 9, human: { status: "correct", choice: "r5c7", elapsedMs: 2480 }, ai: { status: "complete", correct: true, elapsedMs: 2910 }, winner: "human", fasterThanAi: true }}
      fasterThanAiCount={3}
      ended={false}
      secondsLeft={1}
      onNext={() => undefined}
    />,
  );
  expect(screen.getByRole("heading", { name: "你赢了" })).toBeInTheDocument();
  expect(screen.getByText("2.48s")).toBeInTheDocument();
  expect(screen.getByText("2.91s")).toBeInTheDocument();
  expect(screen.getByText("本局已有 3 关比 AI 更快")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "下一关 · 1" })).toBeInTheDocument();
});
