import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, ok } from "@/lib/api";

const ALLOWED: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};

// Upload one file into a folder. multipart: file, folder_id?, title?, note?
export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) return fail("expected a file upload");
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0)
      return fail("no file provided");
    const kind = ALLOWED[file.type];
    if (!kind) return fail("only images and PDFs are allowed");

    const folderRaw = form.get("folder_id");
    const folderId =
      folderRaw == null || folderRaw === "" ? null : Number(folderRaw);
    const db = getDb();
    if (folderId != null) {
      const folder = db
        .prepare("SELECT id FROM file_folders WHERE id = ?")
        .get(folderId);
      if (!folder) return fail("folder not found", 404);
    }

    const title = ((form.get("title") as string) ?? "").trim() || file.name;
    const note = ((form.get("note") as string) ?? "").trim() || null;

    const stored = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}_${file.name.replace(/[^\w.\-]/g, "_")}`;
    const dir = uploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, stored),
      Buffer.from(await file.arrayBuffer()),
    );

    db.prepare(
      `INSERT INTO files (folder_id, title, note, filename, stored_name, mime, kind, size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(folderId, title, note, file.name, stored, file.type, kind, file.size);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "upload failed", 500);
  }
}
