const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /"authorization"\s*:\s*"[^"]+"/gi,
];

/** Truncate and redact OpenAI error bodies before logs or game payloads. */
export function sanitizeOpenAiSnippet(raw: string, maxLen = 240): string {
  let text = raw.replace(/\s+/g, " ").trim();
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[redacted]");
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function formatOpenAiErrorDetail(httpStatus: number, snippet: string | null, reason?: string) {
  const parts = [`HTTP ${httpStatus}`];
  if (reason) parts.push(reason);
  if (snippet) parts.push(snippet);
  return parts.join(" · ").slice(0, 512);
}
