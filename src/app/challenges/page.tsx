import Link from "next/link";
import { fmtShort } from "@/lib/dates";
import {
  computeStreaks,
  getChallengeCategories,
  getChallenges,
  getChallengeStats,
} from "@/lib/queries";
import { categoryColor, TIER_LABELS } from "@/lib/types";
import { Badge, Card, Empty, PageHeader, StatCard, statusTone } from "@/components/ui";
import { Heatmap } from "@/components/Heatmap";

export const dynamic = "force-dynamic";

export const metadata = { title: "Challenges" };

export default async function ChallengesPage(props: {
  searchParams: Promise<{ category?: string; difficulty?: string }>;
}) {
  const { category, difficulty } = await props.searchParams;
  const challenges = getChallenges({ category, difficulty });
  const all = getChallenges();
  const stats = getChallengeStats();
  const { current, best } = computeStreaks();
  const categories = getChallengeCategories();
  const heat = new Map(all.map((c) => [c.date, c.status]));

  return (
    <div>
      <PageHeader
        title="Challenges"
        subtitle="Every puzzle, every attempt, every answer."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Solved" value={stats.solved} tone="good" />
        <StatCard label="Failed" value={stats.failed} tone="bad" />
        <StatCard label="Pending" value={stats.pending} tone="warn" />
        <StatCard label="Streak" value={current} tone="accent" />
        <StatCard label="Best streak" value={best} />
      </div>

      <Card className="mb-5">
        <Heatmap
          days={119}
          values={heat as Map<string, "solved" | "failed" | "pending" | "expired">}
          title="Last 17 weeks"
        />
      </Card>

      <form method="get" action="/challenges" className="mb-4 flex flex-wrap gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-muted outline-none focus:border-accent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="difficulty"
          defaultValue={difficulty ?? ""}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-muted outline-none focus:border-accent"
        >
          <option value="">All tiers</option>
          {[1, 2, 3].map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
        <button className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent">
          Filter
        </button>
        {(category || difficulty) && (
          <Link
            href="/challenges"
            className="self-center text-[12px] text-faint hover:text-accent"
          >
            clear
          </Link>
        )}
      </form>

      <div className="flex flex-col gap-2">
        {challenges.map((c) => (
          <Link key={c.id} href={`/challenge/${c.id}`}>
            <Card className="transition-colors hover:border-accent/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="w-14 shrink-0 text-[12px] text-faint tabular-nums sm:w-16">
                  {fmtShort(c.date)}
                </span>
                <Badge dot={categoryColor(c.category)}>{c.category}</Badge>
                {c.difficulty_tier && (
                  <span className="hidden text-[11px] text-faint sm:inline">
                    Tier {c.difficulty_tier}
                  </span>
                )}
                <span className="hidden min-w-0 flex-1 truncate text-[13px] text-muted sm:block">
                  {c.puzzle_text}
                </span>
                <span className="ml-auto sm:ml-0">
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                </span>
              </div>
              <p className="mt-1.5 truncate text-[13px] text-muted sm:hidden">
                {c.puzzle_text}
              </p>
            </Card>
          </Link>
        ))}
        {!challenges.length && <Empty>No challenges match these filters.</Empty>}
      </div>
    </div>
  );
}
