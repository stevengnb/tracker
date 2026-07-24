import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if ("title" in body) {
      const v = String(body.title ?? "").trim();
      if (!v) return fail("title cannot be empty");
      fields.push("title = ?");
      values.push(v);
    }
    if ("category" in body) {
      fields.push("category = ?");
      values.push(String(body.category ?? "").trim() || "General");
    }
    if ("content" in body) {
      fields.push("content = ?");
      values.push(String(body.content ?? ""));
    }
    if ("pinned" in body) {
      fields.push("pinned = ?");
      values.push(body.pinned ? 1 : 0);
    }
    if (!fields.length) return fail("nothing to update");
    fields.push("updated_at = CURRENT_TIMESTAMP");
    getDb()
      .prepare(`UPDATE guides SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM guides WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
