"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Pin,
  PinOff,
  Plus,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import type { Guide } from "@/lib/types";
import { Badge, Empty, PageHeader } from "./ui";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

// Copies text to the clipboard, returning whether it worked.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    toast("Couldn't copy — clipboard blocked by the browser.");
    return false;
  }
}

// A small icon button that flips to a check for a moment after copying and
// raises a bottom snackbar. `snack` is the toast message (omit to stay silent).
function CopyButton({
  getText,
  title = "Copy",
  snack = "Copied to clipboard",
  className = "",
}: {
  getText: () => string;
  title?: string;
  snack?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await copyText(getText())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      if (snack) toast(snack, "success");
    }
  };
  return (
    <button
      onClick={onClick}
      title={copied ? "Copied!" : title}
      className={className}
    >
      {copied ? (
        <Check className="pop-in size-3.5 text-good" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

// Renders a fenced code block with a hover copy button. Used as the `pre`
// renderer for guide markdown; inline code (no <pre>) is left untouched.
function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  return (
    <div className="group/code relative">
      <CopyButton
        getText={() => ref.current?.innerText ?? ""}
        title="Copy code"
        snack="Code copied"
        className="absolute right-2 top-2 z-10 rounded-md border border-line bg-card p-1 text-faint opacity-0 transition-colors hover:text-accent group-hover/code:opacity-100"
      />
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

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

export function GuidesBrowser({
  guides,
  categories,
  openId,
}: {
  guides: Guide[];
  categories: string[];
  openId: number | null;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"active" | "archived">("active");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(openId != null ? [openId] : []),
  );

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const active = guides.filter((g) => g.archived !== 1);
  const archived = guides.filter((g) => g.archived === 1);
  const pool = view === "archived" ? archived : active;
  // Category pills reflect only what's present in the current view.
  const viewCats = [...new Set(pool.map((g) => g.category))].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  const shown =
    filter === "all" ? pool : pool.filter((g) => g.category === filter);

  const switchView = (v: "active" | "archived") => {
    setView(v);
    setFilter("all");
    setCreating(false);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Guides"
        subtitle="Your rules, checklists, and how-tos — in one place."
        action={
          view === "active" &&
          !creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" /> New guide
            </button>
          )
        }
      />

      {/* Active / Archive switch — a segmented control, deliberately styled
          differently from the category pills below so the archive reads as a
          separate section rather than just another filter. */}
      <div className="mb-4 flex w-fit gap-1 rounded-lg border border-line bg-card p-1">
        {(
          [
            ["active", "Guides", active.length, ScrollText],
            ["archived", "Archive", archived.length, Archive],
          ] as const
        ).map(([v, label, count, Icon]) => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              view === v ? "bg-accent text-white" : "text-muted hover:text-text"
            }`}
          >
            <Icon className="size-3.5" /> {label}
            <span
              className={`ml-0.5 rounded-full px-1.5 text-[11px] tabular-nums ${
                view === v ? "bg-white/25" : "bg-line/60 text-muted"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {viewCats.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {["all", ...viewCats].map((c) => (
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

      {creating && view === "active" && (
        <div className="mb-3">
          <GuideForm
            categories={categories}
            defaultCategory={filter === "all" ? "" : filter}
            onClose={() => setCreating(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((g) => (
          <GuideCard
            key={g.id}
            guide={g}
            categories={categories}
            open={expanded.has(g.id)}
            onToggle={() => toggle(g.id)}
          />
        ))}
        {!shown.length && !creating && (
          <Empty>
            {view === "archived"
              ? archived.length
                ? "No archived guides in this category."
                : "Nothing archived yet."
              : active.length
                ? "No guides in this category."
                : "No guides yet. Add one with New guide."}
          </Empty>
        )}
      </div>
    </div>
  );
}

function GuideCard({
  guide,
  categories,
  open,
  onToggle,
}: {
  guide: Guide;
  categories: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const patch = (body: Record<string, unknown>) =>
    start(async () => {
      await api(`/api/guides/${guide.id}`, jsonInit("PATCH", body));
      router.refresh();
    });

  // Confirm OUTSIDE the transition: awaiting a user-interaction dialog inside
  // startTransition keeps isPending true (the row greys out) and blocks React
  // from committing the post-refresh tree, so the deleted row never leaves.
  const remove = async () => {
    const okDel = await confirmDialog({
      title: "Delete guide",
      message: `Delete “${guide.title}”? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!okDel) return;
    start(async () => {
      await api(`/api/guides/${guide.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  if (editing) {
    return (
      <GuideForm
        guide={guide}
        categories={categories}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border border-line bg-card ${pending ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-faint" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-faint" />
          )}
          {guide.pinned === 1 && (
            <Pin className="size-3.5 shrink-0 text-accent" />
          )}
          <span className="truncate text-[14px] font-medium">{guide.title}</span>
          <Badge tone="neutral">{guide.category}</Badge>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {guide.content.trim() && (
            <CopyButton
              getText={() => guide.content}
              title="Copy guide"
              snack="Guide copied"
              className="text-faint transition-colors hover:text-accent"
            />
          )}
          <button
            onClick={() => patch({ pinned: guide.pinned === 1 ? 0 : 1 })}
            title={guide.pinned === 1 ? "Unpin" : "Pin"}
            className="text-faint transition-colors hover:text-accent"
          >
            {guide.pinned === 1 ? (
              <PinOff className="size-3.5" />
            ) : (
              <Pin className="size-3.5" />
            )}
          </button>
          <button
            onClick={() => patch({ archived: guide.archived === 1 ? 0 : 1 })}
            title={guide.archived === 1 ? "Unarchive" : "Archive"}
            className="text-faint transition-colors hover:text-accent"
          >
            {guide.archived === 1 ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </button>
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
      {open && (
        <div className="border-t border-line px-4 py-3">
          {guide.content.trim() ? (
            <div className="wiki-prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ pre: CodeBlock }}
              >
                {guide.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-[13px] text-faint">
              No content yet — click the pencil to add it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GuideForm({
  guide,
  categories,
  defaultCategory = "",
  onClose,
}: {
  guide?: Guide;
  categories: string[];
  defaultCategory?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(guide?.title ?? "");
  const [category, setCategory] = useState(guide?.category ?? defaultCategory);
  const [content, setContent] = useState(guide?.content ?? "");
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Grow the editor to fit its content (capped by max-height in CSS).
  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    titleRef.current?.focus();
    autosize(contentRef.current);
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const body = {
      title: title.trim(),
      category: category.trim() || "General",
      content,
    };
    start(async () => {
      if (guide) {
        await api(`/api/guides/${guide.id}`, jsonInit("PATCH", body));
      } else {
        await api("/api/guides", jsonInit("POST", body));
      }
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
          placeholder="Guide title (e.g. Deploy the portal)"
          className="min-w-48 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-[14px] font-medium outline-none placeholder:text-faint focus:border-accent"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          list="guide-categories"
          className="w-40 rounded-lg border border-line bg-bg px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
        <datalist id="guide-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          autosize(e.target);
        }}
        placeholder={"The rules / steps (Markdown supported)\n\n1. First do this\n2. Then that"}
        rows={6}
        className="max-h-[70vh] min-h-[9rem] resize-none overflow-y-auto rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[13px] leading-relaxed outline-none placeholder:text-faint focus:border-accent"
      />
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {guide ? "Save" : "Add guide"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg border border-line px-3.5 py-1.5 text-[13px] text-muted hover:text-text"
        >
          <X className="size-3.5" /> Cancel
        </button>
        <span className="ml-auto text-[11px] text-faint">Markdown supported</span>
      </div>
    </form>
  );
}
