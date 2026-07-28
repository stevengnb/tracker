import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "@/lib/db";
import { fail, formRedirect, ok } from "@/lib/api";
import { validateUpload } from "@/lib/uploads";

// Accepts multipart (file uploads) or form/JSON (notes and links).
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const goalId = Number(id);
  const ct = req.headers.get("content-type") ?? "";
  try {
    const db = getDb();
    const goal = db.prepare("SELECT id FROM goals WHERE id = ?").get(goalId);
    if (!goal) return fail("goal not found", 404);

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const type = (form.get("type") as string) || (file ? "file" : "note");
      if (file instanceof File && file.size > 0) {
        const err = validateUpload(file);
        if (err) return fail(err);
        const safe = `${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
        const dir = uploadsDir();
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, safe),
          Buffer.from(await file.arrayBuffer()),
        );
        db.prepare(
          "INSERT INTO goal_attachments (goal_id, type, content, filename) VALUES (?, 'file', ?, ?)",
        ).run(goalId, safe, file.name);
        return formRedirect(req, "/goals");
      }
      const content = ((form.get("content") as string) ?? "").trim();
      if (!content) return fail("content is required");
      db.prepare(
        "INSERT INTO goal_attachments (goal_id, type, content) VALUES (?, ?, ?)",
      ).run(goalId, type === "link" ? "link" : "note", content);
      return formRedirect(req, "/goals");
    }

    const body = await req.json();
    const content = (body.content ?? "").trim();
    if (!content) return fail("content is required");
    db.prepare(
      "INSERT INTO goal_attachments (goal_id, type, content) VALUES (?, ?, ?)",
    ).run(goalId, body.type === "link" ? "link" : "note", content);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
