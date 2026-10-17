"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayLimitStatus } from "./config";
import { getPlayerKey } from "./player-key";
import { api } from "@/lib/api-client";
import { useLocale, useT } from "@/i18n/client";
import { Badge, Button } from "@/components/ui/8bit";

/** Shared across games: today's remaining runs for this browser (random player key, stored hashed). */
export function usePlayLimit() {
  const [status, setStatus] = useState<PlayLimitStatus | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStatus(await api.getPlayLimit(getPlayerKey()));
    } catch {
      // Unknown status never blocks: the server enforces the limit on start.
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch of a browser-only status
    void refresh();
  }, [refresh]);
  return { status, setStatus, refresh };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** Pixel badge: "今日剩余 2/3". */
export function PlayLimitBadge({ status }: { status: PlayLimitStatus | null }) {
  const t = useT();
  if (!status || status.limit <= 0) return null;
  return (
    <Badge className="play-limit-badge" data-testid="play-limit">
      {t("今日剩余 {left}/{limit}", { left: status.remaining, limit: status.limit })}
    </Badge>
  );
}

/** Friendly blocked state with a live reset countdown (local time) and share / come-back CTAs. */
export function PlayLimitBlocked({ status, shareUrl, onShared }: { status: PlayLimitStatus; shareUrl: string; onShared?: () => void }) {
  const t = useT();
  const locale = useLocale();
  const now = useNow(true);
  const [copied, setCopied] = useState(false);
  const resetLocal = new Date(status.resetAt).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" });

  async function share() {
    const text = t("我今天已经和 AI 打满 {n} 局了，你也来试试？", { n: status.limit });
    try {
      if (navigator.share) await navigator.share({ title: t("人类 vs AI"), text, url: shareUrl });
      else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setCopied(true);
      }
      onShared?.();
    } catch {
      // Dismissed share sheet.
    }
  }

  return (
    <section className="play-limit-blocked" role="status" data-testid="play-limit-blocked">
      <p className="play-limit-title">{t("今天的 {n} 局已经打完啦", { n: status.limit })}</p>
      <p className="play-limit-reset">
        {t("{time} 后恢复", { time: formatCountdown(status.resetAt - now) })}
        <span className="play-limit-reset-at"> · {t("本地时间 {time} 重置", { time: resetLocal })}</span>
      </p>
      <div className="play-limit-actions">
        <Button variant="primary" onClick={share}>
          {copied ? t("链接已复制") : t("分享给朋友")}
        </Button>
        <span className="play-limit-tomorrow">{t("明天再来挑战 AI")}</span>
      </div>
    </section>
  );
}
