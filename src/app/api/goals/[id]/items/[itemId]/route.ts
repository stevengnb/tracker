import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

// Toggle done, or rename a checklist item.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { itemId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const db = getDb();
    if (body.toggle) {
      const row = db
        .prepare("SELECT done FROM goal_items WHERE id = ?")
        .get(itemId) as { done: number } | undefined;
      if (!row) return fail("item not found", 404);
      db.prepare("UPDATE goal_items SET done = ? WHERE id = ?").run(
        row.done ? 0 : 1,
        itemId,
      );
      return ok({ done: row.done ? 0 : 1 });
    }
    if (typeof body.label === "string") {
      const label = body.label.trim();
      if (!label) return fail("label is required");
      db.prepare("UPDATE goal_items SET label = ? WHERE id = ?").run(
        label,
        itemId,
      );
      return ok();
    }
    return fail("nothing to update");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { itemId } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM goal_items WHERE id = ?").run(itemId);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
