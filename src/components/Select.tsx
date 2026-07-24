"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

// A styled dropdown that replaces native <select> for consistent UI.
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className = "",
  buttonClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-card px-2.5 py-2 text-[13px] outline-none transition-colors hover:border-accent/60 focus:border-accent disabled:opacity-50 ${buttonClassName}`}
      >
        <span className={current ? "truncate text-text" : "truncate text-faint"}>
          {current?.label ?? placeholder ?? "Select…"}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="fade-in absolute left-0 z-30 mt-1 max-h-60 min-w-full overflow-y-auto whitespace-nowrap rounded-lg border border-line bg-card p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-line/60 ${
                o.value === value ? "text-accent" : "text-text"
              }`}
            >
              {o.label}
              {o.value === value && <Check className="size-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
