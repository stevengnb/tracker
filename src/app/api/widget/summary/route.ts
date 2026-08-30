import { NextResponse } from "next/server";
import { addDays, isoWithOffset, todayStr, utcOffset } from "@/lib/dates";
import {
  computeStreaks,
  getEventsForDay,
  getHabitLog,
  getHabits,
  getTasksDueInRange,
  getTodayChallenge,
} from "@/lib/queries";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Read-only snapshot for the phone home-screen widget. Unlike the rest of
 * /api/*, this is a GET with no body and no DB writes — it is consumed by a
 * non-browser client (Tasker / a native widget) authenticating with a
 * Cloudflare Access *service token*, not a session cookie. See
 * docs/phone-app-plan.md.
 *
 * `generatedAt` is the contract that lets the widget tell "the laptop is off"
 * apart from "nothing happened today": the client shows a dash rather than a
 * stale number once this timestamp is old enough. Every timestamp here carries
 * an explicit UTC offset so a phone in another zone can compare them directly.
 */
export function GET() {
  try {
    const now = new Date();
    const today = todayStr();

    // getTasksDueInRange already excludes cancelled; 'done' still needs filtering.
    const open = (from: string, to: string) =>
      getTasksDueInRange(from, to).filter((t) => t.status !== "done").length;

    // Deactivating a habit does not delete its log rows, so counting habit_log
    // alone can report more completions than there are habits ("4/3"). Count
    // only today's rows belonging to a still-active habit.
    const habits = getHabits(); // already active-only
    const activeIds = new Set(habits.map((h) => h.id));
    const doneToday = getHabitLog(today).filter(
      (r) => r.date === today && r.completed === 1 && activeIds.has(r.habit_id),
    ).length;

    const challenge = getTodayChallenge();

    // The next event today that hasn't started yet. getEventsForDay() orders by
    // the row's original start_date, not time of day, so a recurring event
    // would otherwise beat an earlier one-off — sort by clock time first.
    // All-day events (start_time null) are skipped: there is no time to show.
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    const upcoming = getEventsForDay(today)
      .filter((e) => e.start_time !== null && e.start_time > hhmm)
      .sort((a, b) => a.start_time!.localeCompare(b.start_time!))[0];

    return NextResponse.json(
      {
        ok: true,
        generatedAt: isoWithOffset(now),
        tasks: {
          dueToday: open(today, today),
          overdue: open("0000-01-01", addDays(today, -1)),
        },
        habits: { doneToday, total: habits.length },
        // Streak is a sibling, not a child: computeStreaks() anchors on today
        // *or* yesterday, so it stays meaningful on a day whose challenge row
        // hasn't been generated yet — when `challenge` is null.
        streak: computeStreaks().current,
        challenge: challenge
          ? { category: challenge.category, status: challenge.status }
          : null,
        nextEvent: upcoming
          ? {
              title: upcoming.title,
              at: `${today}T${upcoming.start_time}:00${utcOffset(now)}`,
            }
          : null,
      },
      // ok() from lib/api can't carry headers, and Cloudflare sits in front of
      // this: without no-store the widget can be served a cached snapshot and
      // never notice the origin went away.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // Unlike every other route, this one is reachable from the public internet,
    // so the raw better-sqlite3 message (which embeds host paths) stays local.
    console.error("[widget/summary]", e);
    return fail("unavailable", 500);
  }
}
