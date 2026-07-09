import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Edit title / note. Body: { title?, note? }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const fields: string[] = [];
    const values: (string | null)[] = [];
    if ("title" in body) {
      const t = (body.title ?? "").trim();
      if (!t) return fail("title cannot be empty");
      fields.push("title = ?");
      values.push(t);
    }
    if ("note" in body) {
      fields.push("note = ?");
      values.push((body.note ?? "").trim() || null);
    }
    if (!fields.length) return fail("nothing to update");
    getDb()
      .prepare(`UPDATE files SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT stored_name FROM files WHERE id = ?")
      .get(id) as { stored_name: string } | undefined;
    if (row) {
      try {
        fs.unlinkSync(path.join(uploadsDir(), row.stored_name));
      } catch {
        // already gone — fine
      }
    }
    db.prepare("DELETE FROM files WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
