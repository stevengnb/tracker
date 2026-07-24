"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  type LucideIcon,
} from "lucide-react";
import { NAV } from "./nav";
import { Select } from "./Select";
import { Card } from "./ui";
import { toast } from "@/lib/toast";
import {
  DEFAULT_SETTINGS,
  saveSettings,
  TIMEZONES,
  TODAY_CARDS,
  tzLabel,
  useSettings,
  type Settings,
} from "@/lib/settings";

// Format a backup dir name "YYYY-MM-DD_HHMMSS" into a readable timestamp.
function fmtStamp(s: string | null): string {
  if (!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!m) return s;
  const [, y, mo, d, hh, mm] = m;
  return new Date(`${y}-${mo}-${d}T${hh}:${mm}:00`).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center justify-between py-1.5 text-[13px]"
    >
      <span>{label}</span>
      <span
        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          on ? "justify-end bg-accent" : "justify-start bg-faint/40"
        }`}
      >
        <span className="size-4 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

// A reorderable / hideable list (used for both sidebar sections and Today cards).
function ArrangeList({
  items,
  hidden,
  onMove,
  onToggle,
}: {
  items: { key: string; label: string; icon?: LucideIcon }[];
  hidden: string[];
  onMove: (index: number, dir: -1 | 1) => void;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((it, i) => {
        const isHidden = hidden.includes(it.key);
        const Icon = it.icon;
        return (
          <div
            key={it.key}
            className={`flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 ${
              isHidden ? "opacity-50" : ""
            }`}
          >
            {Icon && <Icon className="size-4 shrink-0 text-muted" />}
            <span className="min-w-0 flex-1 truncate text-[13px]">{it.label}</span>
            <button
              onClick={() => onMove(i, -1)}
              disabled={i === 0}
              title="Move up"
              className="text-faint transition-colors hover:text-text disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              onClick={() => onMove(i, 1)}
              disabled={i === items.length - 1}
              title="Move down"
              className="text-faint transition-colors hover:text-text disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
            <button
              onClick={() => onToggle(it.key)}
              title={isHidden ? "Show" : "Hide"}
              className={`ml-1 transition-colors ${
                isHidden ? "text-faint hover:text-accent" : "text-muted hover:text-bad"
              }`}
            >
              {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function arrange<T extends { key: string }>(all: T[], order: string[]): T[] {
  const byKey = new Map(all.map((a) => [a.key, a]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const k of order) {
    const a = byKey.get(k);
    if (a && !seen.has(k)) {
      out.push(a);
      seen.add(k);
    }
  }
  for (const a of all) if (!seen.has(a.key)) out.push(a);
  return out;
}

export function SettingsForm() {
  const [settings, ready] = useSettings();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetch("/api/backup")
      .then((r) => r.json())
      .then((d) => d.ok && setLastBackup(d.last))
      .catch(() => {});
  }, []);

  if (!ready) return null;

  const update = (patch: Partial<Settings>) =>
    saveSettings({ ...settings, ...patch });

  const setClock = (i: number, tz: string) => {
    const clocks = [...settings.clocks];
    clocks[i] = tz;
    update({ clocks });
  };

  const backupNow = async () => {
    setBackingUp(true);
    try {
      const r = await fetch("/api/backup", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        toast("Backup created", "success");
        const g = await (await fetch("/api/backup")).json();
        if (g.ok) setLastBackup(g.last);
      } else toast(d.error ?? "Backup failed");
    } catch {
      toast("Backup failed");
    }
    setBackingUp(false);
  };

  // Sidebar arrange
  const sidebarItems = arrange(
    NAV.map((n) => ({ key: n.href, label: n.label, icon: n.icon })),
    settings.sidebarOrder,
  );
  const moveSidebar = (i: number, dir: -1 | 1) => {
    const keys = sidebarItems.map((n) => n.key);
    const j = i + dir;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    update({ sidebarOrder: keys });
  };
  const toggleSidebar = (key: string) =>
    update({
      sidebarHidden: settings.sidebarHidden.includes(key)
        ? settings.sidebarHidden.filter((h) => h !== key)
        : [...settings.sidebarHidden, key],
    });

  // Today arrange
  const todayItems = arrange(TODAY_CARDS, settings.todayOrder);
  const moveToday = (i: number, dir: -1 | 1) => {
    const keys = todayItems.map((c) => c.key);
    const j = i + dir;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    update({ todayOrder: keys });
  };
  const toggleToday = (key: string) =>
    update({
      todayHidden: settings.todayHidden.includes(key)
        ? settings.todayHidden.filter((h) => h !== key)
        : [...settings.todayHidden, key],
    });

  const tzOptions = TIMEZONES.map((tz) => ({
    value: tz,
    label: `${tzLabel(tz)} — ${tz}`,
  }));

  return (
    <div className="flex w-full flex-col gap-6">
      <Card>
        <h2 className="text-[14px] font-semibold">Header clocks</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-muted">
          Two timezones shown next to the date.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1">
              <span className="mb-1 block text-[11px] text-faint">
                Clock {i + 1}
              </span>
              <Select
                value={settings.clocks[i]}
                onChange={(v) => setClock(i, v)}
                options={tzOptions}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold">Format</h2>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px]">Week starts on</span>
            <Select
              value={String(settings.weekStart)}
              onChange={(v) => update({ weekStart: Number(v) })}
              className="w-36"
              options={[
                { value: "0", label: "Sunday" },
                { value: "1", label: "Monday" },
              ]}
            />
          </div>
          <Toggle
            label="24-hour clock"
            on={settings.clock24h}
            onClick={() => update({ clock24h: !settings.clock24h })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold">Calendar overlays</h2>
        <p className="mb-1 mt-0.5 text-[12px] text-muted">
          What to show on the calendar besides events.
        </p>
        <Toggle
          label="Show task due-dates"
          on={settings.calShowTasks}
          onClick={() => update({ calShowTasks: !settings.calShowTasks })}
        />
        <Toggle
          label="Show habit markers"
          on={settings.calShowHabits}
          onClick={() => update({ calShowHabits: !settings.calShowHabits })}
        />
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold">Today dashboard</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-muted">
          Reorder or hide the cards on your Today page.
        </p>
        <ArrangeList
          items={todayItems}
          hidden={settings.todayHidden}
          onMove={moveToday}
          onToggle={toggleToday}
        />
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold">Sidebar sections</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-muted">
          Reorder or hide sections. Hiding only removes it from the menu — your
          data is never deleted.
        </p>
        <ArrangeList
          items={sidebarItems}
          hidden={settings.sidebarHidden}
          onMove={moveSidebar}
          onToggle={toggleSidebar}
        />
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold">Data &amp; backup</h2>
        <p className="mb-3 mt-0.5 text-[12px] text-muted">
          Last local backup:{" "}
          <span className="text-text">{fmtStamp(lastBackup)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={backupNow}
            disabled={backingUp}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="size-4" /> {backingUp ? "Backing up…" : "Back up now"}
          </button>
          <a
            href="/api/export?format=db"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
          >
            <Download className="size-4" /> Download database
          </a>
          <a
            href="/api/export?format=json"
            className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
          >
            <Download className="size-4" /> Download JSON
          </a>
        </div>
      </Card>

      <button
        onClick={() => saveSettings(DEFAULT_SETTINGS)}
        className="flex items-center gap-1.5 self-start rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text"
      >
        <RotateCcw className="size-4" /> Reset to defaults
      </button>
    </div>
  );
}
