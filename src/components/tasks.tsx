"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  ChevronRight,
  Eye,
  Link2,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { LinkItem, Task } from "@/lib/types";
import { Badge } from "./ui";
import { Select } from "./Select";
import { LinkPicker } from "./LinkPicker";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
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
      toast("Pick a category (or type a new one).");
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
      <Select
        value={category}
        onChange={setCategory}
        placeholder="Category…"
        className="w-40"
        options={[
          ...categories.map((c) => ({ value: c, label: c })),
          { value: NEW_CATEGORY, label: "+ New category" },
        ]}
      />
      {category === NEW_CATEGORY && (
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category"
          autoFocus
          className="w-32 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
        />
      )}
      <Select
        value={priority}
        onChange={setPriority}
        className="w-28"
        options={[
          { value: "normal", label: "Normal" },
          { value: "p0", label: "P0" },
          { value: "low", label: "Low" },
        ]}
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

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(!!task.description);
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState(task.description ?? "");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [picking, setPicking] = useState(false);
  const closeRef = useRef<() => void>(() => {});
  const done = task.status === "done";

  useEffect(() => setMounted(true), []);

  // Lock scroll + close on Esc while the notes modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Lazy-load links the first time the modal is opened.
  useEffect(() => {
    if (!open || linksLoaded) return;
    fetch(`/api/tasks/${task.id}/links`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setLinks(d.links);
        setLinksLoaded(true);
      })
      .catch(() => setLinksLoaded(true));
  }, [open, linksLoaded, task.id]);

  const addLink = (r: { type: string; title: string; href: string }) => {
    setPicking(false);
    fetch(`/api/tasks/${task.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: r.type,
        target_title: r.title,
        target_href: r.href,
      }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (!d.ok) {
          toast(d.error ?? "Link failed");
          return;
        }
        setLinks((prev) => [
          ...prev,
          {
            id: d.id,
            source_type: "task",
            source_id: task.id,
            target_type: r.type,
            target_title: r.title,
            target_href: r.href,
            created_at: "",
          },
        ]);
        router.refresh();
      })
      .catch(() => toast("Link failed"));
  };

  const removeLink = (lid: number) => {
    fetch(`/api/links/${lid}`, { method: "DELETE" })
      .then(() => {
        setLinks((prev) => prev.filter((l) => l.id !== lid));
        router.refresh();
      })
      .catch(() => {});
  };

  const toggle = () =>
    start(async () => {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: true }),
      });
      router.refresh();
    });
  const remove = async () => {
    const ok = await confirmDialog({
      message: "Delete this task?",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      router.refresh();
    });
  };
  const saveNote = () => {
    if (note === (task.description ?? "")) return;
    start(async () => {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: note }),
      });
      router.refresh();
    });
  };
  // Save any edits, then close. Kept in a ref so the Esc handler always
  // calls the latest version (fresh `note`) without re-binding the listener.
  const closeModal = () => {
    saveNote();
    setOpen(false);
  };
  closeRef.current = closeModal;
  const openNotes = () => {
    setPreview(!!task.description);
    setOpen(true);
  };

  return (
    <div className={`rounded-lg transition-colors ${pending ? "opacity-50" : ""}`}>
      <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-line/40">
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
        <button
          onClick={openNotes}
          title="Open notes"
          className={`min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] transition-colors hover:text-accent ${done ? "text-faint line-through" : ""}`}
        >
          {task.title}
        </button>
        {task.priority === "p0" && <Badge tone="bad">P0</Badge>}
        {task.priority === "low" && <Badge>low</Badge>}
        {!!task.link_count && (
          <span
            className="flex items-center gap-0.5 text-[11px] text-muted"
            title={`${task.link_count} linked item${task.link_count > 1 ? "s" : ""}`}
          >
            <Link2 className="size-3" />
            {task.link_count}
          </span>
        )}
        {task.category && (
          <span className="hidden text-[11px] text-faint sm:inline">
            {task.category}
          </span>
        )}
        {task.due_date && (
          <span className="text-[11px] text-faint">{task.due_date}</span>
        )}
        <button
          onClick={openNotes}
          title={
            task.description || task.link_count ? "Notes & links" : "Add notes / links"
          }
          className={`text-faint transition-all hover:text-accent ${
            task.description || task.link_count
              ? "text-muted"
              : "sm:opacity-0 sm:group-hover:opacity-100"
          }`}
        >
          {task.description ? (
            <StickyNote className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        <button
          onClick={remove}
          title="Delete"
          className="text-faint transition-opacity hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
            onClick={closeModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-line bg-bg"
            >
              {/* Header: title, edit/preview toggle, close */}
              <div className="flex items-center gap-3 border-b border-line px-5 py-3">
                <h2
                  className={`min-w-0 flex-1 truncate text-[15px] font-semibold ${done ? "text-faint line-through" : ""}`}
                >
                  {task.title}
                </h2>
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line p-0.5 text-[12px]">
                  <button
                    onClick={() => setPreview(false)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${!preview ? "bg-accent-soft text-accent" : "text-muted hover:text-text"}`}
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  <button
                    onClick={() => setPreview(true)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${preview ? "bg-accent-soft text-accent" : "text-muted hover:text-text"}`}
                  >
                    <Eye className="size-3" /> Preview
                  </button>
                </div>
                <button
                  onClick={closeModal}
                  title="Close (Esc)"
                  className="shrink-0 text-faint hover:text-text"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body: notes (edit or rendered) + links */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {preview ? (
                  note.trim() ? (
                    <div className="wiki-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {note}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[13px] text-faint">
                      No notes yet — switch to Edit to add some.
                    </p>
                  )
                ) : (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={saveNote}
                    autoFocus
                    placeholder="Add notes / description… (Markdown supported)"
                    className="min-h-[45vh] w-full resize-y rounded-lg border border-line bg-card px-3 py-2 font-mono text-[13px] leading-relaxed outline-none placeholder:text-faint focus:border-accent"
                  />
                )}

                <div className="mt-4 border-t border-line pt-3">
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-faint">
                    Linked items
                  </div>
                  {links.map((l) => (
                    <div
                      key={l.id}
                      className="group/link flex items-center gap-2 py-0.5 text-[12px]"
                    >
                      <Link2 className="size-3 shrink-0 text-faint" />
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                        {l.target_type}
                      </span>
                      <Link
                        href={l.target_href}
                        className="min-w-0 flex-1 truncate text-accent hover:underline"
                      >
                        {l.target_title}
                      </Link>
                      <button
                        onClick={() => removeLink(l.id)}
                        title="Remove link"
                        className="text-faint hover:text-bad sm:opacity-0 sm:group-hover/link:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  {picking ? (
                    <LinkPicker onPick={addLink} onClose={() => setPicking(false)} />
                  ) : (
                    <button
                      onClick={() => setPicking(true)}
                      className="mt-1 flex items-center gap-1 text-[11px] text-faint transition-colors hover:text-accent"
                    >
                      <Plus className="size-3" /> Link an item
                    </button>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end border-t border-line px-5 py-3">
                <button
                  onClick={closeModal}
                  className="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
