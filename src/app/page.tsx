import { StartButton } from "@/components/StartButton";

export default function HomePage() {
  return (
    <main className="mobile-shell landing">
      <div className="brand">HUMAN / AI</div>
      <section className="hero">
        <h1>
          你比 AI
          <br />
          更快吗？
        </h1>
        <p>
          找出唯一不同。
          <br />
          20 关，3 条命。
        </p>
      </section>
      <div className="actions">
        <StartButton />
        <p className="footnote">
          <span>固定 20 关</span>
          <span className="visually-hidden"> · </span>
          <span>全服同题</span>
        </p>
      </div>
    </main>
  );
}
