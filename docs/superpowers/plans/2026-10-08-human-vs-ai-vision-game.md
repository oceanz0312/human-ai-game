# HUMAN / AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready mobile H5 game in which players complete the same fixed 20 visual-search levels, race real OpenAI Decisions judgments, rank only by the highest level reached, and share a minimal result poster.

**Architecture:** Use a Next.js App Router application for the mobile UI, game HTTP APIs, leaderboard, and share image generation, plus a separately deployed Cloudflare Worker as the only OpenAI Decisions gateway. The browser calls only same-origin game APIs; the Next.js game service calls the Worker with a server-only shared secret, and the Worker holds the OpenAI key in Cloudflare Secrets. Keep game rules in pure TypeScript modules, correct answers in `server-only` modules, persistent state in LibSQL through Drizzle, and the Worker boundary behind an injectable `DecisionClient` interface.

**Tech Stack:** Node.js 22+, Next.js 16.4.0, React 19.3.0, TypeScript 7.0.2, Cloudflare Workers + Wrangler, Zod 4.6.5, Drizzle ORM 0.45.4, LibSQL client 0.18.0, Sharp 0.35.5, Vitest 5.0.3, Testing Library 16.3.3, Playwright 1.64.0.

## Global Constraints

- Mobile-first H5, primarily 360–430 CSS pixels wide in portrait orientation.
- Fixed level set `v1`: levels 1–5 are 3×3; levels 6–20 are 9×9.
- Every run starts with exactly 3 lives; an incorrect answer or timeout removes exactly 1 life.
- A failed level is never retried in the same run; continue to the next level while lives remain.
- Rankings use only the personal best `reachedLevel`; equal levels have equal rank.
- Replays are unlimited and can update the player's best reached level.
- AI uses the real OpenAI Decisions API without artificial delay; only the Cloudflare Worker can read `OPENAI_API_KEY`.
- The H5 never calls OpenAI or the Worker directly and never receives the Worker URL or shared secret.
- A Decisions choice question receives exactly 9 or 81 unique grid-position candidates, below the API limit of 255.
- `fasterThanAiCount` increases only when both answers are correct and `humanElapsedMs < aiElapsedMs`.
- AI failure, refusal, invalid output, or timeout never removes a player life and never invalidates a player result.
- Correct grid positions never enter client bundles or public level metadata.
- All public copy follows the approved minimal design; no points, inventory, accounts, rooms, or random levels.

---

## Planned File Structure

```text
src/
  app/
    api/
      leaderboard/route.ts
      results/[publicId]/route.ts
      rounds/[roundId]/route.ts
      rounds/[roundId]/ai/route.ts
      rounds/[roundId]/submit/route.ts
      sessions/route.ts
      sessions/[sessionId]/rounds/route.ts
    play/[sessionId]/page.tsx
    result/[publicId]/page.tsx
    share/[publicId]/opengraph-image.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    GameBoard.tsx
    GameHeader.tsx
    LevelReveal.tsx
    ResultSummary.tsx
    ShareActions.tsx
  game/
    contracts.ts
    rules.ts
    schemas.ts
  levels/
    public-catalog.generated.ts
  lib/
    api-client.ts
    clock.ts
  server/
    analytics.ts
    db/client.ts
    db/schema.ts
    decisions/contracts.ts
    decisions/client.ts
    game-service.ts
    levels/catalog.ts
    repositories/game-repository.ts
    repositories/leaderboard-repository.ts
    share.ts
workers/
  decisions/
    src/
      index.ts
      openai.ts
    .dev.vars.example
    tsconfig.json
    wrangler.jsonc
scripts/
  generate-levels.ts
  migrate.ts
  validate-levels.ts
public/levels/v1/
docs/design/visual-style.md
tests/
  e2e/game.spec.ts
  fixtures/fake-decisions.ts
  integration/api-game.test.ts
  integration/decisions.test.ts
  integration/leaderboard.test.ts
  unit/levels.test.ts
  unit/rules.test.ts
  worker/decisions-worker.test.ts
```

Each file has one responsibility: domain rules do not access databases, repositories do not know HTTP, routes only validate and delegate, and React components do not contain game settlement logic.

---

### Task 1: Bootstrap the Full-Stack App and Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `workers/decisions/.dev.vars.example`
- Create: `workers/decisions/tsconfig.json`
- Create: `workers/decisions/wrangler.jsonc`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/unit/home.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `worker:dev`, `worker:typecheck`, `worker:deploy:preview`, `worker:deploy`, `levels:generate`, `levels:validate`, `db:generate`, and `db:migrate`.
- Produces: the `@/*` TypeScript alias for `src/*`.

- [ ] **Step 1: Write the failing homepage smoke test**

```tsx
// tests/unit/home.test.tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

test("shows the approved one-action landing page", () => {
  render(<HomePage />);
  expect(screen.getByText("HUMAN / AI")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /你比 AI 更快吗/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "开始挑战" })).toBeInTheDocument();
  expect(screen.getByText("固定 20 关 · 全服同题")).toBeInTheDocument();
});
```

- [ ] **Step 2: Create exact project dependencies and scripts**

```json
{
  "name": "human-vs-ai-vision-challenge",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev": "next dev",
    "build": "npm run levels:validate && next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "worker:dev": "wrangler dev --config workers/decisions/wrangler.jsonc",
    "worker:typecheck": "tsc --noEmit -p workers/decisions/tsconfig.json",
    "worker:deploy:preview": "wrangler deploy --env preview --config workers/decisions/wrangler.jsonc",
    "worker:deploy": "wrangler deploy --config workers/decisions/wrangler.jsonc",
    "levels:generate": "tsx scripts/generate-levels.ts",
    "levels:validate": "tsx scripts/validate-levels.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts"
  },
  "dependencies": {
    "@libsql/client": "0.18.0",
    "drizzle-orm": "0.45.4",
    "next": "16.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "sharp": "0.35.5",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@playwright/test": "1.64.0",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/node": "26.6.4",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "drizzle-kit": "0.31.11",
    "eslint": "10.12.0",
    "eslint-config-next": "16.4.0",
    "jsdom": "30.1.1",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vitest": "5.0.3",
    "wrangler": "4.44.0"
  }
}
```

Run: `npm install`
Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Add the test and framework configuration**

Configure `workers/decisions/wrangler.jsonc` with a pinned compatibility date, `nodejs_compat`, observability enabled, separate preview/production names, and no plaintext secrets. `workers/decisions/.dev.vars.example` documents `OPENAI_API_KEY` and `DECISIONS_WORKER_SHARED_SECRET`; the real `.dev.vars` is ignored. The Next.js `.env.example` documents only `DECISIONS_WORKER_URL` and `DECISIONS_WORKER_SHARED_SECRET`, never `OPENAI_API_KEY`.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://127.0.0.1:3000", ...devices["iPhone 14"] },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true },
});
```

- [ ] **Step 4: Implement the minimal landing page and global mobile shell**

```tsx
// src/app/page.tsx
"use client";

export default function HomePage() {
  return (
    <main className="mobile-shell landing">
      <div className="brand">HUMAN / AI</div>
      <section className="hero">
        <h1>你比 AI<br />更快吗？</h1>
        <p>找出唯一不同。<br />20 关，3 条命。</p>
      </section>
      <button className="primary-action" type="button">开始挑战</button>
      <p className="footnote">固定 20 关 · 全服同题</p>
    </main>
  );
}
```

- [ ] **Step 5: Run the baseline checks**

Run: `npm test -- tests/unit/home.test.tsx && npm run typecheck && npm run lint`
Expected: all three commands pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts .env.example .gitignore workers/decisions/.dev.vars.example workers/decisions/tsconfig.json workers/decisions/wrangler.jsonc src tests/setup.ts
git commit -m "chore: bootstrap mobile game app"
```

---

### Task 2: Implement Pure Game Rules

**Files:**
- Create: `src/game/contracts.ts`
- Create: `src/game/rules.ts`
- Create: `src/game/schemas.ts`
- Create: `tests/unit/rules.test.ts`

**Interfaces:**
- Produces: `resolveHumanAnswer(input: HumanAnswerInput): HumanAnswerResult`.
- Produces: `resolveRace(input: RaceInput): RaceResult`.
- Produces: `advanceSession(input: AdvanceSessionInput): AdvanceSessionResult`.
- Produces: Zod request schemas shared by route handlers.

- [ ] **Step 1: Write failing tests for lives, progression, and speed comparison**

```ts
// tests/unit/rules.test.ts
import { advanceSession, resolveHumanAnswer, resolveRace } from "@/game/rules";

test("an incorrect answer removes one life and advances", () => {
  const human = resolveHumanAnswer({ choice: "r1c1", correctChoice: "r2c2", elapsedMs: 1200, limitMs: 8000 });
  expect(human).toEqual({ status: "incorrect", correct: false, elapsedMs: 1200 });
  expect(advanceSession({ level: 4, lives: 3, humanStatus: human.status })).toEqual({
    nextLevel: 5, lives: 2, ended: false, cleared: false,
  });
});

test("the third failure ends the run at the reached level", () => {
  expect(advanceSession({ level: 8, lives: 1, humanStatus: "timeout" })).toEqual({
    nextLevel: null, lives: 0, ended: true, cleared: false,
  });
});

test("faster count increases only when both are correct and human is faster", () => {
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 2480, aiStatus: "complete", aiCorrect: true, aiElapsedMs: 2910 })).toEqual({
    winner: "human", fasterThanAi: true,
  });
  expect(resolveRace({ humanCorrect: true, humanElapsedMs: 2480, aiStatus: "complete", aiCorrect: false, aiElapsedMs: 1900 })).toEqual({
    winner: "human", fasterThanAi: false,
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/rules.test.ts`
Expected: FAIL because `@/game/rules` does not exist.

- [ ] **Step 3: Implement exact domain contracts and rules**

```ts
// src/game/contracts.ts
export type GridSize = 3 | 9;
export type HumanStatus = "correct" | "incorrect" | "timeout";
export type AiStatus = "pending" | "complete" | "error";
export type Winner = "human" | "ai" | "none" | "pending";

export interface PublicLevel {
  version: "v1";
  level: number;
  gridSize: GridSize;
  limitMs: number;
  imageUrl: string;
  choices: string[];
}
```

```ts
// src/game/rules.ts
import type { AiStatus, HumanStatus, Winner } from "./contracts";

export function resolveHumanAnswer(input: { choice: string | null; correctChoice: string; elapsedMs: number; limitMs: number }) {
  const elapsedMs = Math.max(0, Math.round(input.elapsedMs));
  if (input.choice === null || elapsedMs > input.limitMs) return { status: "timeout" as const, correct: false, elapsedMs };
  const correct = input.choice === input.correctChoice;
  return { status: correct ? "correct" as const : "incorrect" as const, correct, elapsedMs };
}

export function resolveRace(input: { humanCorrect: boolean; humanElapsedMs: number; aiStatus: AiStatus; aiCorrect: boolean | null; aiElapsedMs: number | null }): { winner: Winner; fasterThanAi: boolean } {
  if (input.aiStatus === "pending") return { winner: "pending", fasterThanAi: false };
  if (input.aiStatus === "error") return { winner: input.humanCorrect ? "human" : "none", fasterThanAi: false };
  if (input.humanCorrect && !input.aiCorrect) return { winner: "human", fasterThanAi: false };
  if (!input.humanCorrect && input.aiCorrect) return { winner: "ai", fasterThanAi: false };
  if (!input.humanCorrect && !input.aiCorrect) return { winner: "none", fasterThanAi: false };
  const fasterThanAi = input.humanElapsedMs < (input.aiElapsedMs ?? Number.POSITIVE_INFINITY);
  return { winner: fasterThanAi ? "human" : "ai", fasterThanAi };
}

export function advanceSession(input: { level: number; lives: number; humanStatus: HumanStatus }) {
  const lives = input.humanStatus === "correct" ? input.lives : input.lives - 1;
  const cleared = input.level === 20 && lives > 0;
  const ended = lives <= 0 || input.level === 20;
  return { nextLevel: ended ? null : input.level + 1, lives: Math.max(0, lives), ended, cleared };
}
```

- [ ] **Step 4: Add Zod schemas for route inputs**

```ts
// src/game/schemas.ts
import { z } from "zod";

export const startSessionSchema = z.object({ nickname: z.string().trim().max(24).optional() });
export const submitRoundSchema = z.object({
  choice: z.string().regex(/^r[1-9]c[1-9]$/).nullable(),
  elapsedMs: z.number().int().min(0).max(60_000),
});
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/rules.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game tests/unit/rules.test.ts
git commit -m "feat: add deterministic game rules"
```

---

### Task 3: Build and Validate the Frozen v1 Level Set

**Files:**
- Create: `src/server/levels/catalog.ts`
- Create: `src/levels/public-catalog.generated.ts`
- Create: `scripts/generate-levels.ts`
- Create: `scripts/validate-levels.ts`
- Create: `tests/unit/levels.test.ts`
- Create: `public/levels/v1/01.png` through `public/levels/v1/20.png` by running the generator
- Create: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: `getPrivateLevel(level: number): PrivateLevel` in a `server-only` module.
- Produces: `PUBLIC_LEVELS_V1: PublicLevel[]` with no answer field.
- Produces: deterministic PNG assets from frozen level specifications.

- [ ] **Step 1: Write failing level-invariant tests**

```ts
// tests/unit/levels.test.ts
import { PUBLIC_LEVELS_V1 } from "@/levels/public-catalog.generated";
import { PRIVATE_LEVELS_V1 } from "@/server/levels/catalog";

test("v1 has exactly twenty fixed levels", () => {
  expect(PUBLIC_LEVELS_V1).toHaveLength(20);
  expect(PRIVATE_LEVELS_V1).toHaveLength(20);
});

test.each(PRIVATE_LEVELS_V1)("level $level has a unique valid answer", (level) => {
  expect(level.choices).toHaveLength(level.gridSize ** 2);
  expect(new Set(level.choices).size).toBe(level.choices.length);
  expect(level.choices).toContain(level.correctChoice);
  expect(level.choices.length).toBeLessThanOrEqual(255);
});

test("public metadata never includes the answer", () => {
  expect(JSON.stringify(PUBLIC_LEVELS_V1)).not.toContain("correctChoice");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/unit/levels.test.ts`
Expected: FAIL because the catalogs do not exist.

- [ ] **Step 3: Define the complete frozen level specification**

```ts
// src/server/levels/catalog.ts
import "server-only";
import type { GridSize } from "@/game/contracts";

export type VisualKind = "emoji" | "color" | "arrow" | "missing-part" | "text" | "rotation" | "mirror" | "gap" | "negative-space" | "composite";

export interface PrivateLevel {
  version: "v1";
  level: number;
  gridSize: GridSize;
  limitMs: number;
  correctChoice: string;
  choices: string[];
  imageUrl: string;
  visual: { kind: VisualKind; normal: string; odd: string; contrast: number; rotation: number };
}

const positions = (size: GridSize) => Array.from({ length: size * size }, (_, index) => `r${Math.floor(index / size) + 1}c${index % size + 1}`);
const level = (levelNumber: number, gridSize: GridSize, limitMs: number, correctChoice: string, visual: PrivateLevel["visual"]): PrivateLevel => ({
  version: "v1", level: levelNumber, gridSize, limitMs, correctChoice, choices: positions(gridSize), imageUrl: `/levels/v1/${String(levelNumber).padStart(2, "0")}.png`, visual,
});

export const PRIVATE_LEVELS_V1: PrivateLevel[] = [
  level(1, 3, 8000, "r2c2", { kind: "emoji", normal: "●●", odd: "●○", contrast: 100, rotation: 0 }),
  level(2, 3, 8000, "r1c3", { kind: "color", normal: "#111111", odd: "#6D5DFC", contrast: 100, rotation: 0 }),
  level(3, 3, 7000, "r3c1", { kind: "arrow", normal: "right", odd: "left", contrast: 100, rotation: 180 }),
  level(4, 3, 7000, "r1c2", { kind: "missing-part", normal: "face-two-eyes", odd: "face-one-eye", contrast: 100, rotation: 0 }),
  level(5, 3, 6000, "r3c3", { kind: "text", normal: "O", odd: "0", contrast: 100, rotation: 0 }),
  level(6, 9, 7000, "r5c7", { kind: "color", normal: "circle", odd: "diamond", contrast: 100, rotation: 45 }),
  level(7, 9, 6500, "r2c8", { kind: "rotation", normal: "arrow-up", odd: "arrow-up", contrast: 100, rotation: 12 }),
  level(8, 9, 6000, "r7c4", { kind: "text", normal: "未", odd: "末", contrast: 100, rotation: 0 }),
  level(9, 9, 5500, "r4c6", { kind: "missing-part", normal: "box-dot", odd: "box", contrast: 100, rotation: 0 }),
  level(10, 9, 5000, "r8c2", { kind: "color", normal: "#272727", odd: "#343434", contrast: 72, rotation: 0 }),
  level(11, 9, 4800, "r3c5", { kind: "mirror", normal: "flag-right", odd: "flag-left", contrast: 100, rotation: 0 }),
  level(12, 9, 4600, "r6c9", { kind: "gap", normal: "ring-gap-top", odd: "ring-gap-right", contrast: 100, rotation: 90 }),
  level(13, 9, 4400, "r1c6", { kind: "rotation", normal: "double-line", odd: "double-line", contrast: 82, rotation: 8 }),
  level(14, 9, 4200, "r9c5", { kind: "negative-space", normal: "hole-left", odd: "hole-right", contrast: 90, rotation: 0 }),
  level(15, 9, 4000, "r5c3", { kind: "composite", normal: "three-node", odd: "two-node", contrast: 100, rotation: 0 }),
  level(16, 9, 3800, "r2c2", { kind: "text", normal: "土", odd: "士", contrast: 100, rotation: 0 }),
  level(17, 9, 3600, "r7c8", { kind: "mirror", normal: "low-contrast-hook-right", odd: "low-contrast-hook-left", contrast: 62, rotation: 0 }),
  level(18, 9, 3400, "r4c4", { kind: "composite", normal: "nodes-centered", odd: "nodes-offset", contrast: 88, rotation: 0 }),
  level(19, 9, 3200, "r8c7", { kind: "gap", normal: "micro-gap-bottom", odd: "micro-gap-left", contrast: 58, rotation: 90 }),
  level(20, 9, 3000, "r6c5", { kind: "composite", normal: "four-part-centered", odd: "four-part-shifted-2px", contrast: 72, rotation: 0 }),
];

export function getPrivateLevel(levelNumber: number) {
  const found = PRIVATE_LEVELS_V1.find((item) => item.level === levelNumber);
  if (!found) throw new Error(`Unknown v1 level: ${levelNumber}`);
  return found;
}
```

- [ ] **Step 4: Implement deterministic SVG-to-PNG generation**

`scripts/generate-levels.ts` must render a 1080×1080 SVG with a fixed 80-pixel outer margin, equal-size cells, the odd glyph at `correctChoice`, and no metadata containing the answer. Implement one explicit renderer per `VisualKind`; use bundled SVG paths and Noto Sans CJK for text instead of system fonts. Write PNGs with Sharp and generate `src/levels/public-catalog.generated.ts` by projecting only `version`, `level`, `gridSize`, `limitMs`, `imageUrl`, and `choices`.

Run: `npm run levels:generate`
Expected: twenty PNGs and one public catalog are created.

- [ ] **Step 5: Implement build-time validation**

```ts
// scripts/validate-levels.ts
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { PRIVATE_LEVELS_V1 } from "../src/server/levels/catalog";

for (const item of PRIVATE_LEVELS_V1) {
  if (item.choices.length !== item.gridSize ** 2) throw new Error(`Level ${item.level}: wrong choice count`);
  if (new Set(item.choices).size !== item.choices.length) throw new Error(`Level ${item.level}: duplicate choices`);
  if (!item.choices.includes(item.correctChoice)) throw new Error(`Level ${item.level}: answer not in choices`);
  const file = path.join(process.cwd(), "public", item.imageUrl);
  await access(file);
  if ((await stat(file)).size < 1024) throw new Error(`Level ${item.level}: image is unexpectedly small`);
}
console.log("Validated 20 frozen v1 levels");
```

- [ ] **Step 6: Run generation and tests**

Run: `npm run levels:generate && npm run levels:validate && npm test -- tests/unit/levels.test.ts`
Expected: `Validated 20 frozen v1 levels` and all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/levels src/levels scripts public/levels tests/unit/levels.test.ts THIRD_PARTY_NOTICES.md
git commit -m "feat: add frozen twenty-level catalog"
```

---

### Task 4: Add Persistent Sessions, Rounds, Results, and Rankings

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/server/db/schema.ts`
- Create: `src/server/db/client.ts`
- Create: `scripts/migrate.ts`
- Create: `src/server/repositories/game-repository.ts`
- Create: `src/server/repositories/leaderboard-repository.ts`
- Create: `tests/integration/repositories.test.ts`
- Create: `tests/helpers/test-db.ts`

**Interfaces:**
- Produces: `GameRepository` methods `createSession`, `createRound`, `claimAiRun`, `submitHumanAnswer`, `saveAiAnswer`, `finalizeSession`, and `getRoundSnapshot`.
- Produces: `LeaderboardRepository.updateBestLevel` and `getRankForPlayer`.

- [ ] **Step 1: Write failing repository integration tests**

```ts
test("best level only moves upward and equal levels share a rank", async () => {
  const first = await players.create();
  const second = await players.create();
  await leaderboard.updateBestLevel(first.id, 8);
  await leaderboard.updateBestLevel(second.id, 8);
  expect(await leaderboard.getRankForPlayer(first.id)).toEqual({ rank: 1, reachedLevel: 8 });
  await leaderboard.updateBestLevel(second.id, 10);
  expect(await leaderboard.getRankForPlayer(first.id)).toEqual({ rank: 2, reachedLevel: 8 });
  await leaderboard.updateBestLevel(first.id, 6);
  expect(await leaderboard.getRankForPlayer(first.id)).toEqual({ rank: 2, reachedLevel: 8 });
});
```

- [ ] **Step 2: Define the Drizzle schema**

Create tables `players`, `sessions`, `rounds`, and `results`. Use text UUID primary keys, integer epoch-millisecond timestamps, integer booleans, and JSON text for AI probabilities. Add unique indexes on `(session_id, level)`, `results.session_id`, and `results.public_id`. Add an index on `players.best_level`.

The `rounds` table must include `human_status`, `human_choice`, `human_elapsed_ms`, `ai_status`, `ai_started_at`, `ai_choice`, `ai_elapsed_ms`, `ai_model_elapsed_ms`, `ai_confidence`, `ai_probabilities`, and nullable `faster_than_ai`. The `sessions` table must include `level`, `lives`, `faster_than_ai_count`, `status`, and `level_set_version`.

- [ ] **Step 3: Implement transactional repositories**

Use `db.transaction` for human submission and AI completion. `claimAiRun` atomically changes `ai_status` from `pending` to `running`; a duplicate caller does not invoke the Worker. A stale `running` lease may be reclaimed only after the Worker timeout plus a safety margin. `saveAiAnswer` must set `faster_than_ai` only once; when it transitions from null to true, increment `sessions.faster_than_ai_count` exactly once. `updateBestLevel` must execute an atomic max operation rather than read-then-write.

- [ ] **Step 4: Run migration and repository tests**

Run: `DATABASE_URL=file:./test.db npm run db:generate && DATABASE_URL=file:./test.db npm run db:migrate && npm test -- tests/integration/repositories.test.ts`
Expected: migration succeeds and all repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts src/server/db src/server/repositories scripts/migrate.ts tests/helpers tests/integration/repositories.test.ts drizzle
git commit -m "feat: persist game sessions and rankings"
```

---

### Task 5: Add the Cloudflare Decisions Gateway and Server-Side Client

**Files:**
- Create: `src/server/decisions/contracts.ts`
- Create: `workers/decisions/src/openai.ts`
- Create: `workers/decisions/src/index.ts`
- Create: `src/server/decisions/client.ts`
- Create: `tests/fixtures/fake-decisions.ts`
- Create: `tests/worker/decisions-worker.test.ts`
- Create: `tests/integration/decisions.test.ts`
- Modify: `.env.example`
- Modify: `workers/decisions/.dev.vars.example`

**Interfaces:**
- Produces: `POST /v1/decide` on the Worker, authenticated with `Authorization: Bearer <DECISIONS_WORKER_SHARED_SECRET>`.
- Produces: `DecisionClient.decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult>` in the game service.
- Produces: `createCloudflareDecisionClient(env)` and `FakeDecisionClient`; the Next.js application contains no OpenAI client or OpenAI key.

- [ ] **Step 1: Write failing Worker boundary tests**

Cover these cases before implementation: missing/wrong bearer secret returns 401; non-POST returns 405; malformed JSON, image over 4 MiB, non-PNG/JPEG data URL, duplicate choices, or a choice count other than 9/81 returns 400/413; valid input sends one image and every candidate to OpenAI; refusal, timeout, invalid choice, 429, and 5xx become a stable error response; logs never contain authorization headers, OpenAI keys, or image data.

```ts
test("forwards a validated 9-cell puzzle without exposing secrets", async () => {
  const openAiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    model: "gpt-6-luna",
    answers: [{ type: "choice", name: "odd_cell", choice: "r2c2", confidence: 0.91,
      probabilities: [{ value: "r2c2", probability: 0.91 }] }],
  }), { status: 200 }));
  const handler = createWorkerHandler({ fetchImpl: openAiFetch, now: () => 1000 });
  const response = await handler.fetch(makeAuthenticatedRequest(validNineCellBody), testEnv);
  expect(response.status).toBe(200);
  expect(JSON.stringify(await response.json())).not.toContain("OPENAI_API_KEY");
  expect(JSON.parse(openAiFetch.mock.calls[0][1].body).questions[0].choices).toHaveLength(9);
});
```

- [ ] **Step 2: Define one shared wire contract**

```ts
export interface DecisionInput { imageDataUrl: string; choices: string[] }
export interface WorkerDecisionResponse {
  status: "complete" | "error";
  choice: string | null;
  confidence: number | null;
  probabilities: Record<string, number>;
  modelElapsedMs: number;
  errorCode: string | null;
  requestId: string;
}

export interface DecisionResult extends WorkerDecisionResponse { elapsedMs: number }

export interface DecisionClient {
  decide(input: DecisionInput, signal: AbortSignal): Promise<DecisionResult>;
}
```

Place the Zod request/response schemas and inferred TypeScript types in `src/server/decisions/contracts.ts`; both the server-only client and Worker import this one source. Client components must not import it. The wire response carries `modelElapsedMs`, measured inside the Worker around the OpenAI call. The server-side client measures `elapsedMs` around the full game service → Worker → OpenAI → Worker → game service request; this end-to-end value is used for the player/AI speed comparison. The Worker request contains only the rasterized level image and 9 or 81 position candidates. It never receives the correct answer, player identity, nickname, session history, database credentials, or leaderboard data.

- [ ] **Step 3: Implement the Worker OpenAI adapter**

The OpenAI body must use model `gpt-6-luna`, one user message with one inline `input_image`, and one choice question named `odd_cell`. Each option is `{ value: "rNcN", description: "row N, column N" }`. Validate that the returned choice exists in the supplied set. Measure `modelElapsedMs` only around the Worker → OpenAI request. Use an 8-second abort timeout and do not automatically retry a request after it may have reached OpenAI. Map refusals, invalid responses, network errors, 429, and 5xx to allowlisted error codes without exposing response bodies or secrets.

- [ ] **Step 4: Implement the authenticated Worker handler**

Accept only `POST /v1/decide`; require the shared bearer secret; validate content type, a maximum 4 MiB request body, a PNG/JPEG data URL, and exactly 9 or 81 unique `rNcN` candidates. Return JSON with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and an `X-Request-Id`. Do not add permissive CORS headers because browsers are not clients of this service. Log only request ID, status, elapsed milliseconds, choice count, and allowlisted error code.

- [ ] **Step 5: Implement the Next.js server-side Worker client and fake**

`createCloudflareDecisionClient` reads `DECISIONS_WORKER_URL` and `DECISIONS_WORKER_SHARED_SECRET` only from the server environment, calls `/v1/decide`, validates the response schema, measures the end-to-end request as `elapsedMs`, forwards the caller's abort signal, and maps Worker unavailability, 401, invalid JSON, or invalid response shape to `status: "error"`. It must never fall back to calling OpenAI directly. `FakeDecisionClient` remains deterministic for unit and E2E tests.

- [ ] **Step 6: Document and configure secrets**

Game service `.env.example`:

```dotenv
DECISIONS_WORKER_URL=https://human-ai-decisions.<account>.workers.dev
DECISIONS_WORKER_SHARED_SECRET=replace-with-at-least-32-random-bytes
DATABASE_URL=file:./local.db
DATABASE_AUTH_TOKEN=
RESULT_SIGNING_SECRET=replace-with-at-least-32-random-bytes
```

Worker `workers/decisions/.dev.vars.example`:

```dotenv
OPENAI_API_KEY=
DECISIONS_WORKER_SHARED_SECRET=replace-with-the-same-server-only-secret
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DECISIONS_MODEL=gpt-6-luna
OPENAI_DECISIONS_TIMEOUT_MS=8000
```

Production setup uses `wrangler secret put OPENAI_API_KEY` and `wrangler secret put DECISIONS_WORKER_SHARED_SECRET`; plaintext values never enter `wrangler.jsonc`, Git, browser bundles, or browser requests.

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/worker/decisions-worker.test.ts tests/integration/decisions.test.ts && npm run worker:typecheck`
Expected: Worker validation/authentication, exact OpenAI request shape, server-side client contract, refusal, invalid-choice, timeout, 429, and 5xx tests pass.

- [ ] **Step 8: Commit**

```bash
git add workers/decisions/src workers/decisions/.dev.vars.example src/server/decisions tests/fixtures tests/worker tests/integration/decisions.test.ts .env.example
git commit -m "feat: add Cloudflare Decisions gateway"
```

---

### Task 6: Implement the Game Application Service

**Files:**
- Create: `src/server/game-service.ts`
- Create: `tests/integration/game-service.test.ts`

**Interfaces:**
- Consumes: `GameRepository`, `LeaderboardRepository`, `DecisionClient`, and `getPrivateLevel`.
- Produces: `createSession`, `startNextRound`, `runAiForRound`, `submitRound`, `getRound`, and `getResult`.

- [ ] **Step 1: Write failing service scenarios**

Cover these exact scenarios: new session starts with level 1 and 3 lives; round start returns public metadata only; incorrect answer advances and removes one life; third failure finalizes the result; level 20 finalizes regardless of remaining lives; AI error does not modify life; a late AI answer can update `fasterThanAiCount` once; duplicate human submission returns the original settlement; concurrent AI route calls claim one lease and invoke the Worker once.

- [ ] **Step 2: Implement service methods with dependency injection**

```ts
export interface GameServiceDeps {
  games: GameRepository;
  leaderboard: LeaderboardRepository;
  decisions: DecisionClient;
  now: () => number;
  readLevelImage: (level: number) => Promise<string>;
}

export function createGameService(deps: GameServiceDeps) {
  return {
    createSession,
    startNextRound,
    runAiForRound,
    submitRound,
    getRound: async (roundId: string) => deps.games.getRoundSnapshot(roundId),
    getResult: async (publicId: string) => deps.games.getResult(publicId),
  };
}
```

Implement the four named functions with these exact boundaries:

- `createSession`: resolve or create the anonymous player, create one `v1` session at level 1 with 3 lives, and return the authoritative session snapshot.
- `startNextRound`: reject finished sessions or a second active round, load the private level only on the server, create the round with a server deadline, and return public level metadata without `correctChoice`.
- `runAiForRound`: atomically claim the AI lease, return the current snapshot immediately when another caller owns it, otherwise load the rasterized image, call the injected `DecisionClient` once, persist the normalized result once, and return the updated round snapshot. It never calls OpenAI directly; production dependency injection supplies `createCloudflareDecisionClient`.
- `submitRound`: compare the first submitted choice with the private answer, use the Task 2 rules to compute life/advance state, persist human settlement transactionally, finalize results and update the level-only leaderboard when ended, then return the authoritative snapshot. Duplicate submission returns the first settlement unchanged.

Do not add HTTP, React, Cloudflare, or OpenAI-specific dependencies to this file.

- [ ] **Step 3: Run service tests**

Run: `npm test -- tests/integration/game-service.test.ts`
Expected: all nine scenarios pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/game-service.ts tests/integration/game-service.test.ts
git commit -m "feat: orchestrate game sessions and AI races"
```

---

### Task 7: Expose Typed HTTP Routes

**Files:**
- Create: `src/server/container.ts`
- Create: `src/app/api/sessions/route.ts`
- Create: `src/app/api/sessions/[sessionId]/rounds/route.ts`
- Create: `src/app/api/rounds/[roundId]/ai/route.ts`
- Create: `src/app/api/rounds/[roundId]/submit/route.ts`
- Create: `src/app/api/rounds/[roundId]/route.ts`
- Create: `src/app/api/results/[publicId]/route.ts`
- Create: `tests/integration/api-game.test.ts`

**Interfaces:**
- Produces: stable JSON contracts consumed by `src/lib/api-client.ts` in Task 8.

- [ ] **Step 1: Write failing route tests with real `Request` objects**

Assert exact status codes: 201 session created; 201 round created; 200 AI complete/error payload; 200 first or duplicate submit; 404 unknown IDs; 409 starting a second active round; 400 malformed choice or elapsed time.

- [ ] **Step 2: Implement thin route handlers**

```ts
// src/app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { startSessionSchema } from "@/game/schemas";
import { gameService } from "@/server/container";

export async function POST(request: Request) {
  const parsed = startSessionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const session = await gameService.createSession(parsed.data);
  return NextResponse.json(session, { status: 201 });
}
```

All other handlers follow the same pattern: validate, delegate once, map typed domain errors to 400/404/409, and never expose stack traces or secret fields.

- [ ] **Step 3: Run API integration tests**

Run: `npm test -- tests/integration/api-game.test.ts`
Expected: all route contract tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/container.ts src/app/api tests/integration/api-game.test.ts
git commit -m "feat: expose game HTTP API"
```

---

### Task 8: Build the Minimal Mobile H5 Game Experience

**Files:**
- Create: `src/lib/api-client.ts`
- Create: `src/lib/clock.ts`
- Create: `src/components/GameBoard.tsx`
- Create: `src/components/GameHeader.tsx`
- Create: `src/components/LevelReveal.tsx`
- Create: `src/app/play/[sessionId]/page.tsx`
- Create: `tests/unit/game-board.test.tsx`
- Create: `tests/unit/play-flow.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 7 JSON routes.
- Produces: a client state machine with states `loading`, `countdown`, `playing`, `submitting`, `reveal`, and `ended`.

- [ ] **Step 1: Write failing component tests**

Test that a 9×9 level renders 81 buttons, only the first tap is accepted, the visible timer counts down, AI status does not reveal an answer before submission, timeout submits `choice: null`, and the reveal displays both elapsed times only after player lock-in.

- [ ] **Step 2: Implement the API client**

```ts
export async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `http_${response.status}`);
  return body as T;
}
```

- [ ] **Step 3: Implement accessible grid interaction**

`GameBoard` receives `gridSize`, `disabled`, and `onChoose(choice)`. Render CSS Grid buttons in row-major order, each with `aria-label="第 N 行第 M 列"`. The visible mark is part of the single level image positioned behind a transparent interaction grid, ensuring the player and AI see the same rasterized puzzle.

- [ ] **Step 4: Implement the play state machine**

On round creation, preload `imageUrl`. After load, enter `playing`, record `performance.now()`, and fire the AI route without awaiting it. On tap or zero countdown, lock the input, submit once, wait up to 1500 ms for the AI request, fetch the round snapshot, show `LevelReveal`, then start the next round or navigate to `/result/{publicId}`.

The AI route is a same-origin Next.js endpoint. Browser code must not read `DECISIONS_WORKER_URL`, import server-only Worker credentials, or send requests to `workers.dev` or `api.openai.com`.

- [ ] **Step 5: Apply the approved visual system**

Implement [`docs/design/visual-style.md`](../../design/visual-style.md) as the authoritative visual contract. Define its colors, typography, spacing, radius, safe-area, button, board, loading, error, result, poster, motion, and reduced-motion rules as CSS custom properties and shared classes. Do not introduce unapproved gradients, cards, shadows, navigation, semantic red/green panels, or a second primary action.

- [ ] **Step 6: Run component tests and a mobile screenshot check**

Run: `npm test -- tests/unit/game-board.test.tsx tests/unit/play-flow.test.tsx`
Expected: PASS.

Run: `npm run dev`, then capture the five required views from `docs/design/visual-style.md` at 375×812, 390×844, and 430×932.
Expected: no horizontal scroll or text clipping; all 81 touch cells fit and align with the raster; primary actions remain reachable; purple appears only in the AI status; screenshot review matches the approved hierarchy.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components src/lib tests/unit/game-board.test.tsx tests/unit/play-flow.test.tsx
git commit -m "feat: build minimal mobile game flow"
```

---

### Task 9: Add the Level-Only Global Leaderboard

**Files:**
- Create: `src/app/api/leaderboard/route.ts`
- Create: `src/components/Leaderboard.tsx`
- Create: `tests/integration/leaderboard.test.ts`
- Create: `tests/unit/leaderboard.test.tsx`
- Modify: `src/app/result/[publicId]/page.tsx`

**Interfaces:**
- Produces: `GET /api/leaderboard?version=v1&limit=100`.
- Response rows: `{ rank, nickname, reachedLevel }`; no time, lives, or correctness sort keys.

- [ ] **Step 1: Write failing tie-rank tests**

```ts
expect(await queryLeaderboard()).toEqual([
  { rank: 1, nickname: "A", reachedLevel: 20 },
  { rank: 2, nickname: "B", reachedLevel: 10 },
  { rank: 2, nickname: "C", reachedLevel: 10 },
  { rank: 4, nickname: "D", reachedLevel: 8 },
]);
```

- [ ] **Step 2: Implement ranking with `1 + count(bestLevel > row.bestLevel)`**

Use the stable first-achieved timestamp only for list ordering inside a tie. Return identical `rank` values for all equal levels. Do not accept a sort parameter.

- [ ] **Step 3: Add the compact result-page leaderboard**

Show the current player's tied rank and at most ten surrounding rows. Do not place a leaderboard link on the gameplay screen.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/integration/leaderboard.test.ts tests/unit/leaderboard.test.tsx`
Expected: PASS, including tied level-20 players.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/leaderboard src/components/Leaderboard.tsx src/app/result tests/integration/leaderboard.test.ts tests/unit/leaderboard.test.tsx
git commit -m "feat: add level-only global leaderboard"
```

---

### Task 10: Build Results, Signed Sharing, and the 9:16 Poster

**Files:**
- Create: `src/server/share.ts`
- Create: `src/components/ResultSummary.tsx`
- Create: `src/components/ShareActions.tsx`
- Create: `src/app/result/[publicId]/page.tsx`
- Create: `src/app/share/[publicId]/page.tsx`
- Create: `src/app/share/[publicId]/opengraph-image.tsx`
- Create: `tests/unit/share.test.ts`
- Create: `tests/e2e/share.spec.ts`

**Interfaces:**
- Produces: `shareHeadline(result)` and `verifyPublicResultId(publicId)`.
- Produces: downloadable 1080×1920 PNG and dynamic Open Graph image.

- [ ] **Step 1: Write failing share-copy tests**

```ts
expect(shareHeadline({ reachedLevel: 8, fasterThanAiCount: 3, cleared: false })).toBe("我有 3 关比 AI 更快");
expect(shareHeadline({ reachedLevel: 5, fasterThanAiCount: 0, cleared: false })).toBe("我到达了第 5 关");
expect(shareHeadline({ reachedLevel: 20, fasterThanAiCount: 4, cleared: true })).toBe("我通关了 HUMAN / AI");
```

- [ ] **Step 2: Implement signed public IDs**

Generate `publicId` as a random 128-bit URL-safe token stored with the result. The share endpoint loads by that opaque token; it never accepts level or faster count from query parameters. Use `RESULT_SIGNING_SECRET` to sign downloadable poster URLs with HMAC-SHA256 and reject expired signatures.

- [ ] **Step 3: Implement the approved poster**

The 9:16 image contains only brand, dynamic headline, reached level, `同样的 20 关，你能走到哪里？`, and a short game URL or QR code. Use the same black/white/purple visual language. Do not include AI confidence, detailed timing, lives, or an overall score.

- [ ] **Step 4: Implement browser sharing fallbacks**

Attempt `navigator.share({ title, text, url })`; otherwise show `保存海报` and `复制链接`. Use the Clipboard API with a hidden-textarea fallback. A poster-generation failure must leave copy-link available.

- [ ] **Step 5: Run unit and E2E tests**

Run: `npm test -- tests/unit/share.test.ts && npx playwright test tests/e2e/share.spec.ts`
Expected: all headline branches, tampered IDs, native-share fallback, poster response type, and landing-to-start flow pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/share.ts src/components/ResultSummary.tsx src/components/ShareActions.tsx src/app/result src/app/share tests/unit/share.test.ts tests/e2e/share.spec.ts
git commit -m "feat: add signed result sharing"
```

---

### Task 11: Add Recovery, Analytics, and Full E2E Coverage

**Files:**
- Create: `src/server/analytics.ts`
- Create: `src/app/api/analytics/route.ts`
- Create: `tests/e2e/game.spec.ts`
- Create: `tests/e2e/recovery.spec.ts`
- Create: `tests/e2e/leaderboard.spec.ts`
- Modify: `src/app/play/[sessionId]/page.tsx`
- Modify: `src/server/game-service.ts`
- Modify: `README.md`

**Interfaces:**
- Produces event names `game_start`, `level_shown`, `player_answered`, `ai_answered`, `level_result`, `run_end`, `replay`, `poster_generated`, `share_completed`, and `share_landing_started`.

- [ ] **Step 1: Write failing recovery E2E cases**

Cover: image load failure does not start countdown; duplicate submission does not remove two lives; refresh after round start resolves the round as timeout; backgrounding does not pause absolute deadline; AI 500/timeout/refusal shows `AI 掉线`; submit retry keeps the original choice; level 20 ends the run; three failures end at the third failed level.

- [ ] **Step 2: Implement idempotency and resume state**

Persist the active round ID in the session response. On reload, fetch it before starting another round. Keep the chosen cell in memory until submission succeeds. Every mutation returns the authoritative session snapshot so the UI can replace local life and level state.

- [ ] **Step 3: Implement server-side event ingestion**

Validate event name, anonymous player ID, session ID, level, client timestamp, and a JSON metadata object capped at 2 KB. Do not accept arbitrary SQL dimensions or record level images. Server-generated settlement events remain authoritative for survival funnels.

- [ ] **Step 4: Run the complete verification matrix**

Run: `npm run levels:validate && npm run lint && npm run typecheck && npm run worker:typecheck && npm test && npm run build && npm run test:e2e`
Expected: every command exits 0.

- [ ] **Step 5: Verify mobile layouts**

Run Playwright projects at 375×812, 390×844, and 430×932.
Expected: no horizontal scroll, no clipped 9×9 grid, no double-tap zoom requirement, and all touch targets cover their full cell.

- [ ] **Step 6: Update operator documentation**

README must document Node 22, environment variables, local database migration, level generation, test commands, Cloudflare Worker local development and deployment, secret rotation, Decisions access requirements, and the rule that changing a frozen level requires a new `levelSetVersion` and a separate leaderboard.

- [ ] **Step 7: Commit**

```bash
git add src/server/analytics.ts src/app/api/analytics src/app/play src/server/game-service.ts tests/e2e README.md
git commit -m "test: harden game recovery and analytics"
```

---

### Task 12: Final Acceptance and Release Readiness

**Files:**
- Modify: `CHANGELOG.md`
- Create: `docs/release-checklist.md`

**Interfaces:**
- Produces: a reproducible release checklist for the frozen v1 game.

- [ ] **Step 1: Run final clean-room installation**

Run: `git clean -ndx` to inspect ignored build artifacts without deleting them. In a separate temporary clone, run `npm ci`, database migration, level validation, build, unit tests, and E2E tests.
Expected: the project succeeds without untracked source files or locally generated secrets.

- [ ] **Step 2: Deploy and smoke-test the Decisions Worker**

Deploy a preview Worker with `npm run worker:deploy:preview`, set `OPENAI_API_KEY` and `DECISIONS_WORKER_SHARED_SECRET` through `wrangler secret put --env preview`, and configure the game server with the preview Worker URL and matching shared secret. Invoke one 3×3 and one 9×9 round through the game H5.
Expected: both return a candidate from the supplied set and persist probability distribution and confidence. Browser DevTools must show calls only to same-origin game APIs—never `api.openai.com`, `workers.dev`, an OpenAI key, or the Worker shared secret.

- [ ] **Step 3: Perform product acceptance**

Verify manually: landing page has one primary action; first five levels are understandable without instructions; level 6 visibly changes to 9×9; every round hides AI outcome until player lock-in; rankings ignore all fields except level; share poster contains the approved minimal fields; AI failure leaves the player's run valid.

- [ ] **Step 4: Record release notes**

`CHANGELOG.md` must list fixed 20-level v1, three-life rule, real Decisions race, level-only leaderboard, unlimited replay, and signed result sharing. `docs/release-checklist.md` must include environment, database migration, Worker deployment and rollback, Cloudflare secret provisioning and rotation, asset, smoke-test, and monitoring checks.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/release-checklist.md
git commit -m "docs: prepare v1 release checklist"
```

---

## Plan Completion Criteria

The implementation is complete only when a new anonymous player can open the mobile H5, play the fixed levels with three lives, receive real AI comparisons without early answer disclosure, finish or lose a run, obtain a tied level-only rank, replay to improve the best level, and share a signed minimal result poster. The entire flow must pass unit, Worker contract, integration, and mobile Playwright tests with OpenAI replaced by the deterministic fake client; two optional live smoke cases verify the game service → Cloudflare Worker → OpenAI path. Browser inspection must confirm that the H5 never contacts OpenAI or the Worker directly and receives neither secret.
