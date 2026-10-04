// Settings shape, defaults and validation — hook-free so server code (the
// /api/settings route) can import it. Client helpers live in settings.ts.
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

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// Coerce untrusted input (cache or request body) to a valid Settings, keeping
// only known keys. Shared by the client and the /api/settings route.
export function normalizeSettings(raw: unknown): Settings {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const clocks = strings(p.clocks);
  const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
  return {
    clocks: clocks.length === 2 ? clocks : d.clocks,
    clock24h: bool(p.clock24h, d.clock24h),
    weekStart: p.weekStart === 0 || p.weekStart === 1 ? p.weekStart : d.weekStart,
    calShowTasks: bool(p.calShowTasks, d.calShowTasks),
    calShowHabits: bool(p.calShowHabits, d.calShowHabits),
    sidebarOrder: strings(p.sidebarOrder),
    sidebarHidden: strings(p.sidebarHidden),
    todayOrder: strings(p.todayOrder),
    todayHidden: strings(p.todayHidden),
  };
}
