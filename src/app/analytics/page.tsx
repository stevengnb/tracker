import {
  computeStreaks,
  getChallenges,
  getChallengeStats,
  getHintUsage,
  getWeeklyPerformance,
  habitConsistency,
  tasksCompletedPerWeek,
} from "@/lib/queries";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { Heatmap } from "@/components/Heatmap";
import { CountBarChart, RateBarChart, WeeklyChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  const stats = getChallengeStats();
  const { current, best } = computeStreaks();
  const hints = getHintUsage();
  const weekly = getWeeklyPerformance();
  const all = getChallenges();
  const heat = new Map(all.map((c) => [c.date, c.status]));
  const taskWeeks = tasksCompletedPerWeek();
  const consistency = habitConsistency(30);

  const rate =
    stats.solved + stats.failed > 0
      ? Math.round((stats.solved / (stats.solved + stats.failed)) * 100)
      : 0;
  const hintRate =
    hints.attempts > 0
      ? Math.round((hints.withHints / hints.attempts) * 100)
      : 0;

  const catData = stats.byCategory.map((c) => ({
    name: c.category,
    rate: c.total ? Math.round((c.solved / c.total) * 100) : 0,
    solved: c.solved,
    total: c.total,
  }));
  const tierData = stats.byTier.map((t) => ({
    name: `Tier ${t.tier}`,
    rate: t.total ? Math.round((t.solved / t.total) * 100) : 0,
    solved: t.solved,
    total: t.total,
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Challenge performance and cross-module trends."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Solved" value={stats.solved} tone="good" />
        <StatCard label="Failed" value={stats.failed} tone="bad" />
        <StatCard label="Success" value={`${rate}%`} tone="accent" />
        <StatCard label="Hint usage" value={`${hintRate}%`} tone="warn" />
        <StatCard label="Best streak" value={best} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">Solved per week</h2>
          <WeeklyChart data={weekly} />
        </Card>
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">Activity</h2>
          <Heatmap
            days={119}
            values={heat as Map<string, "solved" | "failed" | "pending" | "expired">}
          />
          <p className="mt-3 text-[12px] text-muted">
            Current streak:{" "}
            <span className="font-semibold text-text">{current}</span> · Best:{" "}
            <span className="font-semibold text-text">{best}</span>
          </p>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">
            Success rate by category
          </h2>
          <RateBarChart data={catData} />
        </Card>
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">
            Success rate by tier
          </h2>
          <RateBarChart data={tierData} color="var(--amber)" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">
            Tasks completed per week
          </h2>
          {taskWeeks.length ? (
            <CountBarChart
              data={taskWeeks.map((w) => ({ name: w.week, n: w.n }))}
              color="var(--green)"
            />
          ) : (
            <p className="py-8 text-center text-[13px] text-faint">
              No completed tasks yet.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">
            Habit consistency (30 days)
          </h2>
          <div className="flex flex-col gap-3">
            {consistency.map(({ habit, done, days }) => (
              <div key={habit.id}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>
                    {habit.icon} {habit.name}
                  </span>
                  <span className="text-muted tabular-nums">
                    {done}/{days} ({Math.round((done / days) * 100)}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-good"
                    style={{ width: `${(done / days) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
