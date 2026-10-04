import type { ReactNode } from "react";
import type { Task } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import { currentQuarter, fmtLong, todayStr } from "@/lib/dates";
import {
  computeStreaks,
  getEventsForDay,
  getGoals,
  getHabitLog,
  getHabits,
  getPins,
  getTaskCategories,
  getTasks,
  getTodayChallenge,
  habitStreak,
} from "@/lib/queries";
import { categoryColor, EVENT_COLORS, TIER_LABELS } from "@/lib/types";
import { Badge, Card, Empty, Progress, statusTone } from "@/components/ui";
import { QuickAddTask, TaskRow } from "@/components/tasks";
import { HabitToggle } from "@/components/habits";
import { PinsStrip } from "@/components/pins";
import { TodayGrid } from "@/components/TodayGrid";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const today = todayStr();
  const challenge = getTodayChallenge();
  // Overdue first, then due today, then everything else (getTasks already
  // orders by priority within each group).
  const pending = getTasks({ status: "pending" });
  const overdue = pending.filter((t) => t.due_date && t.due_date < today);
  const dueToday = pending.filter((t) => t.due_date === today);
  const rest = pending.filter((t) => !t.due_date || t.due_date > today);
  const TASK_LIMIT = 12;
  const taskGroups: { label: string; tone?: string; items: Task[] }[] = [];
  let budget = TASK_LIMIT;
  for (const g of [
    { label: "Overdue", tone: "text-bad", items: overdue },
    { label: "Due today", tone: "text-warn", items: dueToday },
    { label: overdue.length || dueToday.length ? "Other" : "", items: rest },
  ]) {
    const items = g.items.slice(0, budget);
    budget -= items.length;
    if (items.length) taskGroups.push({ ...g, items });
  }
  const hiddenTasks = pending.length - (TASK_LIMIT - budget);
  const events = getEventsForDay(today);
  const habits = getHabits();
  const todayLog = new Set(
    getHabitLog(today)
      .filter((l) => l.date === today && l.completed)
      .map((l) => l.habit_id),
  );
  const goals = getGoals(currentQuarter()).filter((g) => g.status === "active");
  const pins = getPins();
  const { current, best } = computeStreaks();

  const cards: Record<string, ReactNode> = {
    tasks: (
      <Card className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">
            Pending tasks{" "}
            <span className="font-normal text-faint">{pending.length}</span>
          </h2>
          <Link href="/tasks" className="text-[12px] text-muted hover:text-accent">
            All tasks →
          </Link>
        </div>
        <QuickAddTask categories={getTaskCategories()} />
        {taskGroups.length ? (
          <div className="flex flex-col gap-2">
            {taskGroups.map((g) => (
              <div key={g.label || "all"}>
                {g.label && (
                  <div className={`mb-0.5 text-[11px] font-medium ${g.tone ?? "text-faint"}`}>
                    {g.label} · {g.items.length}
                  </div>
                )}
                <div className="-mx-2">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              </div>
            ))}
            {hiddenTasks > 0 && (
              <Link href="/tasks" className="text-[12px] text-muted hover:text-accent">
                +{hiddenTasks} more →
              </Link>
            )}
          </div>
        ) : (
          <Empty>Nothing pending. Enjoy it.</Empty>
        )}
      </Card>
    ),
    pins: (
      <Card className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Pinned links</h2>
          <Link href="/pins" className="text-[12px] text-muted hover:text-accent">
            All pins →
          </Link>
        </div>
        <PinsStrip pins={pins} />
      </Card>
    ),
    events: (
      <Card className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Today&apos;s events</h2>
          <Link href="/calendar" className="text-[12px] text-muted hover:text-accent">
            Calendar →
          </Link>
        </div>
        {events.length ? (
          <div className="flex flex-col gap-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-[13px]">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color ?? EVENT_COLORS[0] }}
                />
                <span className="w-14 shrink-0 text-[12px] text-faint tabular-nums">
                  {e.start_time ?? "all-day"}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No events today.</Empty>
        )}
      </Card>
    ),
    habits: (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Habits today</h2>
          <Link href="/habits" className="text-[12px] text-muted hover:text-accent">
            Details →
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center gap-3 py-1">
              <span className="w-6 text-center">{h.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{h.name}</span>
              <span className="text-[11px] text-faint">🔥 {habitStreak(h.id)}</span>
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
    ),
    goals: (
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Goals this quarter</h2>
          <Link href="/goals" className="text-[12px] text-muted hover:text-accent">
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
          <Empty>No goals for this quarter yet.</Empty>
        )}
      </Card>
    ),
    challenge: (
      <Card className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Brain className="size-4" />
              </span>
              <span className="text-[13px] font-semibold">
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
                No challenge generated for today yet — hermes usually delivers one
                each morning.
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
    ),
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="mt-0.5 text-[13px] text-muted">{fmtLong(today)}</p>
      </div>

      <TodayGrid cards={cards} />
    </div>
  );
}
