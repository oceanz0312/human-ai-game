"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StartButton } from "@/components/StartButton";
import { Badge } from "@/components/ui/8bit";
import { useLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { modelsForGame } from "@/models/registry";

/** Below this many finished runs a live model shows "数据不足" instead of numbers. */
export const MIN_RUNS_FOR_STATS = 30;

interface OpponentStats {
  runs: number;
  rounds: number;
  aiCorrect: number;
  humanWins: number;
  aiWins: number;
  aiAvgMs: number | null;
}

const storageKey = (game: string) => `hai.opponent.${game}`;

/**
 * Game-agnostic opponent select. Cards come from the model registry (live first, coming-soon greyed
 * with no stats). The choice is remembered per game and can be preselected with `?ai=<slug>`.
 */
export function OpponentSelect({ game, locale }: { game: string; locale: Locale }) {
  const t = useT();
  const currentLocale = useLocale();
  const search = useSearchParams();
  const entries = useMemo(() => [...modelsForGame(game)].sort((a, b) => (a.status === b.status ? 0 : a.status === "live" ? -1 : 1)), [game]);
  const live = entries.filter((entry) => entry.status === "live");
  const [selected, setSelected] = useState(live[0]?.id ?? "");
  const [stats, setStats] = useState<Record<string, OpponentStats | null>>({});

  useEffect(() => {
    const wanted = search.get("ai") ?? window.localStorage.getItem(storageKey(game));
    const match = live.find((entry) => entry.slug === wanted || entry.id === wanted);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restores a browser-only remembered choice
    if (match) setSelected(match.id);
  }, [search, game, live]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/opponents?game=${game}`)
      .then((response) => (response.ok ? (response.json() as Promise<{ opponents?: Array<{ id: string; stats: OpponentStats | null }> }>) : null))
      .then((body) => {
        if (cancelled || !body?.opponents) return;
        setStats(Object.fromEntries(body.opponents.map((item) => [item.id, item.stats])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [game]);

  const choose = (id: string) => {
    setSelected(id);
    window.localStorage.setItem(storageKey(game), id);
  };
  const chosen = live.find((entry) => entry.id === selected) ?? live[0];

  return (
    <div className="opponent-select" data-testid="opponent-select">
      <p className="opponent-select-title">{t("选择你的 AI 对手")}</p>
      <div className="opponent-grid" role="radiogroup" aria-label={t("选择你的 AI 对手")}>
        {entries.map((entry) => {
          const isLive = entry.status === "live";
          const active = isLive && entry.id === chosen?.id;
          const stat = stats[entry.id];
          return (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={!isLive}
              disabled={!isLive}
              className={`opponent-card${active ? " is-active" : ""}${isLive ? "" : " is-soon"}`}
              style={{ ["--accent" as string]: entry.accent }}
              data-testid="opponent-card"
              data-model={entry.slug}
              onClick={() => isLive && choose(entry.id)}
            >
              <span className="opponent-avatar" aria-hidden>
                {entry.publicName.slice(0, 1)}
              </span>
              <span className="opponent-name">{entry.publicName}</span>
              <span className="opponent-meta">{isLive ? `${entry.provider} · ${entry.api}` : t("即将上线")}</span>
              {isLive ? (
                <span className="opponent-stats">
                  {stat && stat.runs >= MIN_RUNS_FOR_STATS
                    ? t("{runs} 局 · AI 答对 {acc}% · 人类胜 {win}%", {
                        runs: stat.runs,
                        acc: stat.rounds ? Math.round((stat.aiCorrect / stat.rounds) * 100) : 0,
                        win: stat.rounds ? Math.round((stat.humanWins / stat.rounds) * 100) : 0,
                      })
                    : t("数据不足")}
                </span>
              ) : (
                <Badge className="opponent-soon">Coming Soon</Badge>
              )}
            </button>
          );
        })}
      </div>
      {chosen ? (
        <StartButton label={t("开始对战 {name}", { name: chosen.publicName })} locale={locale ?? currentLocale} ai={chosen.id} game={game} direct />
      ) : null}
    </div>
  );
}
