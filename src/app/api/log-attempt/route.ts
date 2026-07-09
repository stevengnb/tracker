import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, ok, readBody } from "@/lib/api";

// Contract: {challenge_id, attempt_number, user_answer, was_correct,
// hint_received, granger_response}. Attempts are logged ungraded; an external
// grader reviews them asynchronously and fills in granger_response.
export async function POST(req: NextRequest) {
  const { data } = await readBody(req);
  const challengeId = Number(data.challenge_id);
  const userAnswer = (data.user_answer ?? "").toString().trim();
  if (!challengeId || !userAnswer) {
    return fail("challenge_id and user_answer are required");
  }
  try {
    const db = getDb();
    const challenge = db
      .prepare("SELECT id, status FROM challenges WHERE id = ?")
      .get(challengeId) as { id: number; status: string } | undefined;
    if (!challenge) return fail("challenge not found", 404);
    if (challenge.status !== "pending") {
      return fail("challenge is not pending");
    }
    const prev = db
      .prepare(
        "SELECT COALESCE(MAX(attempt_number), 0) n FROM attempts WHERE challenge_id = ?",
      )
      .get(challengeId) as { n: number };
    if (prev.n >= 3) return fail("no attempts remaining");
    const attemptNumber = Number(data.attempt_number) || prev.n + 1;
    db.prepare(
      `INSERT INTO attempts
         (challenge_id, attempt_number, user_answer, was_correct, hint_received, granger_response)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      challengeId,
      Math.min(attemptNumber, 3),
      userAnswer,
      data.was_correct === "true" || data.was_correct === "1" ? 1 : 0,
      data.hint_received || null,
      data.granger_response ?? "",
    );
    return ok({ attempt_number: Math.min(attemptNumber, 3) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
