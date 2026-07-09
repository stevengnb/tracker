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
    for (const key of ["title", "hypothesis", "status", "result"]) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key] === "" ? null : body[key]);
      }
    }
    // Stamp/clear completion time when the status crosses done.
    if ("status" in body) {
      if (body.status === "done") {
        fields.push("completed_at = CURRENT_TIMESTAMP");
      } else {
        fields.push("completed_at = NULL");
      }
    }
    if (!fields.length) return fail("nothing to update");
    getDb()
      .prepare(`UPDATE experiments SET ${fields.join(", ")} WHERE id = ?`)
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
    db.prepare("DELETE FROM experiment_attachments WHERE experiment_id = ?").run(id);
    db.prepare("DELETE FROM experiments WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
