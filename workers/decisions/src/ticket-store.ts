/// <reference types="@cloudflare/workers-types" />

export interface TicketConsumeStore {
  consume(jti: string, roundId: string, now: number): Promise<"ok" | "replayed">;
}

export function createD1TicketStore(db: D1Database): TicketConsumeStore {
  return {
    async consume(jti, roundId, now) {
      try {
        const result = await db.prepare("INSERT INTO decision_ticket_uses (jti, round_id, created_at) VALUES (?1, ?2, ?3)").bind(jti, roundId, now).run();
        return result.success ? "ok" : "replayed";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("UNIQUE") || message.includes("constraint")) return "replayed";
        throw error;
      }
    },
  };
}

export function createMemoryTicketStore(): TicketConsumeStore {
  const seen = new Set<string>();
  return {
    async consume(jti) {
      if (seen.has(jti)) return "replayed";
      seen.add(jti);
      return "ok";
    },
  };
}
