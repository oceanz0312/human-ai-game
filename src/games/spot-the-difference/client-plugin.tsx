"use client";

import { GameBoard } from "@/components/GameBoard";
import { RevealHeatmapBoard } from "@/components/RevealHeatmapBoard";
import type { RoundReveal } from "@/game/contracts";
import type { BoardRenderProps, ClientGamePlugin } from "@/core/client-game";
import type { PublicLevel } from "@/game/contracts";
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";

function SpotBoard({ level, ready, disabled, selected, loadingLabel, onChoose, onPainted }: BoardRenderProps<PublicLevel>) {
  return (
    <GameBoard
      gridSize={level.gridSize}
      imageUrl={ready ? level.imageUrl : null}
      disabled={disabled}
      selected={selected}
      loadingLabel={loadingLabel}
      onChoose={onChoose}
      onImagePainted={onPainted}
    />
  );
}

function SpotRevealBoard({ round }: { round: RoundReveal }) {
  return (
    <RevealHeatmapBoard
      gridSize={round.gridSize}
      imageUrl={round.imageUrl}
      probabilities={round.ai.probabilities}
      aiChoice={round.ai.choice}
      correctChoice={round.correctChoice}
      humanChoice={round.human?.choice ?? null}
    />
  );
}

export const spotTheDifferenceClient: ClientGamePlugin<PublicLevel> = {
  slug: "spot-the-difference",
  totalLevels: PUBLIC_LEVELS_V1.length,
  startingChances: 3,
  publicLevel: (level) => PUBLIC_LEVELS_V1[level - 1],
  assetUrls: (level) => [level.imageUrl],
  Board: SpotBoard,
  RevealBoard: SpotRevealBoard as unknown as ClientGamePlugin<PublicLevel>["RevealBoard"],
  title: (t) => t("大家来找茬"),
  exitPath: "/spot-the-difference",
  cardImage: (round) => (round as unknown as RoundReveal).imageUrl ?? null,
  hint: (level, t) => {
    const size = level?.gridSize ?? 3;
    return `${t("点击不同项")} · ${size}×${size}`;
  },
};
