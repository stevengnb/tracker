import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const title = (data.title ?? "").trim();
  if (!title) return fail("title is required");
  const category = (data.category ?? "").trim();
  if (!category) return fail("category is required");
  try {
    getDb()
      .prepare(
        "INSERT INTO tasks (title, priority, category, due_date) VALUES (?, ?, ?, ?)",
      )
      .run(
        title,
        data.priority || "normal",
        category,
        data.due_date || null,
      );
    return isForm ? formRedirect(req, "/tasks") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
