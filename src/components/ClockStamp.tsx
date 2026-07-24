"use client";

import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import JSZip from "jszip";
import { Download, ImagePlus, Trash2, X } from "lucide-react";
import { Empty, PageHeader } from "./ui";
import { toast } from "@/lib/toast";

type Opts = { fontPx: number; color: string; yPos: number; shadow: boolean };
type Item = {
  id: string;
  name: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  time: string; // "HH:MM"
};

const DEFAULT_OPTS: Opts = {
  fontPx: 44,
  color: "#ffffff",
  yPos: 0.5,
  shadow: false,
};

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

async function exifTime(file: File): Promise<string> {
  try {
    const d = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const dt = d?.DateTimeOriginal ?? d?.CreateDate;
    if (dt instanceof Date && !isNaN(dt.getTime())) return fmt(dt);
  } catch {
    // no/unreadable EXIF — fall through
  }
  return fmt(new Date(file.lastModified));
}

// Draw the photo + centered [HH:MM] onto a context at full resolution.
function drawStamp(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  w: number,
  h: number,
  time: string,
  o: Opts,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (!time) return;
  const fontSize = Math.max(6, Math.round(o.fontPx));
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (o.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = fontSize * 0.18;
    ctx.shadowOffsetY = Math.round(fontSize * 0.04);
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.fillStyle = o.color;
  ctx.fillText(`[${time}]`, w / 2, h * o.yPos);
  ctx.shadowColor = "transparent";
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function ClockStamp() {
  const [items, setItems] = useState<Item[]>([]);
  const [opts, setOpts] = useState<Opts>(DEFAULT_OPTS);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const addFiles = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setBusy(true);
    for (const file of imgs) {
      try {
        const [time, bitmap] = await Promise.all([
          exifTime(file),
          createImageBitmap(file, { imageOrientation: "from-image" }).catch(() =>
            createImageBitmap(file),
          ),
        ]);
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.(jpe?g|png|webp)$/i, "") + "-stamped.jpg",
            bitmap,
            width: bitmap.width,
            height: bitmap.height,
            time,
          },
        ]);
      } catch {
        toast(`Couldn't read ${file.name}`);
      }
    }
    setBusy(false);
  };

  const setTime = (id: string, time: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, time } : it)));

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id));

  const downloadAll = async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const it of items) {
        const canvas = document.createElement("canvas");
        canvas.width = it.width;
        canvas.height = it.height;
        drawStamp(canvas.getContext("2d")!, it.bitmap, it.width, it.height, it.time, opts);
        const blob: Blob = await new Promise((res) =>
          canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
        );
        zip.file(it.name, blob);
      }
      triggerDownload(
        await zip.generateAsync({ type: "blob" }),
        "stamped-photos.zip",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Clock Stamp"
        subtitle="Bulk-stamp photos with [HH:MM] from each photo's capture time. Runs in your browser — nothing is uploaded."
      />

      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`mb-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center text-[13px] transition-colors ${
          drag ? "border-accent bg-accent-soft" : "border-line text-muted hover:border-accent"
        }`}
      >
        <ImagePlus className="size-6 text-faint" />
        <span className="font-medium text-text">
          Drop photos here, or click to choose
        </span>
        <span className="text-[12px] text-faint">
          Multiple at once. Each is stamped with its own EXIF time.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <>
          {/* Global controls */}
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-card px-4 py-3 text-[12px]">
            <label className="flex items-center gap-2">
              <span className="text-muted">Size</span>
              <input
                type="range"
                min={12}
                max={160}
                step={2}
                value={opts.fontPx}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, fontPx: Number(e.target.value) }))
                }
              />
              <span className="w-10 tabular-nums text-faint">{opts.fontPx}px</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted">Vertical</span>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.02}
                value={opts.yPos}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, yPos: Number(e.target.value) }))
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-muted">Colour</span>
              {["#ffffff", "#000000", "#facc15"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setOpts((o) => ({ ...o, color: c }))}
                  className={`size-5 rounded-full border border-line ${opts.color === c ? "ring-2 ring-accent ring-offset-1 ring-offset-bg" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={opts.color}
                onChange={(e) => setOpts((o) => ({ ...o, color: e.target.value }))}
                className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={opts.shadow}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, shadow: e.target.checked }))
                }
              />
              <span className="text-muted">Shadow</span>
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setItems([])}
                className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:text-text"
              >
                <Trash2 className="size-3.5" /> Clear
              </button>
              <button
                onClick={downloadAll}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 font-medium text-white disabled:opacity-50"
              >
                <Download className="size-4" /> Download all ({items.length})
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <StampCard
                key={it.id}
                item={it}
                opts={opts}
                onTime={(t) => setTime(it.id, t)}
                onRemove={() => removeItem(it.id)}
              />
            ))}
          </div>
        </>
      )}

      {items.length === 0 && !busy && (
        <Empty>Add photos above to stamp them with their capture time.</Empty>
      )}
    </div>
  );
}

function StampCard({
  item,
  opts,
  onTime,
  onRemove,
}: {
  item: Item;
  opts: Opts;
  onTime: (t: string) => void;
  onRemove: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live preview: redraw whenever time or style changes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = item.width;
    c.height = item.height;
    drawStamp(
      c.getContext("2d")!,
      item.bitmap,
      item.width,
      item.height,
      item.time,
      opts,
    );
  }, [item.bitmap, item.width, item.height, item.time, opts]);

  const download = () =>
    canvasRef.current?.toBlob(
      (b) => b && triggerDownload(b, item.name),
      "image/jpeg",
      0.92,
    );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-card">
      <div className="relative bg-line/30">
        <canvas ref={canvasRef} className="block max-h-72 w-full object-contain" />
        <button
          onClick={onRemove}
          title="Remove"
          className="absolute right-1.5 top-1.5 rounded-md bg-black/50 p-1 text-white/90 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 p-2.5">
        <span className="text-[11px] text-faint">Time</span>
        <input
          value={item.time}
          onChange={(e) => onTime(e.target.value)}
          placeholder="HH:MM"
          className="w-20 rounded-md border border-line bg-bg px-2 py-1 text-[13px] tabular-nums outline-none focus:border-accent"
        />
        <button
          onClick={download}
          className="ml-auto flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted hover:border-accent hover:text-text"
        >
          <Download className="size-3.5" /> Save
        </button>
      </div>
    </div>
  );
}
