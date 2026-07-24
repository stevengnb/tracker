import { addDays, currentMonth } from "@/lib/dates";
import {
  getEventsInRange,
  getHabitDoneCounts,
  getTasksDueInRange,
} from "@/lib/queries";
import { CalendarView } from "@/components/calendar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Calendar" };

export default async function CalendarPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await props.searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "")
    ? (sp.month as string)
    : currentMonth();

  // Fetch a range that safely covers any 6-week grid regardless of week start
  // (the exact grid is computed client-side from the week-start preference).
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = addDays(`${month}-01`, -7);
  const end = addDays(`${month}-${String(lastDay).padStart(2, "0")}`, 7);

  const events = getEventsInRange(start, end);
  const dueTasks = getTasksDueInRange(start, end);
  const habitCounts = getHabitDoneCounts(start, end);

  return (
    <CalendarView
      month={month}
      events={events}
      dueTasks={dueTasks}
      habitCounts={habitCounts}
    />
  );
}
