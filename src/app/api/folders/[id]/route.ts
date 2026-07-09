import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { folderSubtreeIds } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

// Rename a folder. Body: { name }
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").trim();
  if (!name) return fail("name is required");
  try {
    getDb()
      .prepare("UPDATE file_folders SET name = ? WHERE id = ?")
      .run(name, id);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

// Delete a folder and everything under it (subfolders + files, incl. on disk).
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const db = getDb();
    const ids = folderSubtreeIds(Number(id));
    if (!ids.length) return ok();
    const marks = ids.map(() => "?").join(",");
    const files = db
      .prepare(`SELECT stored_name FROM files WHERE folder_id IN (${marks})`)
      .all(...ids) as { stored_name: string }[];
    const dir = uploadsDir();
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dir, f.stored_name));
      } catch {
        // already gone — fine
      }
    }
    // FK enforcement is off on this connection, so a flat delete is safe.
    db.prepare(`DELETE FROM files WHERE folder_id IN (${marks})`).run(...ids);
    db.prepare(`DELETE FROM file_folders WHERE id IN (${marks})`).run(...ids);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
