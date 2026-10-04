import Link from "next/link";
import { currentQuarter, quarterLabel } from "@/lib/dates";
import {
  getGoalAttachments,
  getGoalItems,
  getGoalPeriods,
  getGoals,
} from "@/lib/queries";
import { Empty, PageHeader } from "@/components/ui";
import { AddGoal, GoalCard } from "@/components/goals";

export const dynamic = "force-dynamic";

export const metadata = { title: "Goals" };

export default async function GoalsPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await props.searchParams;
  const period = sp.period ?? currentQuarter();
  const periods = getGoalPeriods();
  if (!periods.includes(period)) periods.push(period);
  periods.sort();
  const goals = getGoals(period);
  const ids = goals.map((g) => g.id);
  const attachments = getGoalAttachments(ids);
  const items = getGoalItems(ids);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Goals"
        subtitle="Quarterly objectives — targets and checklists."
        action={<AddGoal period={period} />}
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {periods.map((p) => (
          <Link
            key={p}
            href={`/goals?period=${p}`}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              p === period
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-line/60"
            }`}
          >
            {quarterLabel(p)}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            attachments={attachments.filter((a) => a.goal_id === g.id)}
            items={items.filter((i) => i.goal_id === g.id)}
          />
        ))}
        {!goals.length && <Empty>No goals for this quarter yet.</Empty>}
      </div>
    </div>
  );
}
