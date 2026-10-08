import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  nickname: text("nickname"),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id").notNull().references(() => players.id),
    levelSetVersion: text("level_set_version").notNull(),
    level: integer("level").notNull(),
    lives: integer("lives").notNull(),
    fasterThanAiCount: integer("faster_than_ai_count").notNull().default(0),
    status: text("status", { enum: ["active", "ended"] }).notNull(),
    reachedLevel: integer("reached_level").notNull().default(1),
    cleared: integer("cleared", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    endedAt: integer("ended_at"),
  },
  (table) => [index("sessions_player_created_idx").on(table.playerId, table.createdAt)],
);

export const rounds = sqliteTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id),
    level: integer("level").notNull(),
    createdAt: integer("created_at").notNull(),
    shownAt: integer("shown_at"),
    deadlineAt: integer("deadline_at"),
    humanStatus: text("human_status", { enum: ["correct", "incorrect", "timeout"] }),
    humanChoice: text("human_choice"),
    humanElapsedMs: integer("human_elapsed_ms"),
    humanClientElapsedMs: integer("human_client_elapsed_ms"),
    humanSubmittedAt: integer("human_submitted_at"),
    aiStatus: text("ai_status", { enum: ["pending", "running", "complete", "error"] }).notNull().default("pending"),
    aiStartedAt: integer("ai_started_at"),
    aiCompletedAt: integer("ai_completed_at"),
    aiChoice: text("ai_choice"),
    aiCorrect: integer("ai_correct", { mode: "boolean" }),
    aiElapsedMs: integer("ai_elapsed_ms"),
    aiModelElapsedMs: integer("ai_model_elapsed_ms"),
    aiConfidence: real("ai_confidence"),
    aiProbabilities: text("ai_probabilities"),
    aiErrorCode: text("ai_error_code"),
    aiRequestId: text("ai_request_id"),
    winner: text("winner", { enum: ["human", "ai", "none"] }),
    fasterThanAi: integer("faster_than_ai", { mode: "boolean" }),
  },
  (table) => [uniqueIndex("rounds_session_level_idx").on(table.sessionId, table.level)],
);

export const results = sqliteTable(
  "results",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id),
    publicId: text("public_id").notNull(),
    playerId: text("player_id").notNull().references(() => players.id),
    levelSetVersion: text("level_set_version").notNull(),
    reachedLevel: integer("reached_level").notNull(),
    cleared: integer("cleared", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("results_session_idx").on(table.sessionId), uniqueIndex("results_public_idx").on(table.publicId)],
);

export const bests = sqliteTable(
  "bests",
  {
    playerId: text("player_id").notNull().references(() => players.id),
    levelSetVersion: text("level_set_version").notNull(),
    bestLevel: integer("best_level").notNull(),
    achievedAt: integer("achieved_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.playerId, table.levelSetVersion] }), index("bests_version_level_idx").on(table.levelSetVersion, table.bestLevel)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    source: text("source", { enum: ["client", "server"] }).notNull(),
    playerId: text("player_id"),
    sessionId: text("session_id"),
    level: integer("level"),
    clientTs: integer("client_ts"),
    serverTs: integer("server_ts").notNull(),
    metadata: text("metadata"),
  },
  (table) => [index("events_name_ts_idx").on(table.name, table.serverTs)],
);
