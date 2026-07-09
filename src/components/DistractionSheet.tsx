"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, X } from "lucide-react";
import { addDays, dayName, fmtMedium, todayStr } from "@/lib/dates";

type Status = "idle" | "loading" | "saving" | "saved";

// A per-day "distraction sheet" for jotting thoughts. Slides in from the right
// (portaled to body so the header's backdrop-filter doesn't clip it), with a
// custom ‹ day/date › navigator instead of the native date input. Autosaves.
export function DistractionSheet() {
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false); // portal present (through slide-out)
  const [shown, setShown] = useState(false); // slid-in vs off-screen
  const [date, setDate] = useState(todayStr());
  const [showCal, setShowCal] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Trigger the slide-in on the frame after the panel mounts.
  useEffect(() => {
    if (!render) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [render]);

  // Load the sheet when it opens or the date changes.
  useEffect(() => {
    if (!render) return;
    let cancelled = false;
    dirty.current = false;
    setStatus("loading");
    fetch(`/api/notes?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setContent(d.content ?? "");
          setStatus("idle");
        }
      })
      .catch(() => !cancelled && setStatus("idle"));
    return () => {
      cancelled = true;
    };
  }, [render, date]);

  useEffect(() => {
    document.body.style.overflow = render ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [render]);

  const save = (value: string, forDate: string) => {
    setStatus("saving");
    fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: forDate, content: value }),
    })
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? "saved" : "idle"))
      .catch(() => setStatus("idle"));
  };

  const onChange = (value: string) => {
    setContent(value);
    dirty.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    const forDate = date;
    timer.current = setTimeout(() => save(value, forDate), 600);
  };

  // Flush pending save before leaving the current date.
  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) {
      save(content, date);
      dirty.current = false;
    }
  };

  const goDate = (delta: number) => {
    flush();
    setShowCal(false);
    setDate((d) => addDays(d, delta));
  };

  const pickDate = (d: string) => {
    flush();
    setShowCal(false);
    setDate(d);
  };

  const open = () => setRender(true);
  const close = () => {
    flush();
    setShown(false); // slide out; unmount on transition end
  };

  return (
    <>
      <button
        onClick={open}
        title="Distraction sheet"
        aria-label="Open distraction sheet"
        className="flex size-[30px] items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent hover:text-text"
      >
        <NotebookPen className="size-4" />
      </button>

      {render &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div
              onClick={close}
              className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
            />
            <aside
              onTransitionEnd={(e) => {
                if (e.propertyName === "transform" && !shown) setRender(false);
              }}
              style={{ transform: shown ? "translateX(0)" : "translateX(100%)" }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl transition-transform duration-300 ease-out"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <NotebookPen className="size-4 text-accent" />
                  <span className="text-[14px] font-semibold">
                    Distraction sheet
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-faint">
                    {status === "loading"
                      ? "Loading…"
                      : status === "saving"
                        ? "Saving…"
                        : status === "saved"
                          ? "Saved"
                          : ""}
                  </span>
                  <button
                    onClick={close}
                    aria-label="Close"
                    className="text-muted hover:text-text"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Custom date navigator: ‹ day/date › */}
              <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <button
                  onClick={() => goDate(-1)}
                  aria-label="Previous day"
                  className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-text"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setShowCal((v) => !v)}
                  title="Pick a date"
                  className="rounded-lg px-3 py-1 text-center leading-tight transition-colors hover:bg-line/60"
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
                    {dayName(date)}
                    {date === todayStr() && " · Today"}
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums">
                    {fmtMedium(date)}
                  </div>
                </button>
                <button
                  onClick={() => goDate(1)}
                  aria-label="Next day"
                  className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-text"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {showCal && <MiniCalendar value={date} onPick={pickDate} />}

              <textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Dump whatever's on your mind…"
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-faint"
              />
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Custom month-grid picker (no native calendar UI) for jumping to any date.
function MiniCalendar({
  value,
  onPick,
}: {
  value: string;
  onPick: (iso: string) => void;
}) {
  const [vy, vm] = value.split("-").map(Number);
  const [view, setView] = useState({ y: vy, m: vm - 1 }); // m: 0-11
  const today = todayStr();

  const first = new Date(view.y, view.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const label = first.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const step = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  return (
    <div className="fade-in mx-3 mb-2 rounded-xl border border-line bg-card p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-line/60 hover:text-text"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[12px] font-medium">{label}</span>
        <button
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-line/60 hover:text-text"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-faint">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const ds = iso(view.y, view.m, d);
          const selected = ds === value;
          const isToday = ds === today;
          return (
            <button
              key={i}
              onClick={() => onPick(ds)}
              className={`flex aspect-square items-center justify-center rounded-md text-[12px] tabular-nums transition-colors ${
                selected
                  ? "bg-accent font-semibold text-white"
                  : isToday
                    ? "font-semibold text-accent hover:bg-line/60"
                    : "text-text hover:bg-line/60"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
