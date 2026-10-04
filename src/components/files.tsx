"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useMounted } from "@/lib/mounted";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Home,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { FileFolder, FileItem } from "@/lib/types";
import { Empty, PageHeader } from "./ui";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";

type FolderRow = FileFolder & { fileCount: number; subCount: number };

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) toast(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const ACCEPT =
  /^image\/(png|jpe?g|gif|webp)$|^application\/pdf$|^application\/(x-)?zip(-compressed)?$|^application\/(x-)?gzip$|^application\/x-(tar|compressed-tar)$|^text\/(x-)?markdown$/;
// Browsers often report an empty or generic MIME for archives / .md, so fall
// back to the extension (matches .tar.gz via its .gz tail).
const ACCEPT_EXT = /\.(zip|gz|tgz|tar|md|markdown)$/i;
function acceptable(f: File) {
  return ACCEPT.test(f.type) || ACCEPT_EXT.test(f.name);
}
// Short uppercase badge shown on the non-image thumbnail card. For archives
// (the generic "zip" kind) show the real extension so .tar.gz isn't mislabelled.
function kindLabel(file: FileItem): string {
  if (file.kind === "pdf") return "PDF";
  if (file.kind === "markdown") return "MD";
  if (file.kind === "zip") {
    const name = file.filename.toLowerCase();
    if (name.endsWith(".tar.gz")) return "TAR.GZ";
    if (name.endsWith(".tgz")) return "TGZ";
    if (name.endsWith(".gz")) return "GZ";
    if (name.endsWith(".tar")) return "TAR";
    return "ZIP";
  }
  return "FILE";
}
function extFor(mime: string) {
  return mime === "application/pdf"
    ? "pdf"
    : mime === "image/jpeg"
      ? "jpg"
      : mime.split("/")[1] || "png";
}
// Pasted screenshots arrive unnamed (or "image.png"); give them a real name.
function named(f: File): File {
  if (f.name && f.name !== "image.png") return f;
  return new File([f], `pasted-${Date.now()}.${extFor(f.type)}`, {
    type: f.type,
  });
}

type FolderOption = { id: number; name: string; label: string };

export function FilesBrowser({
  folderId,
  path,
  folders,
  files,
  allFolders,
  openFile,
}: {
  folderId: number | null;
  path: FileFolder[];
  folders: FolderRow[];
  files: FileItem[];
  allFolders: FolderOption[];
  openFile?: FileItem | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [seedFiles, setSeedFiles] = useState<File[] | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewing, setViewing] = useState<FileItem | null>(openFile ?? null);

  const openUploadWith = (fs: File[]) => {
    setSeedFiles(fs);
    setUploading(true);
  };
  const closeUpload = () => {
    setUploading(false);
    setSeedFiles(null);
  };

  // Paste (⌘/Ctrl+V) an image or PDF anywhere → open the upload dialog pre-filled.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (viewing) return; // don't hijack paste inside the viewer's note field
      const fs: File[] = [];
      for (const it of e.clipboardData?.items ?? []) {
        if (it.kind !== "file") continue;
        const f = it.getAsFile();
        if (f && acceptable(f)) fs.push(named(f));
      }
      if (fs.length) {
        e.preventDefault();
        openUploadWith(fs);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [viewing]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const fs = Array.from(e.dataTransfer.files).filter(acceptable);
    if (fs.length) openUploadWith(fs);
  };

  const createFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    start(async () => {
      await api("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_id: folderId }),
      });
      setFolderName("");
      setAddingFolder(false);
      router.refresh();
    });
  };

  return (
    <div
      className={pending ? "opacity-70" : ""}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          if (!dragActive) setDragActive(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragActive(false);
      }}
      onDrop={onDrop}
    >
      {dragActive && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-accent/10 backdrop-blur-[1px]">
          <div className="rounded-xl border-2 border-dashed border-accent bg-bg/90 px-6 py-4 text-[14px] font-medium text-accent">
            Drop files to upload
          </div>
        </div>
      )}
      <PageHeader
        title="Files"
        subtitle="Upload, drag, or paste (⌘V) images, PDFs, archives, and Markdown — organise them in folders."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingFolder((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
            >
              <FolderPlus className="size-4" /> New folder
            </button>
            <button
              onClick={() => setUploading(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <Upload className="size-4" /> Upload
            </button>
          </div>
        }
      />

      {/* Breadcrumbs */}
      <div className="mb-4 flex flex-wrap items-center gap-1 text-[13px] text-muted">
        <Link
          href="/files"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-line/60 hover:text-text"
        >
          <Home className="size-3.5" /> Files
        </Link>
        {path.map((f, i) => (
          <span key={f.id} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-faint" />
            {i === path.length - 1 ? (
              <span className="px-1.5 py-0.5 font-medium text-text">{f.name}</span>
            ) : (
              <Link
                href={`/files?folder=${f.id}`}
                className="rounded px-1.5 py-0.5 hover:bg-line/60 hover:text-text"
              >
                {f.name}
              </Link>
            )}
          </span>
        ))}
      </div>

      {addingFolder && (
        <form onSubmit={createFolder} className="mb-4 flex gap-2">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none focus:border-accent sm:max-w-xs"
          />
          <button
            disabled={pending}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setAddingFolder(false)}
            className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-muted hover:text-text"
          >
            Cancel
          </button>
        </form>
      )}

      {folders.length === 0 && files.length === 0 ? (
        <Empty>
          This folder is empty. Create a subfolder or upload an image or PDF.
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {folders.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map((f) => (
                <FolderCard key={f.id} folder={f} onChanged={() => router.refresh()} />
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  onOpen={() => setViewing(f)}
                  onChanged={() => router.refresh()}
                  allFolders={allFolders}
                  currentFolderId={folderId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {uploading && (
        <UploadDialog
          // Remount when new files are pasted/dropped while the dialog is open,
          // so the seeded files + title refresh instead of being ignored.
          key={
            seedFiles
              ? seedFiles.map((f) => `${f.name}-${f.size}`).join("|")
              : "manual"
          }
          folderId={folderId}
          initialFiles={seedFiles}
          onClose={closeUpload}
          onDone={() => {
            closeUpload();
            router.refresh();
          }}
        />
      )}

      {viewing && (
        <Viewer
          file={viewing}
          onClose={() => setViewing(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function FolderCard({
  folder,
  onChanged,
}: {
  folder: FolderRow;
  onChanged: () => void;
}) {
  const [, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const rename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    start(async () => {
      await api(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      setEditing(false);
      onChanged();
    });
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: "Delete folder",
      message: `Delete folder "${folder.name}" and everything inside it? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/folders/${folder.id}`, { method: "DELETE" });
      onChanged();
    });
  };

  const count = folder.fileCount + folder.subCount;

  if (editing) {
    return (
      <form
        onSubmit={rename}
        className="flex items-center gap-2 rounded-xl border border-line bg-card p-3"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-[13px] outline-none focus:border-accent"
        />
        <button className="text-[12px] font-medium text-accent">save</button>
      </form>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={`/files?folder=${folder.id}`}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3 transition-colors hover:border-accent"
      >
        <Folder className="size-5 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">
            {folder.name}
          </span>
          <span className="text-[11px] text-faint">
            {count === 0 ? "empty" : `${count} item${count === 1 ? "" : "s"}`}
          </span>
        </span>
      </Link>
      <div className="absolute right-2 top-2 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          title="Rename"
          className="rounded bg-card/80 p-0.5 text-faint hover:text-accent"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={remove}
          title="Delete folder"
          className="rounded bg-card/80 p-0.5 text-faint hover:text-bad"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function FileCard({
  file,
  onOpen,
  onChanged,
  allFolders,
  currentFolderId,
}: {
  file: FileItem;
  onOpen: () => void;
  onChanged: () => void;
  allFolders: FolderOption[];
  currentFolderId: number | null;
}) {
  const [, start] = useTransition();
  const [moving, setMoving] = useState(false);

  const move = (folderId: number | null) => {
    setMoving(false);
    start(async () => {
      await api(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      onChanged();
    });
  };

  const remove = async () => {
    const ok = await confirmDialog({
      message: `Delete "${file.title}"? This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await api(`/api/files/${file.id}`, { method: "DELETE" });
      onChanged();
    });
  };

  const destinations = allFolders.filter((f) => f.id !== currentFolderId);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-accent">
      <button
        onClick={onOpen}
        className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-line/40"
      >
        {file.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/uploads/${file.stored_name}`}
            alt={file.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-faint">
            <FileText className="size-8" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {kindLabel(file)}
            </span>
          </div>
        )}
      </button>
      <div className="flex items-start gap-1 p-2.5">
        <div className="min-w-0 flex-1">
          <button
            onClick={onOpen}
            className="block w-full truncate text-left text-[12px] font-medium hover:text-accent"
            title={file.title}
          >
            {file.title}
          </button>
          {file.note && (
            <p className="mt-0.5 truncate text-[11px] text-faint" title={file.note}>
              {file.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setMoving(true)}
            title="Move to folder"
            className="text-faint transition-colors hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
          >
            <FolderInput className="size-3.5" />
          </button>
          <button
            onClick={remove}
            title="Delete"
            className="text-faint transition-colors hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {moving && (
        <Overlay onClose={() => setMoving(false)}>
          <div
            className="w-full max-w-xs rounded-xl border border-line bg-bg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">Move file</h3>
              <button
                onClick={() => setMoving(false)}
                className="text-faint hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 truncate text-[12px] text-muted">{file.title}</p>
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {currentFolderId != null && (
                <button
                  onClick={() => move(null)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-line/60"
                >
                  <Home className="size-3.5 shrink-0 text-faint" /> Root
                </button>
              )}
              {destinations.map((f) => (
                <button
                  key={f.id}
                  onClick={() => move(f.id)}
                  title={f.label}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-line/60"
                >
                  <Folder className="size-3.5 shrink-0 text-faint" />
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
              {destinations.length === 0 && currentFolderId == null && (
                <p className="px-2 py-2 text-[12px] text-faint">
                  No folders yet — create one first.
                </p>
              )}
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function UploadDialog({
  folderId,
  initialFiles,
  onClose,
  onDone,
}: {
  folderId: number | null;
  initialFiles?: File[] | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  // Title/note only apply to a single-file upload; a batch uses each filename.
  const [title, setTitle] = useState(
    initialFiles?.length === 1 ? initialFiles[0].name : "",
  );
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 1-based index while uploading
  const [pending, start] = useTransition();

  const single = files.length === 1;

  useEffect(() => {
    const f = files.length === 1 ? files[0] : null;
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [files]);

  const pick = (list: FileList | null) => {
    const fs = Array.from(list ?? []);
    if (!fs.length) return;
    setFiles(fs);
    if (fs.length === 1 && !title.trim()) setTitle(fs[0].name);
  };

  const removeAt = (i: number) =>
    setFiles((prev) => prev.filter((_, j) => j !== i));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    start(async () => {
      // One request per file: keeps the server's per-file validation intact
      // and a batch of large files can't blow through the proxy body-size cap.
      const failed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(i + 1);
        const fd = new FormData();
        fd.append("file", f);
        if (folderId != null) fd.append("folder_id", String(folderId));
        fd.append("title", single ? title.trim() || f.name : f.name);
        fd.append("note", single ? note.trim() : "");
        try {
          const res = await fetch("/api/files", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({ ok: false }));
          if (!data.ok)
            failed.push(`${f.name}: ${data.error ?? "upload failed"}`);
        } catch {
          failed.push(`${f.name}: upload failed`);
        }
      }
      setProgress(0);
      if (failed.length) toast(failed.join(" · "));
      // Anything that made it should show up — only stay open on total failure.
      if (failed.length < files.length) onDone();
    });
  };

  return (
    <Overlay onClose={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-line bg-bg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Upload file</h2>
          <button type="button" onClick={onClose} className="text-faint hover:text-text">
            <X className="size-5" />
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted hover:border-accent">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="max-h-32 rounded-md object-contain"
            />
          ) : (
            <Upload className="size-5 text-faint" />
          )}
          {files.length === 0 ? (
            <span>
              Choose, drop, or paste images, PDFs, archives, or Markdown files
            </span>
          ) : single ? (
            <span className="break-all font-medium text-text">
              {files[0].name}
            </span>
          ) : (
            <span className="font-medium text-text">
              {files.length} files selected
            </span>
          )}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/zip,application/gzip,application/x-tar,text/markdown,.zip,.gz,.tgz,.tar,.tar.gz,.md,.markdown"
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />
        </label>

        {files.length > 1 && (
          <ul className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-line">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[12px] last:border-0"
              >
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove ${f.name}`}
                  className="shrink-0 text-faint hover:text-bad"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {files.length <= 1 && (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mt-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              rows={2}
              className="mt-2 w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
            />
          </>
        )}

        <div className="mt-4 flex gap-2">
          <button
            disabled={!files.length || pending}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending
              ? files.length > 1
                ? `Uploading ${progress}/${files.length}…`
                : "Uploading…"
              : files.length > 1
                ? `Upload ${files.length} files`
                : "Upload"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-[13px] text-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function Viewer({
  file,
  onClose,
  onChanged,
}: {
  file: FileItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [, start] = useTransition();
  const [title, setTitle] = useState(file.title);
  const [note, setNote] = useState(file.note ?? "");
  // Baseline of what's persisted, tracked locally since the parent's `file`
  // prop is stale until the next full refresh.
  const saved = useRef({ title: file.title, note: file.note ?? "" });
  const src = `/uploads/${file.stored_name}`;

  // Markdown is rendered in-app (themed via .wiki-prose) instead of an iframe:
  // the browser's built-in text viewer follows the OS colour scheme, not the
  // app's, so dark-mode users got white text on the viewer's white background.
  const [md, setMd] = useState<string | null>(null);
  useEffect(() => {
    if (file.kind !== "markdown") return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (!cancelled) setMd(text);
      })
      .catch(() => {
        if (!cancelled) setMd("*Couldn’t load this file.*");
      });
    return () => {
      cancelled = true;
    };
  }, [file.kind, src]);

  const save = () => {
    const t = title.trim();
    if (!t) {
      setTitle(saved.current.title); // title can't be empty — revert
      return;
    }
    if (t === saved.current.title && note === saved.current.note) return;
    start(async () => {
      await api(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, note }),
      });
      saved.current = { title: t, note };
      onChanged();
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-[14px] font-semibold outline-none focus:bg-line/40"
          />
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={src}
              download={file.filename}
              className="flex items-center gap-1 text-[12px] text-muted hover:text-accent"
              title="Download"
            >
              <Download className="size-4" />
            </a>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-muted hover:text-accent"
            >
              Open
            </a>
            <button onClick={onClose} className="text-faint hover:text-text">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-line/30 p-2">
          {file.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={file.title}
              className="max-h-[70vh] max-w-full object-contain"
            />
          ) : file.kind === "zip" ? (
            <div className="flex flex-col items-center gap-3 p-8 text-faint">
              <FileText className="size-12" />
              <span className="text-sm">
                Archives can’t be previewed — download to open.
              </span>
              <a
                href={src}
                download={file.filename}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium hover:border-accent hover:text-accent"
              >
                <Download className="size-4" /> Download
              </a>
            </div>
          ) : file.kind === "markdown" ? (
            <div className="h-[70vh] w-full overflow-auto rounded-md border border-line bg-bg px-5 py-4">
              {md != null ? (
                <article className="wiki-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {md}
                  </ReactMarkdown>
                </article>
              ) : (
                <p className="text-sm text-faint">Loading…</p>
              )}
            </div>
          ) : (
            <iframe
              src={src}
              title={file.title}
              className="h-[70vh] w-full rounded-md bg-white"
            />
          )}
        </div>

        <div className="border-t border-line px-4 py-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={save}
            placeholder="Add a note…"
            rows={2}
            className="w-full resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none placeholder:text-faint focus:border-accent"
          />
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const mounted = useMounted();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body,
  );
}
