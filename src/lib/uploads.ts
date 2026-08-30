// Shared upload validation for every route that accepts a file. Keeping the
// allowlist and size limit in one place stops the attachment routes from
// drifting away from /api/files (which was the original inconsistency).

// Attachments and files may be images, PDFs, archives, or Markdown docs.
// The "zip" kind is generic "archive" (zip / gzip / tar.gz) — all download-only
// in the viewer. Browsers are inconsistent about MIME types for archives and
// .md, so every plausible spelling maps to the same canonical kind.
export type UploadKind = "image" | "pdf" | "zip" | "markdown";

export const ALLOWED_UPLOAD_MIME: Record<string, UploadKind> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/gzip": "zip",
  "application/x-gzip": "zip",
  "application/x-tar": "zip",
  "application/x-compressed-tar": "zip",
  "text/markdown": "markdown",
  "text/x-markdown": "markdown",
};

// Extension fallback: browsers frequently report an empty or generic MIME
// (e.g. application/octet-stream) for .zip and .md, so the extension is the
// only reliable signal for those. Images and PDFs always carry a real MIME.
const ALLOWED_UPLOAD_EXT: Record<string, UploadKind> = {
  zip: "zip",
  gz: "zip", // covers .gz and the .gz tail of .tar.gz
  tgz: "zip",
  tar: "zip",
  md: "markdown",
  markdown: "markdown",
};

// Resolve a file's canonical kind, preferring the reported MIME and falling
// back to the extension. Returns null when the file isn't an accepted type.
export function resolveUploadKind(file: File): UploadKind | null {
  const byMime = ALLOWED_UPLOAD_MIME[file.type];
  if (byMime) return byMime;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_UPLOAD_EXT[ext] ?? null;
}

// 100 MB — roomy enough for archives/scans while still capping disk growth.
// Note: uploads are buffered fully in memory before this check, so keep an eye
// on per-request memory if this grows much further.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Returns an error string when the file should be rejected, or null when OK.
export function validateUpload(file: File): string | null {
  if (!resolveUploadKind(file))
    return "only images, PDFs, archives (zip/tar.gz), and Markdown files are allowed";
  if (file.size > MAX_UPLOAD_BYTES) return "file is too large (max 100 MB)";
  return null;
}
