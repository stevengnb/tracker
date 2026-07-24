"use client";

import { useEffect, useState } from "react";
import { tzLabel, useSettings } from "@/lib/settings";

// Live dual-timezone clock for the header (timezones set in Settings).
export function Clock() {
  const [settings] = useSettings();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  const time = (tz: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: !settings.clock24h,
    }).format(now);

  return (
    <div className="hidden items-center gap-3 border-l border-line pl-3 text-[12px] tabular-nums sm:flex">
      {settings.clocks.map((tz) => (
        <span key={tz} className="flex items-center gap-1.5" title={tz}>
          <span className="text-faint">{tzLabel(tz)}</span>
          <span className="font-medium text-text">{time(tz)}</span>
        </span>
      ))}
    </div>
  );
}
