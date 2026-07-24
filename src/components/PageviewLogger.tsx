"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
    last.current = path;
    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
