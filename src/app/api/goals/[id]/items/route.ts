import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok, readBody } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// Add a checklist sub-item to a goal.
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data } = await readBody(req);
  const label = (data.label ?? "").trim();
  if (!label) return fail("label is required");
  try {
    const db = getDb();
    const { p } = db
      .prepare(
        "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM goal_items WHERE goal_id = ?",
      )
      .get(id) as { p: number };
    db.prepare(
      "INSERT INTO goal_items (goal_id, label, position) VALUES (?, ?, ?)",
    ).run(id, label, p);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
