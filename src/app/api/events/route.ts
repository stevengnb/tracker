import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getEventsInRange } from "@/lib/queries";
import { fail, ok } from "@/lib/api";

// GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!start || !end) return fail("start and end are required");
  try {
    return ok({ events: getEventsInRange(start, end) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// Create an event. Body: { title, start_date, end_date?, start_time?, end_time?, color?, description? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").trim();
  const startDate = (body.start_date ?? "").trim();
  if (!title) return fail("title is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return fail("start_date (YYYY-MM-DD) is required");
  const endDate = (body.end_date ?? "").trim() || null;
  try {
    const info = getDb()
      .prepare(
        `INSERT INTO events (title, description, start_date, end_date, start_time, end_time, color, recur)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        title,
        (body.description ?? "").trim() || null,
        startDate,
        endDate && endDate >= startDate ? endDate : null,
        (body.start_time ?? "").trim() || null,
        (body.end_time ?? "").trim() || null,
        (body.color ?? "").trim() || null,
        (body.recur ?? "").trim() || null,
      );
    return ok({ id: info.lastInsertRowid });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
