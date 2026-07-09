import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const title = (data.title ?? "").trim();
  if (!title) return fail("title is required");
  try {
    getDb()
      .prepare(
        "INSERT INTO experiments (title, hypothesis, status) VALUES (?, ?, ?)",
      )
      .run(title, data.hypothesis?.trim() || null, data.status || "to-try");
    return isForm ? formRedirect(req, "/experiments") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
