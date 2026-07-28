import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; aid: string }> },
) {
  const { id, aid } = await ctx.params;
  try {
    const db = getDb();
    // Remove the backing file first so deleting the row doesn't orphan it.
    const row = db
      .prepare(
        "SELECT type, content FROM experiment_attachments WHERE id = ? AND experiment_id = ?",
      )
      .get(aid, id) as { type: string; content: string } | undefined;
    if (row?.type === "file" && row.content) {
      try {
        fs.unlinkSync(path.join(uploadsDir(), row.content));
      } catch {
        // already gone — fine
      }
    }
    db.prepare(
      "DELETE FROM experiment_attachments WHERE id = ? AND experiment_id = ?",
    ).run(aid, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
