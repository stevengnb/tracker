import { addDays, todayStr } from "@/lib/dates";
import { getHabitLog, getHabits, habitStreak } from "@/lib/queries";
import { Empty, PageHeader } from "@/components/ui";
import { AddHabit, HabitCard } from "@/components/habits";

export const dynamic = "force-dynamic";

export const metadata = { title: "Habits" };

const DAYS = 30;

export default function HabitsPage() {
  const habits = getHabits();
  const today = todayStr();
  const since = addDays(today, -(DAYS - 1));
  const log = getHabitLog(since);
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(since, i));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Habits"
        subtitle="Click any day to mark or unmark it — including past days."
      />

      <div className="mb-5 flex flex-col gap-3">
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            doneDates={log
              .filter((l) => l.habit_id === h.id && l.completed)
              .map((l) => l.date)}
            dates={dates}
            streak={habitStreak(h.id)}
            since={since}
          />
        ))}
        {!habits.length && <Empty>No habits yet.</Empty>}
      </div>

      <AddHabit />
    </div>
  );
}
