"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

type Result = { type: string; title: string; subtitle?: string; href: string };

// Reuses the global search to pick any item to link to.
export function LinkPicker({
  onPick,
  onClose,
}: {
  onPick: (r: Result) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const d = await (
          await fetch(`/api/search?q=${encodeURIComponent(t)}`)
        ).json();
        setResults(d.ok ? d.results : []);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="mt-1.5 rounded-lg border border-line bg-card p-1.5">
      <div className="flex items-center gap-1.5 px-1.5">
        <Search className="size-3.5 shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Search anything to link…"
          className="w-full bg-transparent py-1 text-[12px] outline-none placeholder:text-faint"
        />
        <button onClick={onClose} className="text-faint hover:text-text">
          <X className="size-3.5" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-1 max-h-44 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onPick(r)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-line/60"
            >
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                {r.type}
              </span>
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
