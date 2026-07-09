import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok, readBody } from "@/lib/api";

// v1 contract: {challenge_id, hint_number}. Records that a hint was viewed
// so grading can account for it even when no attempt follows.
export async function POST(req: NextRequest) {
  const { data } = await readBody(req);
  const challengeId = Number(data.challenge_id);
  const hintNumber = Number(data.hint_number);
  if (!challengeId || ![1, 2].includes(hintNumber)) {
    return fail("challenge_id and hint_number (1|2) are required");
  }
  try {
    const db = getDb();
    db.prepare(
      `CREATE TABLE IF NOT EXISTS hint_views (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         challenge_id INTEGER NOT NULL,
         hint_number INTEGER NOT NULL,
         viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`,
    ).run();
    db.prepare(
      "INSERT INTO hint_views (challenge_id, hint_number) VALUES (?, ?)",
    ).run(challengeId, hintNumber);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
