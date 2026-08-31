"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/lib/mounted";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { subscribeToast, type ToastItem } from "@/lib/toast";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const mounted = useMounted();

  useEffect(
    () =>
      subscribeToast((t) => {
        setItems((prev) => [...prev, t]);
        setTimeout(
          () => setItems((prev) => prev.filter((x) => x.id !== t.id)),
          4500,
        );
      }),
    [],
  );

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((x) => x.id !== id));

  if (!mounted) return null;
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-xs flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="snack-in flex items-start gap-2.5 rounded-xl border border-line bg-card px-3.5 py-3 shadow-lg"
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
          ) : t.kind === "info" ? (
            <Info className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-bad" />
          )}
          <span className="min-w-0 flex-1 text-[13px] leading-snug">
            {t.message}
          </span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="text-faint transition-colors hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
