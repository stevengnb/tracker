import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getGuides } from "@/lib/queries";
import { fail, ok } from "@/lib/api";

export async function GET() {
  try {
    return ok({ guides: getGuides() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// Create a guide. Body: { title, category?, content?, pinned? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").trim();
  if (!title) return fail("title is required");
  const category = (body.category ?? "").trim() || "General";
  try {
    const info = getDb()
      .prepare(
        `INSERT INTO guides (title, category, content, pinned)
         VALUES (?, ?, ?, ?)`,
      )
      .run(title, category, String(body.content ?? ""), body.pinned ? 1 : 0);
    return ok({ id: info.lastInsertRowid });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
