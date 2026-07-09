import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "good" | "bad" | "warn" | "accent";
}) {
  const color =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-bad"
        : tone === "warn"
          ? "text-warn"
          : tone === "accent"
            ? "text-accent"
            : "text-text";
  return (
    <Card className="flex flex-col gap-1 !p-3.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
        {label}
      </span>
      <span className={`text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  tone?: "good" | "bad" | "warn" | "accent" | "neutral";
  dot?: string;
}) {
  const cls =
    tone === "good"
      ? "bg-good-soft text-good"
      : tone === "bad"
        ? "bg-bad-soft text-bad"
        : tone === "warn"
          ? "bg-warn-soft text-warn"
          : tone === "accent"
            ? "bg-accent-soft text-accent"
            : "bg-line/60 text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </span>
  );
}

export function statusTone(
  status: string,
): "good" | "bad" | "warn" | "neutral" {
  if (status === "solved" || status === "done" || status === "watched")
    return "good";
  if (status === "failed" || status === "abandoned" || status === "dropped")
    return "bad";
  if (status === "pending" || status === "to-watch" || status === "active")
    return "warn";
  return "neutral";
}

export function Progress({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-faint">
      {children}
    </div>
  );
}
