import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

function ensureTable() {
  getDb()
    .prepare(
      `CREATE TABLE IF NOT EXISTS daily_notes (
         date TEXT PRIMARY KEY,
         content TEXT NOT NULL DEFAULT '',
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`,
    )
    .run();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// GET /api/notes?date=YYYY-MM-DD  → { content }
// GET /api/notes?month=YYYY-MM    → { dates } (days in the month with a note)
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  if (month !== null) {
    if (!MONTH_RE.test(month)) return fail("valid month required");
    try {
      ensureTable();
      const rows = getDb()
        .prepare(
          "SELECT date FROM daily_notes WHERE date LIKE ? AND TRIM(content) != '' ORDER BY date",
        )
        .all(`${month}-%`) as { date: string }[];
      return ok({ dates: rows.map((r) => r.date) });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "read failed", 500);
    }
  }

  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) return fail("valid date required");
  try {
    ensureTable();
    const row = getDb()
      .prepare("SELECT content FROM daily_notes WHERE date = ?")
      .get(date) as { content: string } | undefined;
    return ok({ content: row?.content ?? "" });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// PUT /api/notes  { date, content } → upsert the sheet for that day
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const date = (body.date ?? "").toString();
  if (!DATE_RE.test(date)) return fail("valid date required");
  const content = (body.content ?? "").toString();
  try {
    ensureTable();
    getDb()
      .prepare(
        `INSERT INTO daily_notes (date, content, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(date) DO UPDATE SET content = excluded.content,
                                          updated_at = CURRENT_TIMESTAMP`,
      )
      .run(date, content);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
