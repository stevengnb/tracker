import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import { fmtLong, todayStr } from "@/lib/dates";
import {
  computeStreaks,
  getGoals,
  getHabitLog,
  getHabits,
  getTasks,
  getTodayChallenge,
  habitStreak,
} from "@/lib/queries";
import { currentMonth } from "@/lib/dates";
import { categoryColor, TIER_LABELS } from "@/lib/types";
import { Badge, Card, Empty, Progress, statusTone } from "@/components/ui";
import { TaskRow } from "@/components/tasks";
import { HabitToggle } from "@/components/habits";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const today = todayStr();
  const challenge = getTodayChallenge();
  const tasks = getTasks({ status: "pending" }).slice(0, 6);
  const habits = getHabits();
  const todayLog = new Set(
    getHabitLog(today)
      .filter((l) => l.date === today && l.completed)
      .map((l) => l.habit_id),
  );
  const goals = getGoals(currentMonth()).filter((g) => g.status === "active");
  const { current, best } = computeStreaks();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="mt-0.5 text-[13px] text-muted">{fmtLong(today)}</p>
      </div>

      {/* Challenge hero */}
      <Card className="!p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Brain className="size-4" />
              </span>
              <span className="text-[15px] font-semibold">
                Today&apos;s challenge
              </span>
              {challenge && (
                <>
                  <Badge dot={categoryColor(challenge.category)}>
                    {challenge.category}
                  </Badge>
                  {challenge.difficulty_tier && (
                    <Badge>{TIER_LABELS[challenge.difficulty_tier]}</Badge>
                  )}
                  <Badge tone={statusTone(challenge.status)}>
                    {challenge.status}
                  </Badge>
                </>
              )}
            </div>
            {challenge ? (
              <p className="line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-muted">
                {challenge.puzzle_text}
              </p>
            ) : (
              <p className="text-[13px] text-faint">
                No challenge generated for today yet — hermes usually delivers
                one each morning.
              </p>
            )}
          </div>
          {challenge && (
            <Link
              href={`/challenge/${challenge.id}`}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 sm:justify-start"
            >
              {challenge.status === "pending" ? "Solve it" : "Review"}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
        <div className="mt-4 flex gap-5 border-t border-line pt-3 text-[12px] text-muted">
          <span>
            Streak <span className="font-semibold text-text">{current}</span>
          </span>
          <span>
            Best <span className="font-semibold text-text">{best}</span>
          </span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pending tasks */}
        <Card className="min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Pending tasks</h2>
            <Link
              href="/tasks"
              className="text-[12px] text-muted hover:text-accent"
            >
              All tasks →
            </Link>
          </div>
          {tasks.length ? (
            <div className="-mx-2">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          ) : (
            <Empty>Nothing pending. Enjoy it.</Empty>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Habits check-in */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Habits today</h2>
              <Link
                href="/habits"
                className="text-[12px] text-muted hover:text-accent"
              >
                Details →
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center gap-3 py-1">
                  <span className="w-6 text-center">{h.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {h.name}
                  </span>
                  <span className="text-[11px] text-faint">
                    🔥 {habitStreak(h.id)}
                  </span>
                  <HabitToggle
                    habitId={h.id}
                    doneToday={todayLog.has(h.id)}
                    auto={!!h.auto_source}
                  />
                </div>
              ))}
              {!habits.length && <Empty>No habits yet.</Empty>}
            </div>
          </Card>

          {/* Active goals */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Goals this month</h2>
              <Link
                href="/goals"
                className="text-[12px] text-muted hover:text-accent"
              >
                All goals →
              </Link>
            </div>
            {goals.length ? (
              <div className="flex flex-col gap-3">
                {goals.map((g) => (
                  <div key={g.id}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="truncate">{g.title}</span>
                      {g.target_value != null && (
                        <span className="text-[12px] text-muted tabular-nums">
                          {g.current_value}/{g.target_value} {g.unit ?? ""}
                        </span>
                      )}
                    </div>
                    {g.target_value != null && (
                      <Progress value={g.current_value} max={g.target_value} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No goals for this month yet.</Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
