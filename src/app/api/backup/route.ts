import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fail, ok } from "@/lib/api";

const SCRIPT = path.join(os.homedir(), ".local/bin/tracker-backup.sh");
const BACKUP_DIR = path.join(os.homedir(), "backups/tracker-portal");

// Trigger an on-demand backup.
export async function POST() {
  try {
    if (!fs.existsSync(SCRIPT))
      return fail("backup script not installed on this host", 500);
    const r = spawnSync("bash", [SCRIPT], { encoding: "utf-8", timeout: 60000 });
    if (r.status !== 0) return fail(r.stderr?.trim() || "backup failed", 500);
    return ok({ output: (r.stdout ?? "").trim() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "backup failed", 500);
  }
}

// Report the most recent local backup.
export async function GET() {
  try {
    const dirs = fs.existsSync(BACKUP_DIR)
      ? fs
          .readdirSync(BACKUP_DIR)
          .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d))
          .sort()
      : [];
    return ok({ last: dirs.at(-1) ?? null, count: dirs.length });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}
