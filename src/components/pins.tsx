"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";
import type { PinnedLink } from "@/lib/types";
import { hostOf, tileColor, tileLetter } from "@/lib/pins";
import { Empty, PageHeader } from "./ui";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function PinsBoard({
  pins,
  categories,
}: {
  pins: PinnedLink[];
  categories: string[];
}) {
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  const shown = filter === "all" ? pins : pins.filter((p) => p.category === filter);

  // Preserve the query's category order while grouping.
  const groups: { category: string; items: PinnedLink[] }[] = [];
  for (const p of shown) {
    const g = groups.find((x) => x.category === p.category);
    if (g) g.items.push(p);
    else groups.push({ category: p.category, items: [p] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Pins"
        subtitle="Links you keep coming back to. No read state — they stay until you remove them."
        action={
          !creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" /> New pin
            </button>
          )
        }
      />

      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                c === filter
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-line/60"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="mb-4">
          <PinForm
            categories={categories}
            defaultCategory={filter === "all" ? "" : filter}
            onClose={() => setCreating(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.category}>
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-faint">
              {g.category}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map((p) => (
                <PinCard key={p.id} pin={p} categories={categories} />
              ))}
            </div>
          </section>
        ))}
        {!groups.length && !creating && (
          <Empty>
            {pins.length
              ? "No pins in this category."
              : "No pins yet. Add one with New pin."}
          </Empty>
        )}
      </div>
    </div>
  );
}

function PinCard({
  pin,
  categories,
}: {
  pin: PinnedLink;
  categories: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  // Confirm OUTSIDE the transition — see guides.tsx: awaiting the dialog inside
  // startTransition leaves isPending stuck and the deleted row never clears.
  const remove = async () => {
    const okDel = await confirmDialog({
      title: "Delete pin",
      message: `Remove “${pin.title}”? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!okDel) return;
    start(async () => {
      await api(`/api/pins/${pin.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  if (editing) {
    return (
      <PinForm
        pin={pin}
        categories={categories}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`group relative flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card p-3 transition-colors hover:border-accent/50 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <a
        href={pin.url}
        target="_blank"
        rel="noreferrer noopener"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold text-white"
          style={{ backgroundColor: tileColor(pin.url) }}
        >
          {tileLetter(pin.url)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-medium">{pin.title}</span>
            <ExternalLink className="size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
          <span className="block truncate text-[11.5px] text-faint">
            {pin.note?.trim() || hostOf(pin.url)}
          </span>
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          title="Edit"
          className="text-faint transition-colors hover:text-accent"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={remove}
          title="Delete"
          className="text-faint transition-colors hover:text-bad"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function PinForm({
  pin,
  categories,
  defaultCategory = "",
  onClose,
}: {
  pin?: PinnedLink;
  categories: string[];
  defaultCategory?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(pin?.title ?? "");
  const [url, setUrl] = useState(pin?.url ?? "");
  const [category, setCategory] = useState(pin?.category ?? defaultCategory);
  const [note, setNote] = useState(pin?.note ?? "");
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    const body = {
      title: title.trim(),
      url: url.trim(),
      category: category.trim() || "General",
      note,
    };
    start(async () => {
      const res = pin
        ? await api(`/api/pins/${pin.id}`, jsonInit("PATCH", body))
        : await api("/api/pins", jsonInit("POST", body));
      if (!res.ok) return; // keep the form open so the URL can be fixed
      onClose();
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Cloudflare dashboard)"
          className="min-w-48 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-[14px] font-medium outline-none placeholder:text-faint focus:border-accent"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          list="pin-categories"
          className="w-40 rounded-lg border border-line bg-bg px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
        <datalist id="pin-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="dash.cloudflare.com  (https:// added for you)"
        className="rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional) — shown instead of the hostname"
        className="rounded-lg border border-line bg-bg px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
      />
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {pin ? "Save" : "Add pin"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:text-text"
        >
          <X className="size-3.5" /> Cancel
        </button>
      </div>
    </form>
  );
}

// Compact Today-page widget: every pin, one click away.
export function PinsStrip({ pins }: { pins: PinnedLink[] }) {
  if (!pins.length) return <Empty>No pins yet.</Empty>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {pins.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noreferrer noopener"
          title={`${p.title} — ${hostOf(p.url)}`}
          className="flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12px] transition-colors hover:border-accent/50 hover:text-accent"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: tileColor(p.url) }}
          />
          <span className="truncate">{p.title}</span>
        </a>
      ))}
    </div>
  );
}
