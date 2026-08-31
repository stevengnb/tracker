"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookText,
  Check,
  ListChecks,
  RotateCcw,
  X,
} from "lucide-react";
import type { Quiz, QuizAttempt, QuizMeta, QuizStat } from "@/lib/types";
import { toast } from "@/lib/toast";
import { Badge, Card, Empty, PageHeader, Progress } from "./ui";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const pctTone = (pct: number) =>
  pct >= 80 ? "good" : pct >= 50 ? "warn" : "bad";

// ── List view ───────────────────────────────────────────────

export function QuizList({
  quizzes,
  stats,
}: {
  quizzes: QuizMeta[];
  stats: Record<string, QuizStat>;
}) {
  return (
    <div>
      <PageHeader
        title="Quiz"
        subtitle="Self-test on your learning notes. Quizzes are Markdown files in QUIZ_DIR."
      />
      {quizzes.length === 0 ? (
        <Empty>
          No quizzes yet. Drop a quiz Markdown file into{" "}
          <code className="text-accent">QUIZ_DIR</code> (
          <code className="text-accent">/srv/shared/etc/quizzes</code>).
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quizzes.map((q) => {
            const s = stats[q.slug];
            return (
              <Link
                key={q.slug}
                href={`/quiz?slug=${encodeURIComponent(q.slug)}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="size-4 shrink-0 text-accent" />
                      <h3 className="font-medium leading-tight">{q.title}</h3>
                    </div>
                    <span className="shrink-0 text-[12px] text-faint">
                      {q.count} Q
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {s ? (
                      <>
                        <Badge tone={pctTone(s.bestPct)}>
                          best {s.bestPct}%
                        </Badge>
                        <span className="text-[12px] text-faint">
                          {s.attempts} attempt{s.attempts === 1 ? "" : "s"} · last{" "}
                          {s.lastPct}%
                        </span>
                      </>
                    ) : (
                      <Badge tone="neutral">not attempted</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Runner ──────────────────────────────────────────────────

// A question is right when the chosen option set exactly equals the correct set.
function isRight(picked: Set<number>, correct: Set<number>) {
  if (picked.size !== correct.size) return false;
  for (const i of picked) if (!correct.has(i)) return false;
  return true;
}

export function QuizRunner({
  quiz,
  attempts,
}: {
  quiz: Quiz;
  attempts: QuizAttempt[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Record<number, Set<number>>>({});
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  const correctSets = useMemo(
    () =>
      quiz.questions.map(
        (q) =>
          new Set(
            q.options.flatMap((o, i) => (o.correct ? [i] : [])),
          ),
      ),
    [quiz],
  );

  const answeredCount = Object.values(picked).filter((s) => s.size > 0).length;
  const allAnswered = answeredCount === quiz.questions.length;

  // Single source of truth for the score — submit() saves this same value, so
  // the saved attempt can never disagree with what's on screen.
  const computeScore = () =>
    quiz.questions.reduce(
      (n, _q, qi) =>
        n + (isRight(picked[qi] ?? new Set(), correctSets[qi]) ? 1 : 0),
      0,
    );
  const score = revealed ? computeScore() : 0;

  function choose(qi: number, oi: number, multi: boolean) {
    if (revealed) return;
    setPicked((prev) => {
      const cur = new Set(prev[qi] ?? []);
      if (multi) {
        if (cur.has(oi)) cur.delete(oi);
        else cur.add(oi);
      } else {
        cur.clear();
        cur.add(oi);
      }
      return { ...prev, [qi]: cur };
    });
  }

  async function submit() {
    const s = computeScore();
    setRevealed(true);
    setSaving(true);
    // total is derived server-side from the quiz file, so it isn't sent.
    await api("/api/quiz-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: quiz.slug, score: s }),
    });
    setSaving(false);
    router.refresh(); // refresh the attempt history below
  }

  function retake() {
    setPicked({});
    setRevealed(false);
  }

  const pct =
    quiz.questions.length > 0
      ? Math.round((score / quiz.questions.length) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title={quiz.title}
        subtitle={`${quiz.questions.length} question${quiz.questions.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-2">
            {quiz.topic && (
              <Link
                href={`/wiki?path=${encodeURIComponent(quiz.topic)}`}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
              >
                <BookText className="size-4" /> Note
              </Link>
            )}
            <Link
              href="/quiz"
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
            >
              <ArrowLeft className="size-4" /> All quizzes
            </Link>
          </div>
        }
      />

      {revealed && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {score}/{quiz.questions.length}
            </span>
            <Badge tone={pctTone(pct)}>{pct}%</Badge>
            {saving && <span className="text-[12px] text-faint">saving…</span>}
          </div>
          <button
            onClick={retake}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
          >
            <RotateCcw className="size-4" /> Retake
          </button>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, qi) => {
          const chosen = picked[qi] ?? new Set<number>();
          const right = revealed && isRight(chosen, correctSets[qi]);
          return (
            <Card key={qi}>
              <div className="flex items-start gap-2">
                <span className="text-[13px] font-medium tabular-nums text-faint">
                  {qi + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{q.prompt}</p>
                  {q.multi && (
                    <p className="mt-0.5 text-[12px] text-faint">
                      Select all that apply.
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-1.5">
                    {q.options.map((o, oi) => {
                      const isChosen = chosen.has(oi);
                      let state = "idle";
                      if (revealed) {
                        if (o.correct) state = "correct";
                        else if (isChosen) state = "wrong";
                      } else if (isChosen) {
                        state = "chosen";
                      }
                      const cls =
                        state === "correct"
                          ? "border-good bg-good-soft text-good"
                          : state === "wrong"
                            ? "border-bad bg-bad-soft text-bad"
                            : state === "chosen"
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line hover:border-accent";
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={revealed}
                          onClick={() => choose(qi, oi, q.multi)}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-default ${cls}`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center border ${q.multi ? "rounded" : "rounded-full"} ${
                              state === "idle"
                                ? "border-faint"
                                : "border-current"
                            }`}
                          >
                            {revealed && o.correct && (
                              <Check className="size-3" />
                            )}
                            {revealed && !o.correct && isChosen && (
                              <X className="size-3" />
                            )}
                            {!revealed && isChosen && (
                              <span className="size-2 rounded-full bg-current" />
                            )}
                          </span>
                          <span>{o.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  {revealed && q.explanation && (
                    <p
                      className={`mt-2.5 rounded-lg border-l-2 py-1 pl-3 text-[13px] ${right ? "border-good text-muted" : "border-line text-muted"}`}
                    >
                      {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!revealed && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-card/90 p-3 backdrop-blur">
          <span className="text-[13px] text-muted">
            {answeredCount}/{quiz.questions.length} answered
          </span>
          <button
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-[13px] font-medium text-muted">
            Past attempts
          </h2>
          <Card className="!p-0">
            {attempts.map((a) => {
              const p = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0"
                >
                  <span className="w-14 shrink-0 text-[13px] tabular-nums">
                    {a.score}/{a.total}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Progress value={a.score} max={a.total} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-faint">
                    {p}%
                  </span>
                  <span className="w-32 shrink-0 text-right text-[12px] text-faint">
                    {new Date(a.created_at.replace(" ", "T") + "Z").toLocaleString()}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
