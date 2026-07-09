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
      // Flip done/undone using the vocabulary that matches the item's kind:
      // watch → to-watch/watched, read → to-read/read.
      const row = db
        .prepare("SELECT kind, status FROM watchlist_items WHERE id = ?")
        .get(id) as { kind: string; status: string } | undefined;
      if (!row) return fail("item not found", 404);
      const done = row.status === "watched" || row.status === "read";
      const next =
        row.kind === "read"
          ? done
            ? "to-read"
            : "read"
          : done
            ? "to-watch"
            : "watched";
      db.prepare("UPDATE watchlist_items SET status = ? WHERE id = ?").run(
        next,
        id,
      );
      return ok({ status: next });
    }
    const fields: string[] = [];
    const values: (string | null)[] = [];
    for (const key of ["title", "url", "category", "subcategory", "status", "notes"]) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (!fields.length) return fail("nothing to update");
    db.prepare(
      `UPDATE watchlist_items SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM watchlist_items WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
