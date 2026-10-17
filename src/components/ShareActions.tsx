"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ResultView } from "@/game/contracts";
import { track } from "@/lib/api-client";
import { copyText } from "@/lib/clipboard";
import { renderPoster } from "@/lib/poster";
import { shareCta, shareLine } from "@/lib/share-copy";
import { useLocale, useT } from "@/i18n/client";
import { Button } from "@/components/ui/8bit";

const noopSubscribe = () => () => undefined;

interface ShareActionsProps {
  result: Pick<ResultView, "publicId" | "reachedLevel" | "fasterThanAiCount" | "cleared" | "played" | "humanCorrect" | "aiCorrect">;
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
  const t = useT();
  const locale = useLocale();
  const shortUrl = shareUrl.replace(/^https?:\/\//, "");
  const title = shareLine(result, locale);

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
      const blob = await renderPoster({ ...result, url: shareUrl, shortUrl, locale });
      setPoster({ blob, url: URL.createObjectURL(blob) });
      setStatus("idle");
      track("poster_generated", { metadata: { reachedLevel: result.reachedLevel } });
    } catch {
      setStatus("failed");
    }
  }

  async function share() {
    const text = `${title}${locale === "zh" ? "。" : ". "}${shareCta(locale)}`;
    try {
      const file = poster ? new File([poster.blob], "human-ai.png", { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "HUMAN VS AI", text, url: shareUrl, files: [file] });
      } else {
        await navigator.share({ title: "HUMAN VS AI", text, url: shareUrl });
      }
      track("share_completed", { metadata: { method: "system" } });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNote(t("系统分享不可用，可以保存海报或复制链接。"));
    }
  }

  async function copy() {
    const ok = await copyText(shareUrl);
    setNote(ok ? t("链接已复制") : t("复制失败，请手动复制地址栏链接"));
    if (ok) track("share_completed", { metadata: { method: "copy" } });
  }

  const onSave = () => track("share_completed", { metadata: { method: "save" } });

  return (
    <>
      <Button variant="primary" onClick={generate}>
        {t("生成战绩海报")}
      </Button>
      {open ? (
        <div className="poster-view" role="dialog" aria-modal="true" aria-label={t("战绩海报")}>
          <main className="poster-shell">
            <div className="topline">
              <span className="brand">HUMAN VS AI</span>
              <button type="button" className="close-action" onClick={() => setOpen(false)}>
                {t("关闭")}
              </button>
            </div>
            <div className="poster-preview">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={poster.url} alt={`${title}${t("，最终到达第 {n} 关", { n: result.reachedLevel })}`} />
              ) : (
                <div className="board-loading">{status === "failed" ? t("海报生成失败") : t("正在生成海报")}</div>
              )}
            </div>
            <p className="share-note muted" role="status">
              {note ?? (status === "failed" ? t("海报生成失败，仍可复制链接。") : "")}
            </p>
            <div className="bottom-actions poster-actions">
              {canSystemShare ? (
                <Button variant="primary" onClick={share}>
                  {t("分享战绩")}
                </Button>
              ) : poster ? (
                <Button variant="primary" className="link-action" href={poster.url} download="human-ai.png" onClick={onSave}>
                  {t("保存海报")}
                </Button>
              ) : null}
              {canSystemShare && poster ? (
                <Button variant="text" href={poster.url} download="human-ai.png" onClick={onSave}>
                  {t("保存海报")}
                </Button>
              ) : null}
              <Button variant="text" onClick={copy}>
                {t("复制链接")}
              </Button>
            </div>
          </main>
        </div>
      ) : null}
    </>
  );
}
