"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, track } from "@/lib/api-client";

export function StartButton({ label = "开始挑战", replay = false, fromShare = false }: { label?: string; replay?: boolean; fromShare?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (fromShare) track("share_landing_started");
    try {
      const session = await api.createSession({ replay });
      router.push(`/play/${session.id}`);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof ApiError && cause.status === 429 ? "挑战太频繁了，请稍后再试。" : "网络不稳定，请重试。");
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
        {busy ? "正在开始" : label}
      </button>
    </>
  );
}
