import { describe, expect, it } from "vitest";
import { resultGrid, resultGridText, streaks } from "@/core/fx/result-grid";
import { isMuted, setMuted } from "@/core/fx/sfx";

describe("core FX / share kit", () => {
  it("renders a Wordle-style grid, 10 per row", () => {
    const outcomes = [...Array(10).fill("human"), "ai", "none", "void"] as const;
    expect(resultGrid([...outcomes])).toBe(`${"🟥".repeat(10)}\n🟦⬛⬜`);
    expect(resultGridText({ title: "HUMAN VS AI", summary: "Level 3", outcomes: ["human", "ai"], url: "https://x.test" })).toBe("HUMAN VS AI\nLevel 3\n🟥🟦\nhttps://x.test");
  });

  it("tracks combo (consecutive correct) and streak (consecutive wins)", () => {
    expect(
      streaks([
        { humanCorrect: true, winner: "human" },
        { humanCorrect: true, winner: "ai" },
        { humanCorrect: true, winner: "human" },
        { humanCorrect: true, winner: "human" },
      ]),
    ).toEqual({ combo: 4, streak: 2 });
    expect(streaks([{ humanCorrect: true, winner: "human" }, { humanCorrect: false, winner: "ai" }])).toEqual({ combo: 0, streak: 0 });
  });

  it("SFX are on by default and the mute choice persists", () => {
    window.localStorage.clear();
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(window.localStorage.getItem("hai.sfx.muted")).toBe("1");
    setMuted(false);
  });
});
