"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const KEY = "tasks-filter";

// Remembers the last-used Tasks filter. The sidebar links to a bare /tasks,
// which would otherwise drop the filter every time you leave and come back;
// this restores it. Any active filter is saved; a param-less visit is treated
// as "coming back" and redirected to the saved view.
export function TaskFilterMemory() {
  const router = useRouter();
  const sp = useSearchParams();
  const qs = sp.toString();

  useEffect(() => {
    if (qs) {
      localStorage.setItem(KEY, qs);
      return;
    }
    const saved = localStorage.getItem(KEY);
    // Don't bother restoring the default view (pending / all categories).
    if (saved && saved !== "status=pending") {
      router.replace(`/tasks?${saved}`);
    }
  }, [qs, router]);

  return null;
}
