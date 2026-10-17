"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LeaderboardRow } from "@/game/contracts";
import { api, ApiError } from "@/lib/api-client";
import { DetailsSheet } from "./DetailsSheet";
import { useLocale, useT } from "@/i18n/client";
import { Button } from "@/components/ui/8bit";
import { displayNickname } from "@/i18n/nickname";

function Row({ row }: { row: LeaderboardRow }) {
  const t = useT();
  const nickname = displayNickname(row.nickname, t);
  return (
    <li className={row.isMe ? "me" : undefined}>
      <span className="rank">{row.rank}</span>
      <span className="name">
        {nickname}
        {row.isMe ? t("（你）") : ""}
      </span>
      <span className="lvl">{t("第 {n} 关", { n: row.reachedLevel })}</span>
    </li>
  );
}

function LeaderboardList({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <ol className="board-rows">
      {rows.map((row, index) => (
        <Row key={`${row.rank}-${row.nickname}-${index}`} row={row} />
      ))}
    </ol>
  );
}

export function Leaderboard({
  editable,
  initialNickname,
  compact = false,
}: {
  editable: boolean;
  initialNickname: string | null;
  compact?: boolean;
}) {
  const t = useT();
  const [data, setData] = useState<{ top: LeaderboardRow[]; around: LeaderboardRow[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getLeaderboard());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getLeaderboard()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const compactRows = useMemo(() => {
    if (!data) return [];
    const top = data.top.slice(0, 3);
    const meInTop = top.some((row) => row.isMe);
    if (meInTop) return top;
    const me = data.around.find((row) => row.isMe) ?? data.top.find((row) => row.isMe);
    return me ? [...top, me] : top;
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = nickname.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      await api.setNickname(value);
      setNote(t("昵称已更新"));
      await load();
    } catch (error) {
      setNote(error instanceof ApiError && error.code === "invalid_request" ? t("昵称需为 1–24 个字符") : t("保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={compact ? "section section-compact" : "section"} aria-labelledby="leaderboard-title">
      <h2 className="section-title" id="leaderboard-title">
        {t("全服排行")}
      </h2>
      {failed ? <p className="muted">{t("排行榜暂时无法加载。")}</p> : null}
      {data ? (
        compact ? (
          <>
            <LeaderboardList rows={compactRows.filter((row) => row.nickname !== "···")} />
            <Button variant="text" className="details-link" onClick={() => setSheetOpen(true)}>
              {t("完整排行与昵称")}
            </Button>
          </>
        ) : (
          <>
            <LeaderboardList rows={data.top} />
            {data.around.length > 0 ? (
              <ol className="board-rows">
                <li aria-hidden className="gap-row">
                  <span className="gap">···</span>
                </li>
                {data.around.map((row, index) => (
                  <Row key={`around-${index}`} row={row} />
                ))}
              </ol>
            ) : null}
          </>
        )
      ) : null}
      {!compact ? <p className="muted note">{t("只按最高到达关卡排名，同关并列。")}</p> : null}
      {!compact && editable ? (
        <form className="nickname-form" onSubmit={save}>
          <label className="visually-hidden" htmlFor="nickname">
            {t("昵称")}
          </label>
          <input id="nickname" maxLength={24} placeholder={t("昵称（可选）")} value={nickname} onChange={(event) => setNickname(event.target.value)} />
          <Button type="submit" variant="secondary" disabled={saving || !nickname.trim()}>
            {t("保存")}
          </Button>
        </form>
      ) : null}
      {!compact && note ? (
        <p className="muted note" role="status">
          {note}
        </p>
      ) : null}

      {compact ? (
        <DetailsSheet open={sheetOpen} title={t("全服排行")} onClose={() => setSheetOpen(false)}>
          {data ? <LeaderboardList rows={[...data.top, ...data.around]} /> : null}
          <p className="muted note">{t("只按最高到达关卡排名，同关并列。")}</p>
          {editable ? (
            <form className="nickname-form" onSubmit={save}>
              <label className="visually-hidden" htmlFor="nickname-sheet">
                {t("昵称")}
              </label>
              <input
                id="nickname-sheet"
                maxLength={24}
                placeholder={t("昵称（可选）")}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={saving || !nickname.trim()}>
                {t("保存")}
              </Button>
            </form>
          ) : null}
          {note ? (
            <p className="muted note" role="status">
              {note}
            </p>
          ) : null}
        </DetailsSheet>
      ) : null}
    </section>
  );
}
