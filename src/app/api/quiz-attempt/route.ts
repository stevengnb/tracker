import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";
import { readQuiz } from "@/lib/quiz";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const slug = (data.slug ?? "").trim();
  if (!slug) return fail("slug is required");

  // Only record attempts for a quiz that actually exists on disk; this also
  // rejects any traversal in the slug (readQuiz guards it).
  const quiz = readQuiz(slug);
  if (!quiz) return fail("unknown quiz", 404);

  // total comes from the quiz file, not the request body — a client-supplied
  // total could record a 100% attempt on a 20-question quiz.
  const total = quiz.questions.length;
  const score = Number(data.score);
  if (!Number.isInteger(score)) return fail("score must be an integer");
  if (score < 0 || score > total) return fail("score out of range");

  try {
    getDb()
      .prepare(
        "INSERT INTO quiz_attempts (slug, title, score, total) VALUES (?, ?, ?, ?)",
      )
      .run(quiz.slug, quiz.title, score, total);
    return isForm
      ? formRedirect(req, `/quiz?slug=${encodeURIComponent(quiz.slug)}`)
      : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
