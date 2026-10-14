const CELLS = Array.from({ length: 9 }, (_, index) => index);
const ODD_CELL = 5;

/** Decorative ~3s loop: you and the AI race to the one odd cell. Pure CSS. */
export function HomeRaceAnimation() {
  return (
    <div className="home-race" data-testid="home-race" aria-label="示意：你和 AI 同时找不同" role="img">
      <div className="home-race-board">
        {CELLS.map((cell) => (
          <span key={cell} className={cell === ODD_CELL ? "home-race-cell is-odd" : "home-race-cell"}>
            <span className="home-race-dot" />
          </span>
        ))}
        <span className="home-race-cursor is-you" aria-hidden>
          你
        </span>
        <span className="home-race-cursor is-ai" aria-hidden>
          AI
        </span>
      </div>
      <div className="home-race-bars" aria-hidden>
        <div className="home-race-bar">
          <span className="home-race-name">你</span>
          <span className="home-race-track">
            <span className="home-race-fill is-you" />
          </span>
        </div>
        <div className="home-race-bar">
          <span className="home-race-name">AI</span>
          <span className="home-race-track">
            <span className="home-race-fill is-ai" />
          </span>
        </div>
      </div>
      <p className="home-race-caption">同一张图，谁先找到不同？</p>
    </div>
  );
}
