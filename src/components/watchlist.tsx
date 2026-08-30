"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { WatchlistItem } from "@/lib/types";
import { QUEUE_CATEGORIES, QUEUE_CATEGORY_LABELS } from "@/lib/types";
import { Select } from "./Select";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

function domain(url: string): string {
  if (url.startsWith("/wiki")) return "wiki note";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function AddQueueItem({ kind }: { kind: "watch" | "read" }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(QUEUE_CATEGORIES[kind][0]);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      await api("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || null,
          kind,
          category,
        }),
      });
      setTitle("");
      setUrl("");
      router.refresh();
    });
  };
  return (
    <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "read" ? "Title…" : "Title…"}
        className="min-w-40 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={kind === "read" ? "URL" : "URL (optional)"}
        className="min-w-40 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <Select
        value={category}
        onChange={setCategory}
        className="w-36"
        options={QUEUE_CATEGORIES[kind].map((c) => ({
          value: c,
          label: QUEUE_CATEGORY_LABELS[c] ?? c,
        }))}
      />
      <button
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="size-4" /> Add
      </button>
    </form>
  );
}

export function QueueRow({
  item,
  highlight = false,
}: {
  item: WatchlistItem;
  highlight?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const rowRef = useRef<HTMLDivElement>(null);
  const done = item.status === "watched" || item.status === "read";

  // When arrived at via a direct link (?item=id), bring it into view.
  useEffect(() => {
    if (highlight)
      rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);
  const toggle = () =>
    start(async () => {
      await api(`/api/watchlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });
      router.refresh();
    });
  const remove = async () => {
    const ok = await confirmDialog({
      message: "Delete this item?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/watchlist/${item.id}`, { method: "DELETE" });
      router.refresh();
    });
  };
  const doneTitle =
    item.kind === "read"
      ? done
        ? "Back to read list"
        : "Mark read"
      : done
        ? "Back to watchlist"
        : "Mark watched";
  return (
    <div
      ref={rowRef}
      className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-line/40 ${pending ? "opacity-50" : ""} ${
        highlight ? "bg-accent-soft ring-1 ring-accent/40" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] ${done ? "text-faint line-through" : ""}`}
        >
          {item.title}
        </span>
        {item.url && (
          <span className="block truncate text-[11px] text-faint">
            {domain(item.url)}
          </span>
        )}
      </div>
      {item.subcategory && (
        <span className="hidden text-[11px] text-faint sm:inline">
          {item.subcategory}
        </span>
      )}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-faint transition-colors hover:text-accent"
          title="Open link"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
      <button
        onClick={toggle}
        title={doneTitle}
        className="text-faint transition-all hover:text-good sm:opacity-0 sm:group-hover:opacity-100"
      >
        {done ? <RotateCcw className="size-3.5" /> : <Check className="size-4" />}
      </button>
      <button
        onClick={remove}
        title="Delete"
        className="text-faint transition-all hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
