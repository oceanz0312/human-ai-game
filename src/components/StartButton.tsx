"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, track } from "@/lib/api-client";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/client";

export function StartButton({
  label,
  busyLabel,
  replay = false,
  fromShare = false,
  locale,
}: {
  label?: string;
  busyLabel?: string;
  replay?: boolean;
  fromShare?: boolean;
  /** When set, remembers the player's language for the session pages (/play, /result, /share). */
  locale?: Locale;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (locale) document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (fromShare) track("share_landing_started");
    try {
      const session = await api.createSession({ replay });
      router.push(`/play/${session.id}`);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof ApiError && cause.status === 429 ? t("挑战太频繁了，请稍后再试。") : t("网络不稳定，请重试。"));
    }
  }

  return (
    <>
      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className={replay ? "text-action" : "primary-action"} onClick={start} disabled={busy && !replay}>
        {busy ? (busyLabel ?? t("正在开始")) : (label ?? t("开始挑战"))}
      </button>
    </>
  );
}
