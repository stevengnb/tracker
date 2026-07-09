import { spawnSync } from "child_process";
import Database from "better-sqlite3";
import {
  HERMES_SESSIONS_DUMP,
  HERMES_USER,
  redact,
  stateDbPath,
} from "./system";

export type HermesSession = {
  id: string;
  title: string | null;
  source: string;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  started_at: number;
  ended_at: number | null;
};

export type ToolUsage = { tool: string; n: number };

export type ModelUsage = {
  model: string;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
};

export type HermesActivity = {
  sessions: HermesSession[];
  topTools: ToolUsage[];
  byModel: ModelUsage[];
};

// state.db lives behind hermes' 700 directory, which stays sealed. Primary
// path: a root-owned dump script run as hermes via a NOPASSWD sudoers rule,
// returning metadata-only JSON. Fallback: direct read, for the case where
// the app itself runs as hermes. Any failure degrades to "no data".
export function getHermesActivity(limit = 15): HermesActivity | null {
  try {
    const r = spawnSync(
      "sudo",
      ["-n", "-u", HERMES_USER, HERMES_SESSIONS_DUMP],
      { encoding: "utf-8", timeout: 10000, maxBuffer: 4 * 1024 * 1024 },
    );
    if (r.status === 0 && r.stdout?.trim()) {
      const data = JSON.parse(r.stdout) as HermesActivity;
      for (const s of data.sessions) {
        if (s.title) s.title = redact(s.title);
      }
      return data;
    }
  } catch {}
  return readStateDbDirect(limit);
}

function readStateDbDirect(limit: number): HermesActivity | null {
  const path = stateDbPath();
  if (!path) return null;
  let db: Database.Database | null = null;
  try {
    db = new Database(path, { readonly: true, fileMustExist: true });
    db.pragma("busy_timeout = 3000");

    const sessions = db
      .prepare(
        `SELECT id, title, source, model, message_count, tool_call_count,
                input_tokens, output_tokens, started_at, ended_at
         FROM sessions
         WHERE archived = 0
         ORDER BY started_at DESC
         LIMIT ?`,
      )
      .all(limit) as HermesSession[];
    for (const s of sessions) {
      if (s.title) s.title = redact(s.title);
    }

    const topTools = db
      .prepare(
        `SELECT tool_name tool, COUNT(*) n
         FROM messages
         WHERE tool_name IS NOT NULL AND tool_name != ''
         GROUP BY tool_name
         ORDER BY n DESC
         LIMIT 10`,
      )
      .all() as ToolUsage[];

    const byModel = db
      .prepare(
        `SELECT COALESCE(model, 'unknown') model, COUNT(*) sessions,
                SUM(input_tokens) input_tokens, SUM(output_tokens) output_tokens
         FROM sessions
         GROUP BY model
         ORDER BY sessions DESC
         LIMIT 10`,
      )
      .all() as ModelUsage[];

    return { sessions, topTools, byModel };
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export function fmtTokens(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtEpoch(sec: number | null): string {
  if (!sec) return "—";
  return new Date(sec * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDuration(start: number, end: number | null): string {
  if (!end) return "…";
  const s = Math.max(0, Math.round(end - start));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export function fmtCronTime(iso: string | undefined): string {
  if (!iso) return "—";
  // Strip trailing status ("... ok") that the CLI appends to Last run lines.
  const clean = iso.split(/\s+/)[0];
  try {
    return new Date(clean).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return clean.slice(0, 16);
  }
}
