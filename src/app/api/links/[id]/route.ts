import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    getDb().prepare("DELETE FROM links WHERE id = ?").run(id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
