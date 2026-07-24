/**
 * Accepts what you'd actually paste ("dash.cloudflare.com", "example.com/x")
 * and returns a canonical absolute URL, or "" if it isn't usable.
 *
 * Only http/https survive: these strings are rendered straight into an
 * <a href>, so javascript:/data: URLs must never make it into the DB.
 */
export function normalizeUrl(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (!u.hostname) return "";
    return u.toString();
  } catch {
    return "";
  }
}

/** "https://dash.cloudflare.com/x?y" → "dash.cloudflare.com" */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Deterministic tile colour per host — no external favicon fetch, which would
// leak every pinned URL to a third-party favicon service.
const TILE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

export function tileColor(url: string): string {
  const h = hostOf(url);
  let n = 0;
  for (let i = 0; i < h.length; i++) n = (n * 31 + h.charCodeAt(i)) >>> 0;
  return TILE_COLORS[n % TILE_COLORS.length];
}

export function tileLetter(url: string): string {
  return (hostOf(url)[0] ?? "?").toUpperCase();
}
