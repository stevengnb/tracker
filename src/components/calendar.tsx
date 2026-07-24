"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { EVENT_COLORS, type EventItem } from "@/lib/types";
import {
  monthGridDays,
  monthLabel,
  monthShift,
  todayStr,
  weekdayLabels,
} from "@/lib/dates";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import { useSettings } from "@/lib/settings";
import { Select } from "./Select";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

function weekday(iso: string) {
  return new Date(iso + "T12:00:00").getDay();
}

// Does an event occur on `day`? Handles multi-day spans and recurrence.
function occursOn(e: EventItem, day: string): boolean {
  if (day < e.start_date) return false;
  if (!e.recur) return day <= (e.end_date ?? e.start_date);
  if (e.recur === "daily") return true;
  if (e.recur === "weekly") return weekday(day) === weekday(e.start_date);
  if (e.recur === "monthly") return day.slice(8) === e.start_date.slice(8);
  return day <= (e.end_date ?? e.start_date);
}

function eventsOnDay(events: EventItem[], day: string) {
  return events.filter((e) => occursOn(e, day));
}

type DueTask = {
  id: number;
  title: string;
  due_date: string;
  status: string;
  priority: string;
};

type ModalState =
  | { mode: "add"; date: string }
  | { mode: "edit"; event: EventItem }
  | null;

export function CalendarView({
  month,
  events,
  dueTasks,
  habitCounts,
}: {
  month: string;
  events: EventItem[];
  dueTasks: DueTask[];
  habitCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [settings] = useSettings();
  const today = todayStr();
  const [modal, setModal] = useState<ModalState>(null);
  const days = monthGridDays(month, settings.weekStart);
  const WEEKDAYS = weekdayLabels(settings.weekStart);

  const defaultDate = today.startsWith(month) ? today : `${month}-01`;
  const refresh = () => {
    setModal(null);
    router.refresh();
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {monthLabel(month)}
          </h1>
          <div className="ml-1 flex items-center gap-1">
            <Link
              href={`/calendar?month=${monthShift(month, -1)}`}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-line/60 hover:text-text"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href="/calendar"
              className="rounded-md px-2 py-1 text-[12px] text-muted transition-colors hover:bg-line/60 hover:text-text"
            >
              Today
            </Link>
            <Link
              href={`/calendar?month=${monthShift(month, 1)}`}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-line/60 hover:text-text"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <button
          onClick={() => setModal({ mode: "add", date: defaultDate })}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" /> New event
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-surface">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-faint"
            >
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = day.startsWith(month);
            const isToday = day === today;
            const dayEvents = eventsOnDay(events, day);
            const dayTasks = settings.calShowTasks
              ? dueTasks.filter((t) => t.due_date === day)
              : [];
            const habitN = settings.calShowHabits ? (habitCounts[day] ?? 0) : 0;
            const overflow =
              Math.max(0, dayEvents.length - 3) + Math.max(0, dayTasks.length - 2);
            return (
              <div
                key={day}
                className={`group relative min-h-[92px] border-line p-1 [&:nth-child(7n)]:border-r-0 ${
                  i < 35 ? "border-b" : ""
                } border-r ${inMonth ? "" : "bg-line/20"}`}
              >
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-[12px] tabular-nums ${
                        isToday
                          ? "bg-accent font-semibold text-white"
                          : inMonth
                            ? "text-text"
                            : "text-faint"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                    {habitN > 0 && (
                      <span
                        className="text-[9px] font-medium text-good"
                        title={`${habitN} habit${habitN > 1 ? "s" : ""} done`}
                      >
                        ✓{habitN}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ mode: "add", date: day })}
                    aria-label="Add event"
                    className="text-faint opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setModal({ mode: "edit", event: e })}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight hover:opacity-80"
                      style={{
                        backgroundColor: `${e.color ?? EVENT_COLORS[0]}22`,
                        color: e.color ?? EVENT_COLORS[0],
                      }}
                      title={e.title}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: e.color ?? EVENT_COLORS[0] }}
                      />
                      <span className="truncate">
                        {e.start_time ? `${e.start_time} ` : ""}
                        {e.title}
                      </span>
                    </button>
                  ))}
                  {dayTasks.slice(0, 2).map((t) => (
                    <button
                      key={`t${t.id}`}
                      onClick={() => router.push("/tasks")}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight text-muted hover:bg-line/60"
                      title={`Task due: ${t.title}`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full border ${
                          t.status === "done"
                            ? "border-good bg-good"
                            : "border-faint"
                        }`}
                      />
                      <span
                        className={`truncate ${t.status === "done" ? "text-faint line-through" : ""}`}
                      >
                        {t.title}
                      </span>
                    </button>
                  ))}
                  {overflow > 0 && (
                    <span className="px-1 text-[10px] text-faint">
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <EventModal
          key={modal.mode === "edit" ? modal.event.id : `add-${modal.date}`}
          event={modal.mode === "edit" ? modal.event : undefined}
          defaultDate={modal.mode === "add" ? modal.date : undefined}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function EventModal({
  event,
  defaultDate,
  onClose,
  onSaved,
}: {
  event?: EventItem;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const [title, setTitle] = useState(event?.title ?? "");
  const [desc, setDesc] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState(
    event?.start_date ?? defaultDate ?? todayStr(),
  );
  const [endDate, setEndDate] = useState(event?.end_date ?? "");
  const [allDay, setAllDay] = useState(event ? !event.start_time : true);
  const [startTime, setStartTime] = useState(event?.start_time ?? "");
  const [endTime, setEndTime] = useState(event?.end_time ?? "");
  const [color, setColor] = useState(event?.color ?? EVENT_COLORS[0]);
  const [recur, setRecur] = useState(event?.recur ?? "");
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;
    const payload = {
      title: title.trim(),
      description: desc,
      start_date: startDate,
      end_date: endDate && endDate >= startDate ? endDate : "",
      start_time: allDay ? "" : startTime,
      end_time: allDay ? "" : endTime,
      color,
      recur,
    };
    start(async () => {
      await api(isEdit ? `/api/events/${event!.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
    });
  };

  const remove = async () => {
    const ok = await confirmDialog({
      message: `Delete "${event!.title}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/events/${event!.id}`, { method: "DELETE" });
      onSaved();
    });
  };

  const field =
    "w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none focus:border-accent";

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-line bg-bg p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {isEdit ? "Edit event" : "New event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-faint hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
          className={`${field} mb-2 font-medium`}
        />

        <div className="mb-2 flex items-center gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-faint">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[11px] text-faint">
              End (optional)
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={field}
            />
          </label>
        </div>

        <label className="mb-2 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          All day
        </label>

        {!allDay && (
          <div className="mb-2 flex items-center gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-faint">From</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={field}
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-faint">To</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={field}
              />
            </label>
          </div>
        )}

        <div className="mb-2 flex items-center gap-1.5">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`colour ${c}`}
              className={`size-6 rounded-full transition-transform ${
                color === c ? "ring-2 ring-offset-2 ring-offset-bg" : ""
              }`}
              style={{ backgroundColor: c, boxShadow: `0 0 0 0 ${c}` }}
            />
          ))}
        </div>

        <div className="mb-2">
          <span className="mb-1 block text-[11px] text-faint">Repeat</span>
          <Select
            value={recur}
            onChange={setRecur}
            options={[
              { value: "", label: "Does not repeat" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>

        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className={`${field} mb-3 resize-y`}
        />

        <div className="flex items-center gap-2">
          <button
            disabled={pending || !title.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {isEdit ? "Save" : "Add event"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-[13px] text-muted hover:text-text"
          >
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={remove}
              title="Delete"
              className="ml-auto text-faint hover:text-bad"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>,
    document.body,
  );
}
