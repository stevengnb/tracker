import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";

export type SystemHealth = {
  disk: string;
  ram: string;
  uptime: string;
};

export function getSystemHealth(): SystemHealth {
  let disk = "—";
  try {
    const s = fs.statfsSync("/");
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    const used = total - free;
    const gb = (n: number) => `${Math.round(n / 1e9)}G`;
    disk = `${gb(used)}/${gb(total)} (${Math.round((used / total) * 100)}%)`;
  } catch {}

  let ram = "—";
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const gi = (n: number) => `${(n / 1024 ** 3).toFixed(1)}Gi`;
    ram = `${gi(total - free)}/${gi(total)} (avail ${gi(free)})`;
  } catch {}

  const up = os.uptime();
  const h = Math.floor(up / 3600);
  const m = Math.floor((up % 3600) / 60);
  const uptime = h > 0 ? `${h} hours, ${m} minutes` : `${m} minutes`;

  return { disk, ram, uptime };
}

// v1 queried `systemctl --user is-active hermes-gateway`, but the gateway is
// a system unit — that's why its status was always blank. Query the system
// manager instead.
export function gatewayStatus(): string {
  try {
    const r = spawnSync(
      "systemctl",
      ["is-active", process.env.GATEWAY_UNIT ?? "hermes-gateway"],
      { encoding: "utf-8", timeout: 5000 },
    );
    const out = (r.stdout ?? "").trim();
    return out || "unknown";
  } catch {
    return "unknown";
  }
}

export type LogEntry = {
  timestamp: string;
  level: string;
  module: string;
  message: string;
};

// Defense-in-depth: strip secret-shaped strings and IDs from anything we
// render, so a leaked page (or failed proxy auth) exposes as little as
// possible. Applied to log lines and cron fields before they leave the server.
export function redact(s: string): string {
  return (
    s
      // API keys / bearer tokens / long opaque credentials
      .replace(/\b(sk|pk|rk|xox[a-z])-[\w-]{8,}/gi, "[key]")
      .replace(/\b(Bearer|token|api[_-]?key|authorization)([=:\s"']+)[\w.+/=-]{8,}/gi, "$1$2[secret]")
      .replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, "[blob]")
      .replace(/\b[0-9a-f]{32,}\b/gi, "[hex]")
      // Telegram chat/thread ids
      .replace(/telegram:-?\d+(:\d+)?/gi, "telegram:[chat]")
      .replace(/\b-100\d{6,}\b/g, "[chat-id]")
  );
}

const LOG_MESSAGE_MAX = 400;

export function sanitizeLogEntry(e: LogEntry): LogEntry {
  const msg = redact(e.message);
  return {
    ...e,
    message:
      msg.length > LOG_MESSAGE_MAX ? msg.slice(0, LOG_MESSAGE_MAX) + " …" : msg,
  };
}

function parseLogMessage(msg: string): Pick<LogEntry, "level" | "module" | "message"> {
  // Gateway format: "WARNING agent.stream_diag: message here"
  const m = msg.match(/^(\w+)\s+([\w.]+):\s*([\s\S]*)/);
  if (m && ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].includes(m[1])) {
    return { level: m[1], module: m[2], message: m[3] };
  }
  return { level: "", module: "", message: msg };
}

// v1 tailed ~/.hermes/logs/gateway.log, which doesn't exist — the gateway
// logs to the systemd journal, readable by adm-group members. Fall back to
// GATEWAY_LOG_PATH if a file path is ever configured.
export function gatewayLogTail(lines: number): LogEntry[] | null {
  const p = process.env.GATEWAY_LOG_PATH;
  if (p && fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, "utf-8").trimEnd().split("\n");
      return content.slice(-lines).map((l) => {
        const m = l.match(
          /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+\s+(\w+)\s+([\w.]+):\s*(.*)/,
        );
        return sanitizeLogEntry(
          m
            ? { timestamp: m[1], level: m[2], module: m[3], message: m[4] }
            : { timestamp: "", level: "", module: "", message: l },
        );
      });
    } catch {
      return null;
    }
  }
  try {
    const r = spawnSync(
      "journalctl",
      [
        "-u",
        process.env.GATEWAY_UNIT ?? "hermes-gateway",
        "-n",
        String(lines),
        "-o",
        "json",
        "--no-pager",
      ],
      { encoding: "utf-8", timeout: 10000, maxBuffer: 8 * 1024 * 1024 },
    );
    if (r.status !== 0 || !r.stdout?.trim()) return null;
    return r.stdout
      .trim()
      .split("\n")
      .map((line) => {
        const d = JSON.parse(line) as {
          __REALTIME_TIMESTAMP?: string;
          MESSAGE?: string | number[];
        };
        const usec = Number(d.__REALTIME_TIMESTAMP ?? 0);
        const ts = usec
          ? new Date(usec / 1000).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "";
        const raw =
          typeof d.MESSAGE === "string"
            ? d.MESSAGE
            : Buffer.from(d.MESSAGE ?? []).toString("utf-8");
        return sanitizeLogEntry({ timestamp: ts, ...parseLogMessage(raw) });
      });
  } catch {
    return null;
  }
}

export type CronJob = {
  id: string;
  status: string;
  name?: string;
  schedule?: string;
  repeat?: string;
  next_run?: string;
  deliver?: string;
  script?: string;
  mode?: string;
  workdir?: string;
  last_run?: string;
};

function parseCronOutput(raw: string): CronJob[] {
  const jobs: CronJob[] = [];
  let current: CronJob | null = null;
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s || "┌│└─".includes(s[0])) continue;
    const head = s.match(/^([0-9a-f]+)\s+\[(\w+)\]/);
    if (head) {
      if (current) jobs.push(current);
      current = { id: head[1], status: head[2] };
      continue;
    }
    if (!current) continue;
    const kv = s.match(/^([\w][\w\s()-]*):\s+(.+)/);
    if (kv) {
      const key = kv[1].trim().toLowerCase().replace(/\s+/g, "_");
      (current as Record<string, string>)[key] = redact(kv[2].trim());
    }
  }
  if (current) jobs.push(current);
  return jobs;
}

// Agent integration paths — override via env for your deployment.
export const HERMES_HOME = process.env.HERMES_HOME ?? "/var/lib/hermes";
export const HERMES_CLI =
  process.env.HERMES_CLI ?? `${HERMES_HOME}/venv/bin/hermes`;
export const HERMES_USER = process.env.HERMES_USER ?? "hermes";
export const HERMES_SESSIONS_DUMP =
  process.env.HERMES_SESSIONS_DUMP ?? "/usr/local/bin/hermes-sessions-dump";

// Two ways this can work: directly when the app runs as the agent user, or via
// a NOPASSWD sudoers rule when running as an unprivileged web user. Try both.
export function cronJobs(): CronJob[] | null {
  const attempts: [string, string[]][] = [
    [HERMES_CLI, ["cron", "list", "--all"]],
    [
      "sudo",
      [
        "-n",
        "-u",
        HERMES_USER,
        "/usr/bin/env",
        `HERMES_HOME=${HERMES_HOME}`,
        HERMES_CLI,
        "cron",
        "list",
        "--all",
      ],
    ],
  ];
  for (const [cmd, args] of attempts) {
    try {
      const r = spawnSync(cmd, args, {
        encoding: "utf-8",
        timeout: 15000,
        env: { ...process.env, HERMES_HOME },
      });
      if (r.status === 0 && r.stdout?.trim()) {
        const jobs = parseCronOutput(r.stdout);
        if (jobs.length) return jobs;
      }
    } catch {}
  }
  return null;
}

// The agent's real home is /var/lib/hermes (per hermes-gateway.service),
// not the ~/.hermes path v1 assumed. Readable only once access is granted.
export function stateDbPath(): string | null {
  const candidates = [
    process.env.STATE_DB_PATH,
    `${HERMES_HOME}/state.db`,
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      fs.accessSync(p, fs.constants.R_OK);
      return p;
    } catch {}
  }
  return null;
}
