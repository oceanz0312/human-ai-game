"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ResultView } from "@/game/contracts";
import { shareHeadline } from "@/game/reveal-copy";
import { track } from "@/lib/api-client";
import { copyText } from "@/lib/clipboard";
import { renderPoster } from "@/lib/poster";

const noopSubscribe = () => () => undefined;

interface ShareActionsProps {
  result: Pick<ResultView, "publicId" | "reachedLevel" | "fasterThanAiCount" | "cleared">;
  shareUrl: string;
}

export function ShareActions({ result, shareUrl }: ShareActionsProps) {
  const [open, setOpen] = useState(false);
  const [poster, setPoster] = useState<{ blob: Blob; url: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "rendering" | "failed">("idle");
  const [note, setNote] = useState<string | null>(null);
  const canSystemShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const shortUrl = shareUrl.replace(/^https?:\/\//, "");
  const title = shareHeadline(result);

  useEffect(
    () => () => {
      if (poster) URL.revokeObjectURL(poster.url);
    },
    [poster],
  );

  async function generate() {
    setOpen(true);
    setNote(null);
    if (poster) return;
    setStatus("rendering");
    try {
      const blob = await renderPoster({ ...result, url: shareUrl, shortUrl });
      setPoster({ blob, url: URL.createObjectURL(blob) });
      setStatus("idle");
      track("poster_generated", { metadata: { reachedLevel: result.reachedLevel } });
    } catch {
      setStatus("failed");
    }
  }

  async function share() {
    const text = `${title}。同样的 20 关，你能走到哪里？`;
    try {
      const file = poster ? new File([poster.blob], "human-ai.png", { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "HUMAN / AI", text, url: shareUrl, files: [file] });
      } else {
        await navigator.share({ title: "HUMAN / AI", text, url: shareUrl });
      }
      track("share_completed", { metadata: { method: "system" } });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNote("系统分享不可用，可以保存海报或复制链接。");
    }
  }

  async function copy() {
    const ok = await copyText(shareUrl);
    setNote(ok ? "链接已复制" : "复制失败，请手动复制地址栏链接");
    if (ok) track("share_completed", { metadata: { method: "copy" } });
  }

  const onSave = () => track("share_completed", { metadata: { method: "save" } });

  return (
    <>
      <button type="button" className="primary-action" onClick={generate}>
        生成战绩海报
      </button>
      {open ? (
        <div className="poster-view" role="dialog" aria-modal="true" aria-label="战绩海报">
          <main className="mobile-shell">
            <div className="topline">
              <span className="brand">HUMAN / AI</span>
              <button type="button" className="close-action" onClick={() => setOpen(false)}>
                关闭
              </button>
            </div>
            <div className="poster-preview">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={poster.url} alt={`${title}，最终到达第 ${result.reachedLevel} 关`} />
              ) : (
                <div className="board-loading">{status === "failed" ? "海报生成失败" : "正在生成海报"}</div>
              )}
            </div>
            <p className="share-note muted" role="status">
              {note ?? (status === "failed" ? "海报生成失败，仍可复制链接。" : "")}
            </p>
            <div className="bottom-actions poster-actions">
              {canSystemShare ? (
                <button type="button" className="primary-action" onClick={share}>
                  分享战绩
                </button>
              ) : poster ? (
                <a className="primary-action link-action" href={poster.url} download="human-ai.png" onClick={onSave}>
                  保存海报
                </a>
              ) : null}
              {canSystemShare && poster ? (
                <a className="text-action" href={poster.url} download="human-ai.png" onClick={onSave}>
                  保存海报
                </a>
              ) : null}
              <button type="button" className="text-action" onClick={copy}>
                复制链接
              </button>
            </div>
          </main>
        </div>
      ) : null}
    </>
  );
}
