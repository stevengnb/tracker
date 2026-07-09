import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MessageSquareQuote, XCircle } from "lucide-react";
import { getAttempts, getChallenge } from "@/lib/queries";
import { categoryColor, TIER_LABELS } from "@/lib/types";
import { Badge, Card, statusTone } from "@/components/ui";
import { AttemptPanel } from "@/components/AttemptPanel";

export const dynamic = "force-dynamic";

export default async function ChallengePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const challenge = getChallenge(Number(id));
  if (!challenge) notFound();
  const attempts = getAttempts(challenge.id);
  const solved = challenge.status === "solved";
  const canAttempt = challenge.status === "pending" && attempts.length < 3;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/challenges"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to challenges
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="mr-1 text-xl font-semibold tracking-tight tabular-nums">
          {challenge.date}
        </h1>
        <Badge dot={categoryColor(challenge.category)}>
          {challenge.category}
        </Badge>
        {challenge.difficulty_tier && (
          <Badge>{TIER_LABELS[challenge.difficulty_tier]}</Badge>
        )}
        <Badge tone={statusTone(challenge.status)}>{challenge.status}</Badge>
      </div>

      <Card className="mb-5 !p-5">
        <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-faint">
          Puzzle
        </h2>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed">
          {challenge.puzzle_text}
        </div>
      </Card>

      {attempts.length > 0 && (
        <div className="mb-5 flex flex-col gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">
            Attempts
          </h2>
          {attempts.map((a) => (
            <Card key={a.id}>
              <div className="mb-1.5 flex items-center gap-2 text-[12px] text-muted">
                {a.was_correct ? (
                  <CheckCircle2 className="size-4 text-good" />
                ) : a.granger_response ? (
                  <XCircle className="size-4 text-bad" />
                ) : (
                  <span className="size-2 rounded-full bg-warn" />
                )}
                <span className="font-medium text-text">
                  Attempt #{a.attempt_number}
                </span>
                {a.hint_received && <Badge tone="warn">{a.hint_received}</Badge>}
                <span className="ml-auto text-[11px] text-faint">
                  {a.created_at}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                {a.user_answer}
              </p>
              {a.granger_response ? (
                <div className="mt-3 flex gap-2 rounded-lg bg-accent-soft px-3 py-2.5">
                  <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-accent">
                      Reviewer&apos;s notes
                    </p>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text">
                      {a.granger_response}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[12px] italic text-faint">
                  Awaiting review…
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {canAttempt && (
        <Card className="mb-5 !p-5">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
            Your answer
          </h2>
          <AttemptPanel
            challengeId={challenge.id}
            nextAttempt={attempts.length + 1}
            hint1={challenge.hint_1}
            hint2={challenge.hint_2}
          />
        </Card>
      )}

      {(solved || challenge.status === "failed" || challenge.status === "expired") && (
        <details className="group mb-5">
          <summary className="cursor-pointer list-none">
            <Card className="transition-colors group-open:rounded-b-none hover:border-accent/50">
              <span className="text-[13px] font-medium">
                {solved ? "✓ " : ""}Answer &amp; full reasoning
              </span>
              <span className="float-right text-[12px] text-faint group-open:hidden">
                show
              </span>
            </Card>
          </summary>
          <Card className="rounded-t-none border-t-0">
            <p className="mb-3 text-[13px]">
              <span className="font-semibold">Answer:</span>{" "}
              <span className="font-mono">{challenge.answer}</span>
            </p>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
              {challenge.full_reasoning}
            </p>
          </Card>
        </details>
      )}
    </div>
  );
}
