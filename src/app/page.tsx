import { HomeRaceAnimation } from "@/components/HomeRaceAnimation";
import { StartButton } from "@/components/StartButton";

export default function HomePage() {
  return (
    <main className="mobile-shell landing one-screen">
      <div className="brand">HUMAN / AI</div>
      <section className="hero">
        <h1>
          你比 AI
          <br />
          更快吗？
        </h1>
        <p>
          大家来找茬：找出唯一不同。
          <br />
          和真实 AI 同场比快。
        </p>
        <HomeRaceAnimation />
      </section>
      <div className="actions">
        <StartButton />
        <p className="footnote">
          <span>找出唯一不同</span>
          <span className="visually-hidden"> · </span>
          <span>全服同题</span>
        </p>
      </div>
    </main>
  );
}
