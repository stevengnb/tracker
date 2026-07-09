import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const title = (data.title ?? "").trim();
  if (!title) return fail("title is required");
  const kind = data.kind === "read" ? "read" : "watch";
  const category = (data.category ?? "").trim() || (kind === "read" ? "article" : "general");
  const status = kind === "read" ? "to-read" : "to-watch";
  try {
    getDb()
      .prepare(
        "INSERT INTO watchlist_items (title, url, kind, category, subcategory, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        title,
        data.url || null,
        kind,
        category,
        data.subcategory || null,
        status,
        data.notes || null,
      );
    return isForm ? formRedirect(req, "/queue") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
