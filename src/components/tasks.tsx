"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { Badge } from "./ui";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) alert(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const NEW_CATEGORY = "__new__";

export function QuickAddTask({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState(""); // no default — must pick
  const [newCategory, setNewCategory] = useState("");
  const [pending, start] = useTransition();

  const resolvedCategory =
    category === NEW_CATEGORY ? newCategory.trim() : category;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!resolvedCategory) {
      alert("Pick a category (or type a new one).");
      return;
    }
    start(async () => {
      await api("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          category: resolvedCategory,
        }),
      });
      setTitle("");
      setNewCategory("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-faint focus:border-accent sm:min-w-0 sm:w-auto sm:flex-1"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={`rounded-lg border border-line bg-card px-2 py-2 text-[13px] outline-none focus:border-accent ${category ? "text-text" : "text-faint"}`}
      >
        <option value="" disabled>
          Category…
        </option>
        {categories.map((c) => (
          <option key={c} value={c} className="text-text">
            {c}
          </option>
        ))}
        <option value={NEW_CATEGORY} className="text-text">
          + New category
        </option>
      </select>
      {category === NEW_CATEGORY && (
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category"
          autoFocus
          className="w-32 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
      )}
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="rounded-lg border border-line bg-card px-2 py-2 text-[13px] text-muted outline-none focus:border-accent"
      >
        <option value="normal">Normal</option>
        <option value="p0">P0</option>
        <option value="low">Low</option>
      </select>
      <button
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="size-4" /> Add
      </button>
    </form>
  );
}

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const done = task.status === "done";
  const toggle = () =>
    start(async () => {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      if (!confirm("Delete this task?")) return;
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      router.refresh();
    });
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-line/40 ${pending ? "opacity-50" : ""}`}
    >
      <button
        onClick={toggle}
        title={done ? "Mark pending" : "Mark done"}
        className={`flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
          done
            ? "border-good bg-good text-white dark:text-black"
            : "border-faint/60 hover:border-accent"
        }`}
      >
        {done && <Check className="size-3" strokeWidth={3} />}
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${done ? "text-faint line-through" : ""}`}
      >
        {task.title}
      </span>
      {task.priority === "p0" && <Badge tone="bad">P0</Badge>}
      {task.priority === "low" && <Badge>low</Badge>}
      {task.category && (
        <span className="hidden text-[11px] text-faint sm:inline">
          {task.category}
        </span>
      )}
      {task.due_date && (
        <span className="text-[11px] text-faint">{task.due_date}</span>
      )}
      <button
        onClick={remove}
        title="Delete"
        className="text-faint transition-opacity hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
