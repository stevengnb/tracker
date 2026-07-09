import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const db = getDb();
    if (body.toggle) {
      // v1 contract: {toggle: true} flips pending <-> done
      const row = db
        .prepare("SELECT status FROM tasks WHERE id = ?")
        .get(id) as { status: string } | undefined;
      if (!row) return fail("task not found", 404);
      const done = row.status !== "done";
      db.prepare(
        "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
      ).run(done ? "done" : "pending", done ? new Date().toISOString() : null, id);
      return ok({ status: done ? "done" : "pending" });
    }
    const fields: string[] = [];
    const values: (string | null)[] = [];
    for (const key of ["title", "priority", "status", "due_date", "category"]) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (!fields.length) return fail("nothing to update");
    db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values,
      id,
    );
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
