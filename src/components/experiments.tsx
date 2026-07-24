"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FileText,
  FlaskConical,
  Link2,
  Paperclip,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { Experiment, ExperimentAttachment } from "@/lib/types";
import { Badge, Card } from "./ui";
import { Select } from "./Select";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const STATUS_META: Record<
  string,
  { label: string; tone: "good" | "bad" | "warn" | "accent" | "neutral" }
> = {
  "to-try": { label: "to try", tone: "warn" },
  "in-progress": { label: "in progress", tone: "accent" },
  done: { label: "done", tone: "good" },
  abandoned: { label: "abandoned", tone: "bad" },
};

export function AddExperiment() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" /> New experiment
      </button>
    );
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      await api("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hypothesis: hypothesis.trim() || null,
        }),
      });
      setTitle("");
      setHypothesis("");
      setOpen(false);
      router.refresh();
    });
  };
  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to try?"
          autoFocus
          className="rounded-lg border border-line bg-card px-3 py-2 text-[14px] font-medium outline-none focus:border-accent"
        />
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="What are you testing / what do you expect? (optional)"
          rows={2}
          className="resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            disabled={pending}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

export function ExperimentCard({
  experiment: x,
  attachments,
}: {
  experiment: Experiment;
  attachments: ExperimentAttachment[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(x.title);
  const [hypothesis, setHypothesis] = useState(x.hypothesis ?? "");
  const [result, setResult] = useState(x.result ?? "");

  const patch = (body: Record<string, unknown>) =>
    start(async () => {
      await api(`/api/experiments/${x.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    });

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    patch({ title: title.trim(), hypothesis: hypothesis.trim() });
    setEditing(false);
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete experiment",
      message: `Delete experiment "${x.title}"? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/experiments/${x.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  const meta = STATUS_META[x.status] ?? STATUS_META["to-try"];

  return (
    <Card className={`flex flex-col ${pending ? "opacity-60" : ""}`}>
      {editing ? (
        <form onSubmit={saveEdit} className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="rounded-lg border border-line bg-card px-3 py-2 text-[14px] font-medium outline-none focus:border-accent"
          />
          <textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="What are you testing / expecting?"
            rows={2}
            className="resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
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
          </div>
        </form>
      ) : (
        <div className="group flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FlaskConical className="size-4 shrink-0 text-accent" />
            <span className="text-[14px] font-medium">{x.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="text-faint transition-all hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              onClick={remove}
              title="Delete"
              className="text-faint transition-all hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {!editing && x.hypothesis && (
        <p className="mt-1.5 text-[13px] text-muted">{x.hypothesis}</p>
      )}

      {/* Status selector */}
      <div className="mt-3 flex items-center gap-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <Select
          value={x.status}
          onChange={(v) => patch({ status: v })}
          className="w-36"
          options={[
            { value: "to-try", label: "to try" },
            { value: "in-progress", label: "in progress" },
            { value: "done", label: "done" },
            { value: "abandoned", label: "abandoned" },
          ]}
        />
      </div>

      {/* Result / outcome */}
      <div className="mt-3">
        <label className="text-[11px] font-medium uppercase tracking-wider text-faint">
          Result
        </label>
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          onBlur={() => {
            if (result !== (x.result ?? "")) patch({ result });
          }}
          placeholder="What happened? What did you learn?"
          rows={2}
          className="mt-1 w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <ProofAttachments experimentId={x.id} items={attachments} />
    </Card>
  );
}

function ProofAttachments({
  experimentId,
  items,
}: {
  experimentId: number;
  items: ExperimentAttachment[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<"note" | "link" | null>(null);
  const [content, setContent] = useState("");
  const [pending, start] = useTransition();

  const base = `/api/experiments/${experimentId}/attachments`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !adding) return;
    start(async () => {
      await api(base, {
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
      const res = await fetch(base, { method: "POST", body: fd });
      if (!res.ok) toast("Upload failed — is the uploads dir writable?");
      router.refresh();
    });

  const remove = (aid: number) =>
    start(async () => {
      await api(`${base}/${aid}`, { method: "DELETE" });
      router.refresh();
    });

  return (
    <div className="mt-3 border-t border-line pt-2.5">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-faint">
        Proof
      </p>
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
            title="Delete"
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
