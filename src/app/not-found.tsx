import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mobile-shell">
      <div className="brand">HUMAN / AI</div>
      <div className="reveal-body">
        <h1 className="page-title">找不到这个页面</h1>
        <p className="body-text">链接可能已失效。</p>
      </div>
      <div className="bottom-actions">
        <Link className="primary-action link-action" href="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}
