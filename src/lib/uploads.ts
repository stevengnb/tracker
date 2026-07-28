// Shared upload validation for every route that accepts a file. Keeping the
// allowlist and size limit in one place stops the attachment routes from
// drifting away from /api/files (which was the original inconsistency).

// Attachments and files are only ever meant to be images or PDFs.
export const ALLOWED_UPLOAD_MIME: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};

// 25 MB — generous for a screenshot/scan, small enough to cap disk growth.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// Returns an error string when the file should be rejected, or null when OK.
export function validateUpload(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME[file.type]) return "only images and PDFs are allowed";
  if (file.size > MAX_UPLOAD_BYTES) return "file is too large (max 25 MB)";
  return null;
}
