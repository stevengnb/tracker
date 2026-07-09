import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/api";

// Create a folder. Body: { name, parent_id? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").trim();
  if (!name) return fail("folder name is required");
  const parentId =
    body.parent_id == null || body.parent_id === ""
      ? null
      : Number(body.parent_id);
  try {
    const db = getDb();
    if (parentId != null) {
      const parent = db
        .prepare("SELECT id FROM file_folders WHERE id = ?")
        .get(parentId);
      if (!parent) return fail("parent folder not found", 404);
    }
    const info = db
      .prepare("INSERT INTO file_folders (name, parent_id) VALUES (?, ?)")
      .run(name, parentId);
    return ok({ id: info.lastInsertRowid });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
