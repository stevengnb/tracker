import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { normalizeUrl } from "@/lib/pins";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if ("title" in body) {
      const v = String(body.title ?? "").trim();
      if (!v) return fail("title cannot be empty");
      fields.push("title = ?");
      values.push(v);
    }
    if ("url" in body) {
      const v = normalizeUrl(body.url ?? "");
      if (!v) return fail("a valid http(s) url is required");
      fields.push("url = ?");
      values.push(v);
    }
    if ("category" in body) {
      fields.push("category = ?");
      values.push(String(body.category ?? "").trim() || "General");
    }
    if ("note" in body) {
      fields.push("note = ?");
      values.push(String(body.note ?? "").trim() || null);
    }
    if ("sort_order" in body) {
      fields.push("sort_order = ?");
      values.push(Number(body.sort_order) || 0);
    }
    if (!fields.length) return fail("nothing to update");
    getDb()
      .prepare(`UPDATE pinned_links SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM pinned_links WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
