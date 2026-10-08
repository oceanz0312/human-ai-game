"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardRow } from "@/game/contracts";
import { api, ApiError } from "@/lib/api-client";

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <li className={row.isMe ? "me" : undefined}>
      <span className="rank">{row.rank}</span>
      <span className="name">
        {row.nickname}
        {row.isMe ? "（你）" : ""}
      </span>
      <span className="lvl">第 {row.reachedLevel} 关</span>
    </li>
  );
}

export function Leaderboard({ editable, initialNickname }: { editable: boolean; initialNickname: string | null }) {
  const [data, setData] = useState<{ top: LeaderboardRow[]; around: LeaderboardRow[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [nickname, setNickname] = useState(initialNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = nickname.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      await api.setNickname(value);
      setNote("昵称已更新");
      await load();
    } catch (error) {
      setNote(error instanceof ApiError && error.code === "invalid_request" ? "昵称需为 1–24 个字符" : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section" aria-labelledby="leaderboard-title">
      <h2 className="section-title" id="leaderboard-title">
        全服排行
      </h2>
      {failed ? <p className="muted">排行榜暂时无法加载。</p> : null}
      {data ? (
        <ol className="board-rows">
          {data.top.map((row, index) => (
            <Row key={`top-${index}`} row={row} />
          ))}
          {data.around.length > 0 ? (
            <li aria-hidden className="gap-row">
              <span className="gap">···</span>
            </li>
          ) : null}
          {data.around.map((row, index) => (
            <Row key={`around-${index}`} row={row} />
          ))}
        </ol>
      ) : null}
      <p className="muted note">只按最高到达关卡排名，同关并列。</p>
      {editable ? (
        <form className="nickname-form" onSubmit={save}>
          <label className="visually-hidden" htmlFor="nickname">
            昵称
          </label>
          <input id="nickname" maxLength={24} placeholder="昵称（可选）" value={nickname} onChange={(event) => setNickname(event.target.value)} />
          <button type="submit" className="secondary-action" disabled={saving || !nickname.trim()}>
            保存
          </button>
        </form>
      ) : null}
      {note ? (
        <p className="muted note" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}
