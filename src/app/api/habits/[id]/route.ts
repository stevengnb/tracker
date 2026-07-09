import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: edit name/icon, or deactivate/reactivate ({ active: 0|1 }).
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (typeof body.name === "string" && body.name.trim()) {
      fields.push("name = ?");
      values.push(body.name.trim());
    }
    if (typeof body.icon === "string" && body.icon.trim()) {
      fields.push("icon = ?");
      values.push(body.icon.trim());
    }
    if (body.active === 0 || body.active === 1) {
      fields.push("active = ?");
      values.push(body.active);
    }
    if (!fields.length) return fail("nothing to update");
    getDb()
      .prepare(`UPDATE habits SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

// DELETE: permanent — removes the habit and (via ON DELETE CASCADE) all its logs.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const db = getDb();
    db.pragma("foreign_keys = ON");
    db.prepare("DELETE FROM habit_log WHERE habit_id = ?").run(id);
    db.prepare("DELETE FROM habits WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
