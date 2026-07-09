import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { fail, ok } from "@/lib/api";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Toggles the log entry for a habit on a given date (defaults to today).
// Body: optional { date: "YYYY-MM-DD" }. Any date works — the 30-day strip
// uses this to mark/unmark past days too.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const date = DATE_RE.test(body?.date) ? body.date : todayStr();
  try {
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM habit_log WHERE habit_id = ? AND date = ?")
      .get(id, date) as { id: number } | undefined;
    if (existing) {
      db.prepare("DELETE FROM habit_log WHERE id = ?").run(existing.id);
      return ok({ completed: false, date });
    }
    db.prepare(
      "INSERT INTO habit_log (habit_id, date, completed, source) VALUES (?, ?, 1, 'manual')",
    ).run(id, date);
    return ok({ completed: true, date });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
