import { render, screen } from "@testing-library/react";
import { RevealHeatmapBoard } from "@/components/RevealHeatmapBoard";

test("reveal cells show picks only — no probability heat shading", () => {
  render(
    <RevealHeatmapBoard
      gridSize={3}
      imageUrl="/levels/v1/01.png"
      probabilities={{ r2c2: 0.71, r1c1: 0.18 }}
      aiChoice="r2c2"
      correctChoice="r2c2"
      humanChoice="r1c1"
    />,
  );
  const cells = screen.getByTestId("reveal-board").querySelectorAll(".heatmap-cell");
  expect(cells.length).toBe(9);
  for (const cell of cells) {
    expect(cell.getAttribute("data-heat")).toBeNull();
    expect(cell.getAttribute("style")).toBeNull();
    expect(cell.getAttribute("aria-label")).not.toMatch(/概率/);
  }
  expect(screen.getByText("AI")).toBeInTheDocument();
  expect(screen.getByText("你")).toBeInTheDocument();
});
