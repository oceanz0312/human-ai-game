"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, track } from "@/lib/api-client";
import { LOCALE_COOKIE, localePath, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { Button } from "@/components/ui/8bit";
import { unlockAudio } from "@/core/fx/sfx";
import { getPlayerKey } from "@/core/limits/player-key";
import { PlayLimitBadge, PlayLimitBlocked, usePlayLimit } from "@/core/limits/PlayLimit";
import { getGame } from "@/games/registry";

export function StartButton({
  label,
  busyLabel,
  replay = false,
  fromShare = false,
  locale,
  ai,
  game = "spot-the-difference",
  direct = false,
  sublabel,
  trackClick,
  variant = "primary",
}: {
  label?: string;
  busyLabel?: string;
  replay?: boolean;
  fromShare?: boolean;
  /** When set, remembers the player's language for the session pages (/play, /result, /share). */
  locale?: Locale;
  /** Opponent model id (opponent select / ?ai=). Server resolves it to a live model. */
  ai?: string;
  /** Game slug, for the share link on the blocked state. */
  game?: string;
  /** Start the run right away. Otherwise a fresh start goes to the opponent-select step first (D4-1). */
  direct?: boolean;
  /** Second, smaller line inside the button (e.g. "20 levels · vs AI"). */
  sublabel?: string;
  /** Analytics event sent on click, before the run is created (home hero: hero_cta_click). */
  trackClick?: { name: "hero_cta_click" | "kw_cta_click"; metadata?: Record<string, string> };
  /** Visual weight. Keyword pages demote the 20-level button to secondary: the themed board is the primary action there. */
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const t = useT();
  const currentLocale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, setStatus } = usePlayLimit();

  async function start() {
    if (busy) return;
    unlockAudio();
    setBusy(true);
    setError(null);
    if (locale) document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (fromShare) track("share_landing_started");
    if (trackClick) track(trackClick.name, { metadata: { ...trackClick.metadata, remaining: status ? status.remaining : null } });
    const entry = getGame(game);
    if (!direct && !replay && entry) {
      router.push(localePath(locale ?? currentLocale, `${entry.basePath}/play`));
      return;
    }
    try {
      const remembered = ai ?? (typeof window !== "undefined" ? (window.localStorage.getItem(`hai.opponent.${game}`) ?? undefined) : undefined);
      const session = await api.createSession({ replay, ...(remembered ? { ai: remembered } : {}), pk: getPlayerKey() });
      if (session.playLimit) setStatus(session.playLimit);
      router.push(`/play/${session.id}`);
    } catch (cause) {
      setBusy(false);
      if (cause instanceof ApiError && cause.code === "daily_limit") {
        setStatus((current) => ({ limit: current?.limit ?? 3, used: current?.limit ?? 3, remaining: 0, resetAt: current?.resetAt ?? nextMidnightUtc() }));
        return;
      }
      setError(cause instanceof ApiError && cause.status === 429 ? t("挑战太频繁了，请稍后再试。") : t("网络不稳定，请重试。"));
    }
  }

  if (status && status.limit > 0 && status.remaining <= 0 && !status.bypass) {
    const landing = getGame(game)?.landingPath ?? "/";
    const shareUrl = typeof window === "undefined" ? landing : new URL(localePath(locale ?? currentLocale, landing), window.location.origin).toString();
    return <PlayLimitBlocked status={status} shareUrl={shareUrl} onShared={() => track("share_completed", { metadata: { from: "daily_limit" } })} />;
  }

  return (
    <span className="start-stack">
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant={replay ? "text" : variant} onClick={start} disabled={busy && !replay}>
        {busy ? (busyLabel ?? t("正在开始")) : (label ?? t("开始挑战"))}
        {sublabel ? <span className="btn-sub">{sublabel}</span> : null}
      </Button>
      {replay ? null : <PlayLimitBadge status={status} />}
    </span>
  );
}

function nextMidnightUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}
