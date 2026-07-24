import { useEffect, useState } from "react";

// User UI preferences, persisted client-side (per-browser). Hiding a section
// only affects nav/layout — it never touches the underlying data.
export type Settings = {
  clocks: string[]; // exactly two IANA timezones for the header clock
  clock24h: boolean; // 24-hour vs 12-hour clock
  weekStart: number; // 0 = Sunday, 1 = Monday
  calShowTasks: boolean; // overlay task due-dates on the calendar
  calShowHabits: boolean; // overlay habit markers on the calendar
  sidebarOrder: string[]; // nav hrefs, in display order ([] = default)
  sidebarHidden: string[]; // nav hrefs hidden from the sidebar
  todayOrder: string[]; // Today card keys, in display order
  todayHidden: string[]; // Today card keys hidden
};

export const DEFAULT_SETTINGS: Settings = {
  clocks: ["Asia/Jakarta", "Asia/Seoul"],
  clock24h: true,
  weekStart: 0,
  calShowTasks: true,
  calShowHabits: true,
  sidebarOrder: [],
  sidebarHidden: [],
  todayOrder: [],
  todayHidden: [],
};

const KEY = "portal-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      ...DEFAULT_SETTINGS,
      ...p,
      clocks:
        Array.isArray(p.clocks) && p.clocks.length === 2
          ? p.clocks
          : DEFAULT_SETTINGS.clocks,
      sidebarOrder: Array.isArray(p.sidebarOrder) ? p.sidebarOrder : [],
      sidebarHidden: Array.isArray(p.sidebarHidden) ? p.sidebarHidden : [],
      todayOrder: Array.isArray(p.todayOrder) ? p.todayOrder : [],
      todayHidden: Array.isArray(p.todayHidden) ? p.todayHidden : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("settings:changed"));
}

// Reactive settings for client components; `ready` is false until mounted
// (so SSR renders defaults and there's no hydration mismatch).
export function useSettings(): [Settings, boolean] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setSettings(loadSettings());
    sync();
    setReady(true);
    window.addEventListener("settings:changed", sync);
    window.addEventListener("storage", sync); // cross-tab
    return () => {
      window.removeEventListener("settings:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [settings, ready];
}

// A curated timezone list for the clock pickers (roughly east → west).
export const TIMEZONES = [
  "Pacific/Auckland",
  "Australia/Sydney",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/Moscow",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/London",
  "UTC",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

export function tzLabel(tz: string): string {
  return (tz.split("/").pop() ?? tz).replace(/_/g, " ");
}

// Today-dashboard cards, in default order.
export const TODAY_CARDS: { key: string; label: string }[] = [
  { key: "tasks", label: "Pending tasks" },
  { key: "pins", label: "Pinned links" },
  { key: "events", label: "Today's events" },
  { key: "habits", label: "Habits today" },
  { key: "goals", label: "Goals this month" },
];
