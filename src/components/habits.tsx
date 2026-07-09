"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Habit } from "@/lib/types";
import { Badge, Card } from "./ui";

export function HabitToggle({
  habitId,
  doneToday,
  auto,
}: {
  habitId: number;
  doneToday: boolean;
  auto: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (auto) {
    return (
      <span
        title="Logged automatically by hermes"
        className={`flex size-7 items-center justify-center rounded-lg border ${
          doneToday
            ? "border-good/40 bg-good-soft text-good"
            : "border-line text-faint"
        }`}
      >
        {doneToday ? <Check className="size-4" strokeWidth={3} /> : "•"}
      </span>
    );
  }
  const toggle = () =>
    start(async () => {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) alert(data.error ?? "Request failed — is the DB writable?");
      router.refresh();
    });
  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={doneToday ? "Undo today" : "Log today"}
      className={`flex size-7 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
        doneToday
          ? "border-good bg-good text-white dark:text-black"
          : "border-line text-faint hover:border-accent hover:text-accent"
      }`}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  );
}

export function HabitCard({
  habit,
  doneDates,
  dates,
  streak,
  since,
}: {
  habit: Habit;
  doneDates: string[];
  dates: string[];
  streak: number;
  since: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  const [icon, setIcon] = useState(habit.icon);
  const done = new Set(doneDates);

  const call = (init: RequestInit) =>
    start(async () => {
      const res = await fetch(`/api/habits/${habit.id}`, init);
      const d = await res.json().catch(() => ({ ok: false }));
      if (!d.ok) alert(d.error ?? "Request failed — is the DB writable?");
      router.refresh();
    });

  const toggleDate = (date: string) =>
    start(async () => {
      const res = await fetch(`/api/habits/${habit.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const d = await res.json().catch(() => ({ ok: false }));
      if (!d.ok) alert(d.error ?? "Request failed — is the DB writable?");
      router.refresh();
    });

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    call({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon: icon.trim() || "○" }),
    });
    setEditing(false);
  };

  const remove = () => {
    if (
      !confirm(
        `Delete "${habit.name}" and all its logged history? This can't be undone.`,
      )
    )
      return;
    call({ method: "DELETE" });
  };

  return (
    <Card className={pending ? "opacity-60" : ""}>
      {editing ? (
        <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-2">
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-14 rounded-lg border border-line bg-card px-2 py-2 text-center text-[14px] outline-none focus:border-accent"
            title="Icon (emoji)"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-accent"
          />
          <button
            disabled={pending}
            className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-faint hover:text-text"
          >
            <X className="size-4" />
          </button>
        </form>
      ) : (
        <div className="group flex items-center gap-3">
          <span className="text-lg">{habit.icon}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
            {habit.name}
          </span>
          {habit.auto_source && (
            <Badge tone="accent">auto: {habit.auto_source}</Badge>
          )}
          <span className="text-[12px] text-muted">🔥 {streak}</span>
          <button
            onClick={() => setEditing(true)}
            title="Edit"
            className="text-faint transition-all hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => call({
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: 0 }),
            })}
            title="Deactivate (keep history)"
            className="text-faint transition-all hover:text-warn sm:opacity-0 sm:group-hover:opacity-100"
          >
            <EyeOff className="size-3.5" />
          </button>
          <button
            onClick={remove}
            title="Delete (wipes history)"
            className="text-faint transition-all hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-[3px]">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => toggleDate(d)}
            title={`${d}: ${done.has(d) ? "done — click to unmark" : "not done — click to mark"}`}
            className={`h-5 flex-1 rounded-[3px] transition-colors ${
              done.has(d) ? "bg-good hover:bg-good/80" : "bg-line hover:bg-faint/50"
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-faint">
        <span>{since}</span>
        <span>today</span>
      </div>
    </Card>
  );
}

export function AddHabit() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("○");
  const [autoSource, setAutoSource] = useState("");
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-4" /> Add habit
      </button>
    );
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    start(async () => {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon,
          auto_source: autoSource || null,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) alert(data.error ?? "Request failed — is the DB writable?");
      setName("");
      setOpen(false);
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        className="w-14 rounded-lg border border-line bg-card px-2 py-2 text-center text-[13px] outline-none focus:border-accent"
        title="Icon (emoji)"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        autoFocus
        className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <select
        value={autoSource}
        onChange={(e) => setAutoSource(e.target.value)}
        className="rounded-lg border border-line bg-card px-2 py-2 text-[13px] text-muted outline-none focus:border-accent"
      >
        <option value="">Manual only</option>
        <option value="brain-portal">Auto: Brain Portal</option>
        <option value="linux-session">Auto: Linux Session</option>
      </select>
      <button
        disabled={pending}
        className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
