import Link from "next/link";
import { currentMonth, monthLabel } from "@/lib/dates";
import { getGoalAttachments, getGoalMonths, getGoals } from "@/lib/queries";
import { Empty, PageHeader } from "@/components/ui";
import { AddGoal, GoalCard } from "@/components/goals";

export const dynamic = "force-dynamic";

export const metadata = { title: "Goals" };

export default async function GoalsPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await props.searchParams;
  const month = sp.month ?? currentMonth();
  const months = getGoalMonths();
  if (!months.includes(month)) months.push(month);
  months.sort();
  const goals = getGoals(month);
  const attachments = getGoalAttachments(goals.map((g) => g.id));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Goals"
        subtitle="Monthly objectives and progress."
        action={<AddGoal month={month} />}
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        {months.map((m) => (
          <Link
            key={m}
            href={`/goals?month=${m}`}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              m === month
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-line/60"
            }`}
          >
            {monthLabel(m)}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            attachments={attachments.filter((a) => a.goal_id === g.id)}
          />
        ))}
        {!goals.length && <Empty>No goals for this month yet.</Empty>}
      </div>
    </div>
  );
}
