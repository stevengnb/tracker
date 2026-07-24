"use client";

import type { ReactNode } from "react";
import { TODAY_CARDS, useSettings } from "@/lib/settings";

// Arranges the Today dashboard cards per the user's order/hidden preferences.
export function TodayGrid({ cards }: { cards: Record<string, ReactNode> }) {
  const [settings] = useSettings();

  const known = new Set(TODAY_CARDS.map((c) => c.key));
  const seen = new Set<string>();
  const order: string[] = [];
  for (const k of settings.todayOrder)
    if (known.has(k) && !seen.has(k)) {
      order.push(k);
      seen.add(k);
    }
  for (const c of TODAY_CARDS) if (!seen.has(c.key)) order.push(c.key);
  const visible = order.filter((k) => !settings.todayHidden.includes(k));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {visible.map((k) => (
        <div key={k} className="min-w-0">
          {cards[k]}
        </div>
      ))}
    </div>
  );
}
