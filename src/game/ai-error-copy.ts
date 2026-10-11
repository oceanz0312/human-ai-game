/** Player-facing Chinese copy for AI error codes on reveal (no secrets). */
export function aiErrorRevealTitle(errorCode: string | null) {
  if (errorCode === "region_unsupported") return "AI 不可用 · 地区限制";
  return `AI 掉线 · ${errorCode ?? "unknown"}`;
}

export function aiErrorRevealHint(errorCode: string | null) {
  if (errorCode === "region_unsupported") {
    return "OpenAI 不支持从当前 Worker 网络出口地区调用（已尝试固定到美国侧出口）";
  }
  return null;
}

export function aiErrorStatusTag(errorCode: string | null, refused: boolean) {
  if (refused) return "放弃";
  if (errorCode === "region_unsupported") return "地区限制";
  return "掉线";
}
