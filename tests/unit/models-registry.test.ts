import { describe, expect, it, vi } from "vitest";
import { aiOpponents } from "@/games/registry";
import { decisionClientForModel } from "@/models/adapters";
import { buildDecisionBody } from "@/models/adapters/openai-decisions";
import { configTemplates } from "@/models/adapters/template";
import { DEFAULT_MODEL_ID, getModel, liveModels, models, resolveModelId } from "@/models/registry";
import { buildSpotTheDifferenceTask } from "@/models/tasks/spot-the-difference";

const nine = ["r1c1", "r1c2", "r1c3", "r2c1", "r2c2", "r2c3", "r3c1", "r3c2", "r3c3"];

describe("model registry", () => {
  it("only Luna is live; the rest are coming soon", () => {
    expect(liveModels().map((m) => m.id)).toEqual(["luna"]);
    expect(getModel("jev")?.status).toBe("coming-soon");
    expect(getModel("qwen-cf")?.status).toBe("coming-soon");
    expect(new Set(models.map((m) => m.id)).size).toBe(models.length);
    expect(models.every((m) => configTemplates[m.adapter])).toBe(true);
  });

  it("resolves ?ai= only to live models", () => {
    expect(resolveModelId("luna")).toBe("luna");
    expect(resolveModelId("jev")).toBe(DEFAULT_MODEL_ID);
    expect(resolveModelId("nope")).toBe(DEFAULT_MODEL_ID);
    expect(resolveModelId(null)).toBe(DEFAULT_MODEL_ID);
  });

  it("aiOpponents pages derive from live models only", () => {
    expect(aiOpponents).toEqual([{ slug: "luna", model: "simulated", provider: "Spot The Difference Game", api: "In-game simulated AI" }]);
  });
});

describe("adapters", () => {
  it("Decisions body is built from the shared spot-the-difference task", () => {
    const body = buildDecisionBody({ imageDataUrl: "data:image/png;base64,AA==", choices: nine }, "gpt-6-luna");
    const task = buildSpotTheDifferenceTask({ imageDataUrl: "data:image/png;base64,AA==", choices: nine });
    expect(body.model).toBe("gpt-6-luna");
    expect(body.questions[0]).toEqual({ type: "choice", name: "odd_cell", instructions: task.instructions, choices: task.choices });
    expect(task.choices[4]).toEqual({ value: "r2c2", description: "row 2, column 2" });
    expect(task.instructions).toContain("3 by 3");
  });

  it("coming-soon models never make network calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const live = { decide: vi.fn() };
    const client = decisionClientForModel("jev", live);
    const result = await client.decide({ imageDataUrl: "data:image/png;base64,AA==", choices: nine }, new AbortController().signal);
    expect(result.errorCode).toBe("ai_unconfigured");
    expect(live.decide).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(decisionClientForModel("luna", live)).toBe(live);
    fetchSpy.mockRestore();
  });
});
