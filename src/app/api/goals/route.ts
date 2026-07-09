import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { currentMonth } from "@/lib/dates";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const title = (data.title ?? "").trim();
  if (!title) return fail("title is required");
  try {
    getDb()
      .prepare(
        `INSERT INTO goals (title, month, description, target_value, unit)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        title,
        data.month || currentMonth(),
        data.description || null,
        data.target_value ? Number(data.target_value) : null,
        data.unit || null,
      );
    return isForm ? formRedirect(req, "/goals") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
