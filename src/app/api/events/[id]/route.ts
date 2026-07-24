import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const fields: string[] = [];
    const values: (string | null)[] = [];
    for (const key of [
      "title",
      "description",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "color",
      "recur",
    ]) {
      if (key in body) {
        const v = typeof body[key] === "string" ? body[key].trim() : body[key];
        if (key === "title" && !v) return fail("title cannot be empty");
        fields.push(`${key} = ?`);
        values.push(v === "" ? null : v);
      }
    }
    if (!fields.length) return fail("nothing to update");
    getDb()
      .prepare(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
