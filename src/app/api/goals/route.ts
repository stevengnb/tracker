import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { currentQuarter } from "@/lib/dates";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const title = (data.title ?? "").trim();
  if (!title) return fail("title is required");
  const kind = data.kind === "checklist" ? "checklist" : "target";
  try {
    getDb()
      .prepare(
        `INSERT INTO goals (title, period, description, kind, target_value, unit, reward)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        title,
        data.period || currentQuarter(),
        data.description || null,
        kind,
        // target fields only apply to numeric goals
        kind === "target" && data.target_value ? Number(data.target_value) : null,
        kind === "target" ? data.unit || null : null,
        (data.reward ?? "").trim() || null,
      );
    return isForm ? formRedirect(req, "/goals") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
