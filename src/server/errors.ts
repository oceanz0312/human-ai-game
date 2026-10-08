export type GameErrorCode =
  | "invalid_request"
  | "invalid_choice"
  | "not_found"
  | "session_ended"
  | "round_in_progress"
  | "round_not_started"
  | "too_many_requests";

const STATUS: Record<GameErrorCode, number> = {
  invalid_request: 400,
  invalid_choice: 400,
  not_found: 404,
  session_ended: 409,
  round_in_progress: 409,
  round_not_started: 409,
  too_many_requests: 429,
};

export class GameError extends Error {
  readonly status: number;

  constructor(readonly code: GameErrorCode) {
    super(code);
    this.status = STATUS[code];
  }
}
