import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getLinks } from "@/lib/queries";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok({ links: getLinks("task", Number(id)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// Link a task to another item. Body: { target_type, target_title, target_href }
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const targetTitle = (body.target_title ?? "").trim();
  const targetHref = (body.target_href ?? "").trim();
  if (!targetTitle || !targetHref)
    return fail("target_title and target_href are required");
  try {
    const info = getDb()
      .prepare(
        `INSERT INTO links (source_type, source_id, target_type, target_title, target_href)
         VALUES ('task', ?, ?, ?, ?)`,
      )
      .run(
        Number(id),
        (body.target_type ?? "").trim() || "item",
        targetTitle,
        targetHref,
      );
    return ok({ id: info.lastInsertRowid });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
