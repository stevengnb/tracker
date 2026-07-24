import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getPins } from "@/lib/queries";
import { fail, ok } from "@/lib/api";
import { normalizeUrl } from "@/lib/pins";

export async function GET() {
  try {
    return ok({ pins: getPins() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// Create a pin. Body: { title, url, category?, note? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").trim();
  const url = normalizeUrl(body.url ?? "");
  if (!title) return fail("title is required");
  if (!url) return fail("a valid http(s) url is required");
  const category = (body.category ?? "").trim() || "General";
  try {
    const db = getDb();
    // New pins land at the end of their category.
    const { next } = db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM pinned_links WHERE category = ?",
      )
      .get(category) as { next: number };
    const info = db
      .prepare(
        `INSERT INTO pinned_links (title, url, category, note, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(title, url, category, (body.note ?? "").trim() || null, next);
    return ok({ id: info.lastInsertRowid });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
