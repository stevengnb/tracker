import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, formRedirect, ok } from "@/lib/api";

// Proof attachments for an experiment: file uploads (multipart) or note/link
// (form/JSON). Files land in the same uploads/ dir the goals attachments use.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const expId = Number(id);
  const ct = req.headers.get("content-type") ?? "";
  try {
    const db = getDb();
    const exp = db
      .prepare("SELECT id FROM experiments WHERE id = ?")
      .get(expId);
    if (!exp) return fail("experiment not found", 404);

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const type = (form.get("type") as string) || (file ? "file" : "note");
      if (file instanceof File && file.size > 0) {
        const safe = `${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
        const dir = uploadsDir();
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, safe),
          Buffer.from(await file.arrayBuffer()),
        );
        db.prepare(
          "INSERT INTO experiment_attachments (experiment_id, type, content, filename) VALUES (?, 'file', ?, ?)",
        ).run(expId, safe, file.name);
        return formRedirect(req, "/experiments");
      }
      const content = ((form.get("content") as string) ?? "").trim();
      if (!content) return fail("content is required");
      db.prepare(
        "INSERT INTO experiment_attachments (experiment_id, type, content) VALUES (?, ?, ?)",
      ).run(expId, type === "link" ? "link" : "note", content);
      return formRedirect(req, "/experiments");
    }

    const body = await req.json();
    const content = (body.content ?? "").trim();
    if (!content) return fail("content is required");
    db.prepare(
      "INSERT INTO experiment_attachments (experiment_id, type, content) VALUES (?, ?, ?)",
    ).run(expId, body.type === "link" ? "link" : "note", content);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
