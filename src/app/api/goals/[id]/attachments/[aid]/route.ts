import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; aid: string }> },
) {
  const { id, aid } = await ctx.params;
  try {
    getDb()
      .prepare("DELETE FROM goal_attachments WHERE id = ? AND goal_id = ?")
      .run(aid, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
