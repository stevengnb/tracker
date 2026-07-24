export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function dayName(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
  });
}

export function fmtMedium(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function currentMonth(): string {
  return todayStr().slice(0, 7);
}

export function monthLabel(month: string): string {
  return new Date(month + "-15T12:00:00").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

// Shift a "YYYY-MM" month by delta months.
export function monthShift(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Short weekday labels ordered for the given week start (0=Sun, 1=Mon).
export function weekdayLabels(weekStart = 0): string[] {
  const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return [...base.slice(weekStart), ...base.slice(0, weekStart)];
}

// The 42 ISO days (6 weeks) covering a "YYYY-MM" month grid, honoring weekStart.
export function monthGridDays(month: string, weekStart = 0): string[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(y, m - 1, 1 - startDow);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return days;
}
