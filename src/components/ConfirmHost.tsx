"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/lib/mounted";
import { createPortal } from "react-dom";
import { registerConfirm, type ConfirmRequest } from "@/lib/confirm";

export function ConfirmHost() {
  const [active, setActive] = useState<ConfirmRequest | null>(null);
  const mounted = useMounted();

  useEffect(() => registerConfirm((req) => setActive(req)), []);

  const close = (ok: boolean) => {
    active?.resolve(ok);
    setActive(null);
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!mounted || !active) return null;
  const { opts } = active;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-bg p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-[15px] font-semibold">
          {opts.title ?? "Are you sure?"}
        </h2>
        <p className="text-[13px] leading-relaxed text-muted">{opts.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => close(false)}
            className="rounded-lg border border-line px-3.5 py-2 text-[13px] text-muted transition-colors hover:text-text"
          >
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            autoFocus
            onClick={() => close(true)}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 ${
              opts.danger ? "bg-bad" : "bg-accent"
            }`}
          >
            {opts.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
