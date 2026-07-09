"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Home,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { FileFolder, FileItem } from "@/lib/types";
import { Empty, PageHeader } from "./ui";

type FolderRow = FileFolder & { fileCount: number; subCount: number };

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) alert(data.error ?? "Request failed — is the DB writable?");
  return data;
}

const ACCEPT = /^image\/(png|jpe?g|gif|webp)$|^application\/pdf$/;
function acceptable(f: File) {
  return ACCEPT.test(f.type);
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

export function FilesBrowser({
  folderId,
  path,
  folders,
  files,
}: {
  folderId: number | null;
  path: FileFolder[];
  folders: FolderRow[];
  files: FileItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewing, setViewing] = useState<FileItem | null>(null);

  const openUploadWith = (f: File) => {
    setSeedFile(f);
    setUploading(true);
  };
  const closeUpload = () => {
    setUploading(false);
    setSeedFile(null);
  };

  // Paste (⌘/Ctrl+V) an image or PDF anywhere → open the upload dialog pre-filled.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (viewing) return; // don't hijack paste inside the viewer's note field
      for (const it of e.clipboardData?.items ?? []) {
        if (it.kind !== "file") continue;
        const f = it.getAsFile();
        if (!f || !acceptable(f)) continue;
        e.preventDefault();
        openUploadWith(named(f));
        return;
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [viewing]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = Array.from(e.dataTransfer.files).find(acceptable);
    if (f) openUploadWith(f);
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
            Drop image or PDF to upload
          </div>
        </div>
      )}
      <PageHeader
        title="Files"
        subtitle="Upload, drag, or paste (⌘V) images and PDFs — organise them in folders."
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
                />
              ))}
            </div>
          )}
        </div>
      )}

      {uploading && (
        <UploadDialog
          // Remount when a new file is pasted/dropped while the dialog is open,
          // so its seeded file + title refresh instead of being ignored.
          key={seedFile ? `${seedFile.name}-${seedFile.size}` : "manual"}
          folderId={folderId}
          initialFile={seedFile}
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

  const remove = () => {
    if (
      !confirm(
        `Delete folder "${folder.name}" and everything inside it? This can't be undone.`,
      )
    )
      return;
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
}: {
  file: FileItem;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const [, start] = useTransition();

  const remove = () => {
    if (!confirm(`Delete "${file.title}"? This can't be undone.`)) return;
    start(async () => {
      await api(`/api/files/${file.id}`, { method: "DELETE" });
      onChanged();
    });
  };

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
              PDF
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
        <button
          onClick={remove}
          title="Delete"
          className="shrink-0 text-faint hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function UploadDialog({
  folderId,
  initialFile,
  onClose,
  onDone,
}: {
  folderId: number | null;
  initialFile?: File | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [title, setTitle] = useState(initialFile ? initialFile.name : "");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      if (folderId != null) fd.append("folder_id", String(folderId));
      fd.append("title", title.trim() || file.name);
      fd.append("note", note.trim());
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) {
        alert(data.error ?? "Upload failed");
        return;
      }
      onDone();
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
          {file ? (
            <span className="break-all font-medium text-text">{file.name}</span>
          ) : (
            <span>Choose, drop, or paste an image or PDF</span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !title.trim()) setTitle(f.name);
            }}
          />
        </label>

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

        <div className="mt-4 flex gap-2">
          <button
            disabled={!file || pending}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload"}
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      {children}
    </div>
  );
}
