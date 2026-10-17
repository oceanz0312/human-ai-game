"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default function NotFound() {
  const locale = localeFromPathname(usePathname() ?? "/");
  const t = getDictionary(locale).notFound;
  return (
    <main className="container notfound-page">
      <div className="brand">HUMAN VS AI</div>
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
