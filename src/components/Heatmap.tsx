import { addDays, todayStr } from "@/lib/dates";

// GitHub-style activity calendar. Server component — pure markup.
export function Heatmap({
  days,
  values,
  title,
}: {
  days: number;
  values: Map<string, "solved" | "failed" | "pending" | "expired">;
  title?: string;
}) {
  const today = todayStr();
  const start = addDays(today, -(days - 1));
  // Pad back to Monday so columns are whole weeks.
  const startDow = (new Date(start + "T12:00:00").getDay() + 6) % 7;
  const first = addDays(start, -startDow);
  const cells: { date: string; state: string }[] = [];
  let d = first;
  while (d <= today) {
    cells.push({
      date: d,
      state: d < start ? "pad" : (values.get(d) ?? "none"),
    });
    d = addDays(d, 1);
  }
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const color = (state: string) =>
    state === "solved"
      ? "bg-good"
      : state === "failed"
        ? "bg-bad"
        : state === "pending" || state === "expired"
          ? "bg-warn/60"
          : state === "pad"
            ? "bg-transparent"
            : "bg-line";

  return (
    <div>
      {title && (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-faint">
          {title}
        </p>
      )}
      <div className="flex gap-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-1">
            {week.map((c) => (
              <span
                key={c.date}
                title={c.state === "pad" ? "" : `${c.date}: ${c.state === "none" ? "no challenge" : c.state}`}
                className={`size-3 rounded-[3px] ${color(c.state)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
