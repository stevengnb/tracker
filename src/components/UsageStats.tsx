import { getPageviewStats } from "@/lib/queries";
import { NAV } from "./nav";
import { Card, Empty } from "./ui";

const LABELS: Record<string, string> = {
  "/settings": "Settings",
  ...Object.fromEntries(NAV.map((n) => [n.href, n.label])),
};

// Server component: shows which sections you actually open (last 30 days).
export function UsageStats() {
  const stats = getPageviewStats(30);
  const max = stats[0]?.n ?? 1;

  return (
    <Card>
      <h2 className="text-[14px] font-semibold">Your usage (last 30 days)</h2>
      <p className="mb-3 mt-0.5 text-[12px] text-muted">
        Which sections you actually open — evidence for what to hide.
      </p>
      {stats.length ? (
        <div className="flex flex-col gap-1.5">
          {stats.map((s) => (
            <div key={s.path} className="flex items-center gap-3 text-[13px]">
              <span className="w-28 shrink-0 truncate">
                {LABELS[s.path] ?? s.path}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round((s.n / max) * 100)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-muted">
                {s.n}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>No visits recorded yet — check back in a few days.</Empty>
      )}
    </Card>
  );
}
