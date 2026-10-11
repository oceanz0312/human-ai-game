import { render, screen } from "@testing-library/react";
import { LevelReveal } from "@/components/LevelReveal";
import type { RoundReveal } from "@/game/contracts";

const completeRound: RoundReveal = {
  id: "r",
  level: 1,
  gridSize: 3,
  imageUrl: "/levels/v1/01.png",
  correctChoice: "r2c2",
  human: { status: "correct", choice: "r2c2", elapsedMs: 1800 },
  ai: {
    status: "complete",
    correct: true,
    elapsedMs: 2100,
    refused: false,
    choice: "r2c2",
    confidence: 0.82,
    probabilities: { r2c2: 0.71, r1c1: 0.18, r3c3: 0.04 },
    modelElapsedMs: 1600,
  },
  winner: "human",
  fasterThanAi: true,
};

test("the reveal page surfaces probability, confidence, and measured timing", () => {
  render(<LevelReveal round={completeRound} fasterThanAiCount={1} ended={false} onNext={() => undefined} />);
  expect(screen.getByTestId("reveal-board")).toBeInTheDocument();
  expect(screen.getByText(/AI 最看好/)).toHaveTextContent("第 2 行第 2 列 71%");
  expect(screen.getByText("82%")).toBeInTheDocument();
  expect(screen.getByText(/模型/)).toHaveTextContent("1.60s");
  expect(screen.getByText(/其余/)).toHaveTextContent("0.50s");
});

test("a refusal shows the dedicated copy without faking progress", () => {
  render(
    <LevelReveal
      round={{
        ...completeRound,
        ai: { status: "error", correct: null, elapsedMs: null, refused: true, choice: null, confidence: null, probabilities: null, modelElapsedMs: null },
        winner: "human",
      }}
      fasterThanAiCount={0}
      ended={false}
      onNext={() => undefined}
    />,
  );
  expect(screen.getByText("AI 放弃作答：模型未选出任何格子。")).toBeInTheDocument();
});
