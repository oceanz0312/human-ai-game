"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SiteLogoLink } from "./SiteLogoLink";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/config";
import { Button, Kbd } from "@/components/ui/8bit";
import { MuteToggle } from "@/core/fx/MuteToggle";

/** Slim game bar: logo, breadcrumb, exit. `Esc` asks before leaving (the level would settle as a timeout). */
export function GameTopBar({ crumb, exitPath = "/spot-the-difference", confirmExit = true }: { crumb: string; exitPath?: string; confirmExit?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const exitHref = localePath(locale, exitPath);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      if (!confirmExit || window.confirm(t("退出本局？"))) router.push(exitHref);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmExit, exitHref, router, t]);

  return (
    <header className="game-topbar">
      <SiteLogoLink href={localePath(locale, "/")} />
      <span className="game-crumb">{crumb}</span>
      <span className="game-topbar-spacer" />
      <MuteToggle />
      <span className="game-kbd-hint">
        {t("退出")} <Kbd>Esc</Kbd>
      </span>
      <Button variant="secondary" className="game-exit" href={exitHref}>
        {t("退出")}
      </Button>
    </header>
  );
}
