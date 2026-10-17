"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/8bit";

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
        <Button variant="primary" className="link-action" href={localePath(locale, "/")}>
          {t.home}
        </Button>
      </div>
    </main>
  );
}
