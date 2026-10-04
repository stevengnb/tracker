export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "+07:00" — this machine's UTC offset at the given instant. */
export function utcOffset(d: Date): string {
  const mins = -d.getTimezoneOffset(); // getTimezoneOffset() is minutes *behind* UTC
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * "2026-07-28T16:39:02+07:00" — local wall-clock plus an explicit offset, so
 * the value is an unambiguous instant for a client in another timezone.
 * (toISOString() would be unambiguous too, but converts to UTC and loses the
 * local date, which matters for anything paired with a todayStr() date.)
 */
export function isoWithOffset(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${utcOffset(d)}`
  );
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

// Goals are organised per quarter: period = 'YYYY-Q1'..'YYYY-Q4'.
export function currentQuarter(): string {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

export function quarterLabel(period: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(period);
  return m ? `Q${m[2]} ${m[1]}` : period;
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
