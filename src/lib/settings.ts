import { useEffect, useState } from "react";
import { toast } from "./toast";

// User UI preferences, shared across devices: the source of truth is the
// `app_settings` row (via /api/settings); localStorage is only a cache so the
// first paint uses your settings instead of the defaults. Hiding a section
// only affects nav/layout — it never touches the underlying data.
export {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type Settings,
} from "./settingsCore";
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./settingsCore";

const KEY = "portal-settings";

function readCache(): Settings | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  window.dispatchEvent(new Event("settings:changed"));
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  return readCache() ?? DEFAULT_SETTINGS;
}

function pushToServer(s: Settings) {
  return fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  })
    .then((r) => r.json())
    .then((d) => {
      if (!d.ok) throw new Error(d.error);
    });
}

export function saveSettings(s: Settings) {
  writeCache(s);
  pushToServer(s).catch((e) =>
    toast(`Settings not synced: ${e instanceof Error ? e.message : e}`),
  );
}

// Pull the shared settings once per page load. If the server has none yet,
// seed it from this browser's existing (pre-sync) settings so nothing is lost.
let pulled: Promise<void> | null = null;
function pullFromServer() {
  pulled ??= fetch("/api/settings")
    .then((r) => r.json())
    .then((d) => {
      if (!d.ok) return;
      if (d.settings) writeCache(normalizeSettings(d.settings));
      else {
        const local = readCache();
        if (local) return pushToServer(local);
      }
    })
    .catch(() => {
      pulled = null; // offline/transient — retry on the next mount
    });
  return pulled;
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
    pullFromServer();
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
  { key: "goals", label: "Goals this quarter" },
  { key: "challenge", label: "Today's challenge" },
];

// Cards that span the full width of the Today grid on large screens.
export const TODAY_WIDE_CARDS = new Set(["tasks"]);
