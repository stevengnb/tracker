"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Check,
  FileText,
  Gift,
  ListChecks,
  Link2,
  Paperclip,
  Pencil,
  Plus,
  StickyNote,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type { Goal, GoalAttachment, GoalItem } from "@/lib/types";
import { Badge, Card, Progress, statusTone } from "./ui";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

// Segmented target/checklist picker, shared by the add form.
function KindToggle({
  kind,
  onChange,
}: {
  kind: "target" | "checklist";
  onChange: (k: "target" | "checklist") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-card p-1">
      {(
        [
          ["target", "Target", Target],
          ["checklist", "Checklist", ListChecks],
        ] as const
      ).map(([k, label, Icon]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
            kind === k ? "bg-accent text-white" : "text-muted hover:text-text"
          }`}
        >
          <Icon className="size-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}

export function AddGoal({ period }: { period: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"target" | "checklist">("target");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [reward, setReward] = useState("");
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" /> Add goal
      </button>
    );
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      await api("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          period,
          kind,
          target_value: kind === "target" ? target || null : null,
          unit: kind === "target" ? unit || null : null,
          reward: reward.trim() || null,
        }),
      });
      setTitle("");
      setTarget("");
      setUnit("");
      setReward("");
      setKind("target");
      setOpen(false);
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title"
        autoFocus
        className="min-w-48 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <KindToggle kind={kind} onChange={setKind} />
      {kind === "target" && (
        <>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target"
            type="number"
            className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
        </>
      )}
      <input
        value={reward}
        onChange={(e) => setReward(e.target.value)}
        placeholder="Reward (optional)"
        className="min-w-40 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <button
        disabled={pending}
        className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-faint hover:text-text"
      >
        <X className="size-4" />
      </button>
    </form>
  );
}

export function GoalActions({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState(String(goal.current_value ?? 0));
  const patch = (body: Record<string, unknown>) =>
    start(async () => {
      await api(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      {goal.kind === "target" && goal.target_value != null && goal.status === "active" && (
        <span className="flex items-center gap-1">
          <input
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            onBlur={() => {
              const v = Number(progress);
              if (!Number.isNaN(v) && v !== goal.current_value)
                patch({ current_value: v });
            }}
            type="number"
            className="w-16 rounded-md border border-line bg-card px-1.5 py-0.5 text-right text-[12px] tabular-nums outline-none focus:border-accent"
            title="Update progress"
          />
          <span className="text-[11px] text-faint">
            / {goal.target_value} {goal.unit ?? ""}
          </span>
        </span>
      )}
      {goal.status === "active" ? (
        <>
          <button
            onClick={() => patch({ status: "done" })}
            title="Mark done"
            className="text-faint transition-colors hover:text-good"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => patch({ status: "abandoned" })}
            title="Abandon"
            className="text-faint transition-colors hover:text-bad"
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <button
          onClick={() => patch({ status: "active" })}
          title="Reactivate"
          className="text-[11px] text-faint hover:text-accent"
        >
          reactivate
        </button>
      )}
    </div>
  );
}

export function GoalCard({
  goal,
  attachments,
  items = [],
}: {
  goal: Goal;
  attachments: GoalAttachment[];
  items?: GoalItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [target, setTarget] = useState(
    goal.target_value != null ? String(goal.target_value) : "",
  );
  const [unit, setUnit] = useState(goal.unit ?? "");
  const [reward, setReward] = useState(goal.reward ?? "");
  const [pending, start] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      await api(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          reward: reward.trim() || null,
          ...(goal.kind === "target"
            ? {
                target_value: target.trim() === "" ? null : Number(target),
                unit: unit.trim() || null,
              }
            : {}),
        }),
      });
      setEditing(false);
      router.refresh();
    });
  };

  const remove = async () => {
    const ok = await confirmDialog({
      message: `Delete goal “${goal.title}”?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/goals/${goal.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  if (editing) {
    return (
      <Card>
        <form onSubmit={save} className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            autoFocus
            className="rounded-lg border border-line bg-card px-3 py-2 text-[14px] font-medium outline-none focus:border-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
          {goal.kind === "target" && (
            <div className="flex gap-2">
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Target"
                type="number"
                className="w-28 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
              />
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit"
                className="w-28 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
              />
            </div>
          )}
          <input
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="Reward (optional)"
            className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    );
  }

  const doneItems = items.filter((i) => i.done).length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {goal.kind === "checklist" ? (
              <ListChecks className="size-3.5 shrink-0 text-faint" />
            ) : (
              <Target className="size-3.5 shrink-0 text-faint" />
            )}
            <span
              className={`text-[14px] font-medium ${goal.status !== "active" ? "text-faint line-through" : ""}`}
            >
              {goal.title}
            </span>
            <Badge tone={statusTone(goal.status)}>{goal.status}</Badge>
          </div>
          {goal.description && (
            <p className="mt-1 text-[13px] text-muted">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTitle(goal.title);
              setDescription(goal.description ?? "");
              setTarget(goal.target_value != null ? String(goal.target_value) : "");
              setUnit(goal.unit ?? "");
              setReward(goal.reward ?? "");
              setEditing(true);
            }}
            title="Edit goal"
            className="text-faint transition-colors hover:text-accent"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={remove}
            title="Delete goal"
            className="text-faint transition-colors hover:text-bad"
          >
            <Trash2 className="size-3.5" />
          </button>
          <GoalActions goal={goal} />
        </div>
      </div>
      {goal.kind === "target" && goal.target_value != null && (
        <div className="mt-3">
          <Progress value={goal.current_value} max={goal.target_value} />
        </div>
      )}
      {goal.kind === "checklist" && (
        <div className="mt-3">
          {items.length > 0 && (
            <>
              <div className="mb-1 flex justify-between text-[11px] text-faint">
                <span>Checklist</span>
                <span className="tabular-nums">
                  {doneItems}/{items.length}
                </span>
              </div>
              <Progress value={doneItems} max={items.length} />
            </>
          )}
          <GoalItems goalId={goal.id} items={items} />
        </div>
      )}
      {goal.reward && (
        <div
          className={`mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] ${
            goal.status === "done"
              ? "border-good/40 bg-good/10 text-good"
              : "border-line bg-accent-soft text-accent"
          }`}
          title={goal.status === "done" ? "Earned!" : "Reward when completed"}
        >
          <Gift className="size-3.5 shrink-0" />
          <span className="font-medium">Reward:</span>
          <span className="min-w-0 truncate">{goal.reward}</span>
        </div>
      )}
      <Attachments goalId={goal.id} items={attachments} />
    </Card>
  );
}

function GoalItems({
  goalId,
  items,
}: {
  goalId: number;
  items: GoalItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  const toggle = (it: GoalItem) =>
    start(async () => {
      await api(`/api/goals/${goalId}/items/${it.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });
      router.refresh();
    });
  const remove = (it: GoalItem) =>
    start(async () => {
      await api(`/api/goals/${goalId}/items/${it.id}`, { method: "DELETE" });
      router.refresh();
    });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    start(async () => {
      await api(`/api/goals/${goalId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      setLabel("");
      router.refresh();
    });
  };

  return (
    <div className={`mt-2 flex flex-col gap-0.5 ${pending ? "opacity-50" : ""}`}>
      {items.map((it) => (
        <div key={it.id} className="group flex items-center gap-2 py-0.5">
          <button
            onClick={() => toggle(it)}
            title={it.done ? "Mark undone" : "Mark done"}
            className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
              it.done
                ? "border-accent bg-accent text-white"
                : "border-line hover:border-accent"
            }`}
          >
            {it.done && <Check className="size-3" />}
          </button>
          <span
            className={`min-w-0 flex-1 truncate text-[13px] ${it.done ? "text-faint line-through" : ""}`}
          >
            {it.label}
          </span>
          <button
            onClick={() => remove(it)}
            title="Delete item"
            className="text-faint hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <form onSubmit={add} className="mt-1 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Checklist item…"
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-[12px] outline-none focus:border-accent"
          />
          <button disabled={pending} className="text-[12px] text-accent">
            add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-faint"
          >
            <X className="size-3.5" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-1 w-fit text-[11px] text-faint hover:text-accent"
        >
          + item
        </button>
      )}
    </div>
  );
}

export function Attachments({
  goalId,
  items,
}: {
  goalId: number;
  items: GoalAttachment[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<"note" | "link" | null>(null);
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !adding) return;
    start(async () => {
      await api(`/api/goals/${goalId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: adding, content: content.trim() }),
      });
      setContent("");
      setAdding(null);
      router.refresh();
    });
  };

  const uploadFile = (file: File) =>
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/goals/${goalId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) toast("Upload failed — is the uploads dir writable?");
      router.refresh();
    });

  const remove = (aid: number) =>
    start(async () => {
      await api(`/api/goals/${goalId}/attachments/${aid}`, {
        method: "DELETE",
      });
      router.refresh();
    });

  return (
    <div className="mt-3 border-t border-line pt-2.5">
      {items.map((a) => (
        <div
          key={a.id}
          className="group flex items-center gap-2 py-1 text-[12px] text-muted"
        >
          {a.type === "note" && <StickyNote className="size-3 shrink-0" />}
          {a.type === "link" && <Link2 className="size-3 shrink-0" />}
          {a.type === "file" && <FileText className="size-3 shrink-0" />}
          {a.type === "link" ? (
            <a
              href={a.content}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:text-accent"
            >
              {a.content}
            </a>
          ) : a.type === "file" ? (
            <a
              href={`/uploads/${a.content}`}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:text-accent"
            >
              {a.filename ?? a.content}
            </a>
          ) : (
            <span className="min-w-0 flex-1">{a.content}</span>
          )}
          <button
            onClick={() => remove(a.id)}
            className="ml-auto text-faint hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
            title="Delete attachment"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <form onSubmit={submit} className="mt-1.5 flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={adding === "link" ? "https://…" : "Note…"}
            autoFocus
            className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-[12px] outline-none focus:border-accent"
          />
          <button disabled={pending} className="text-[12px] text-accent">
            save
          </button>
          <button
            type="button"
            onClick={() => setAdding(null)}
            className="text-faint"
          >
            <X className="size-3.5" />
          </button>
        </form>
      ) : (
        <div className="mt-1 flex gap-3 text-[11px] text-faint">
          <button onClick={() => setAdding("note")} className="hover:text-accent">
            + note
          </button>
          <button onClick={() => setAdding("link")} className="hover:text-accent">
            + link
          </button>
          <label className="cursor-pointer hover:text-accent">
            <Paperclip className="mr-0.5 inline size-3" />
            file
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
