"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// A visit only counts once the page has stayed open this long, so rapidly
// clicking through the sidebar doesn't inflate the stats.
const DWELL_MS = 3000;

// Collapse a pathname to its top-level section (so /challenge/42 counts as
// /challenges), for self-analytics on which areas you actually open.
function section(p: string): string {
  if (p === "/") return "/";
  const seg = p.split("/")[1] ?? "";
  return seg === "challenge" ? "/challenges" : `/${seg}`;
}

export function PageviewLogger() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const path = section(pathname);
    if (last.current === path) return; // only log real section changes
    const t = setTimeout(() => {
      last.current = path;
      fetch("/api/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      }).catch(() => {});
    }, DWELL_MS);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
