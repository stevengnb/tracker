"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMounted } from "@/lib/mounted";
import { createPortal } from "react-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { NAV } from "./nav";

type Result = { type: string; title: string; subtitle?: string; href: string };
type Item = { section: string; label: string; sub?: string; run: () => void };

export function CommandPalette() {
  const router = useRouter();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global open shortcut (⌘/Ctrl+K) + a custom event (from the topbar button).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cmdk:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActive(0);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Debounced cross-section search.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const d = await r.json();
        setResults(d.ok ? d.results : []);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => setActive(0), [query, results.length]);

  const close = () => setOpen(false);
  // Pin results carry an external URL rather than an app route — those open
  // in a new tab. Note results (note:YYYY-MM-DD) open the Distraction Sheet
  // drawer on that date via its event. Everything else navigates client-side.
  const go = (href: string) => {
    close();
    if (/^https?:\/\//i.test(href)) window.open(href, "_blank", "noopener");
    else if (href.startsWith("note:"))
      window.dispatchEvent(
        new CustomEvent("distraction:open", { detail: href.slice(5) }),
      );
    else router.push(href);
  };

  const term = query.trim();
  const items: Item[] = [];
  const navTargets = [
    ...NAV.map((n) => ({ href: n.href, label: n.label })),
    { href: "/settings", label: "Settings" },
  ];
  for (const n of navTargets.filter(
    (n) => !term || n.label.toLowerCase().includes(term.toLowerCase()),
  ))
    items.push({ section: "Go to", label: n.label, run: () => go(n.href) });
  for (const r of results)
    items.push({
      section: r.type,
      label: r.title,
      sub: r.subtitle,
      run: () => go(r.href),
    });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      close();
    }
  };

  if (!mounted || !open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3.5">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or jump to…"
            className="w-full bg-transparent py-3 text-[14px] outline-none placeholder:text-faint"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-faint">
              Type to search across everything.
            </p>
          ) : (
            items.map((it, i) => {
              const header = i === 0 || items[i - 1].section !== it.section;
              return (
                <div key={i}>
                  {header && (
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-faint">
                      {it.section}
                    </p>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => it.run()}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                      i === active
                        ? "bg-accent-soft text-accent"
                        : "text-text hover:bg-line/60"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {it.label}
                      {it.sub && <span className="ml-2 text-faint">{it.sub}</span>}
                    </span>
                    {i === active && (
                      <CornerDownLeft className="size-3.5 shrink-0 text-faint" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-3 py-1.5 text-[10px] text-faint">
          <span>↑↓ navigate</span>
          <span>⏎ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
