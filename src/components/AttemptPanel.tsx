"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lightbulb, Send } from "lucide-react";

// Solve flow: progressive hints (hint 2 unlocks after hint 1, views logged
// via /api/view-hint), attempts posted ungraded to /api/log-attempt and
// reviewed asynchronously by an external grader.
export function AttemptPanel({
  challengeId,
  nextAttempt,
  hint1,
  hint2,
}: {
  challengeId: number;
  nextAttempt: number;
  hint1: string | null;
  hint2: string | null;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  const revealHint = (n: number) => {
    setHintsShown(Math.max(hintsShown, n));
    fetch("/api/view-hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge_id: challengeId, hint_number: n }),
    }).catch(() => {});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/log-attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge_id: challengeId,
            attempt_number: nextAttempt,
            user_answer: answer.trim(),
            was_correct: false,
            hint_received:
              hintsShown >= 2 ? "hint_2" : hintsShown === 1 ? "hint_1" : null,
            granger_response: "",
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setMsg({
            text: `Attempt #${nextAttempt} submitted — awaiting review.`,
            ok: true,
          });
          setAnswer("");
          setTimeout(() => router.refresh(), 1200);
        } else {
          setMsg({ text: data.error ?? "Submission failed", ok: false });
        }
      } catch {
        setMsg({ text: "Network error — try again.", ok: false });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {(hint1 || hint2) && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {hint1 && hintsShown < 1 && (
              <button
                onClick={() => revealHint(1)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-warn hover:text-warn"
              >
                <Lightbulb className="size-3.5" /> Reveal hint 1
              </button>
            )}
            {hint2 && hintsShown === 1 && (
              <button
                onClick={() => revealHint(2)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-warn hover:text-warn"
              >
                <Lightbulb className="size-3.5" /> Reveal hint 2
              </button>
            )}
          </div>
          {hintsShown >= 1 && hint1 && (
            <div className="fade-in rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
              <span className="font-medium">Hint 1:</span> {hint1}
            </div>
          )}
          {hintsShown >= 2 && hint2 && (
            <div className="fade-in rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">
              <span className="font-medium">Hint 2:</span> {hint2}
            </div>
          )}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here…"
          rows={4}
          required
          className="w-full resize-y rounded-lg border border-line bg-card px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-faint">
            Attempt {nextAttempt} of 3
          </span>
          <button
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-3.5" />
            {pending ? "Submitting…" : "Submit attempt"}
          </button>
        </div>
      </form>
      {msg && (
        <p
          className={`fade-in text-[13px] ${msg.ok ? "text-good" : "text-bad"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
