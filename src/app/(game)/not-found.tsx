import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getCookieLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";

export default async function GameNotFound() {
  const locale = await getCookieLocale();
  const t = getDictionary(locale).notFound;
  return (
    <main className="mobile-shell one-screen">
      <div className="brand">HUMAN / AI</div>
      <div className="reveal-body">
        <h1 className="page-title">{t.title}</h1>
        <p className="body-text">{t.body}</p>
      </div>
      <div className="bottom-actions">
        <Link className="primary-action link-action" href={localePath(locale, "/")}>
          {t.home}
        </Link>
      </div>
    </main>
  );
}
