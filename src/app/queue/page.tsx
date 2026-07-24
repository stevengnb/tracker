import Link from "next/link";
import { getWatchlist } from "@/lib/queries";
import { QUEUE_CATEGORIES, QUEUE_CATEGORY_LABELS } from "@/lib/types";
import { Card, Empty, PageHeader } from "@/components/ui";
import { AddQueueItem, QueueRow } from "@/components/watchlist";

export const dynamic = "force-dynamic";

export const metadata = { title: "Queue" };

const STATUSES: Record<"watch" | "read", { v: string; l: string }[]> = {
  watch: [
    { v: "to-watch", l: "To watch" },
    { v: "watched", l: "Watched" },
    { v: "all", l: "All" },
  ],
  read: [
    { v: "to-read", l: "To read" },
    { v: "read", l: "Read" },
    { v: "all", l: "All" },
  ],
};

function pill(active: boolean) {
  return `rounded-full px-3 py-1 text-[12px] transition-colors ${
    active
      ? "bg-accent-soft font-medium text-accent"
      : "text-muted hover:bg-line/60"
  }`;
}

export default async function QueuePage(props: {
  searchParams: Promise<{
    kind?: string;
    category?: string;
    status?: string;
    item?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const kind = sp.kind === "read" ? "read" : "watch";
  // When linking straight to an item, drop the category/status filters so it's
  // guaranteed visible regardless of where it currently sits, and highlight it.
  const highlightId = sp.item ? Number(sp.item) : null;
  const category = highlightId ? "all" : (sp.category ?? "all");
  const status = highlightId
    ? "all"
    : (sp.status ?? (kind === "read" ? "to-read" : "to-watch"));
  const items = getWatchlist({ kind, category, status });
  const cats = QUEUE_CATEGORIES[kind];

  const link = (k: string, c: string, s: string) =>
    `/queue?kind=${k}&category=${c}&status=${s}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Queue" subtitle="Things to watch and read later." />

      {/* Watch / Read split */}
      <div className="mb-4 flex w-fit gap-1 rounded-lg border border-line bg-card p-1">
        {(["watch", "read"] as const).map((k) => (
          <Link
            key={k}
            href={link(k, "all", k === "read" ? "to-read" : "to-watch")}
            className={`rounded-md px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${
              kind === k
                ? "bg-accent text-white"
                : "text-muted hover:text-text"
            }`}
          >
            {k}
          </Link>
        ))}
      </div>

      <AddQueueItem kind={kind} />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={link(kind, "all", status)} className={pill(category === "all")}>
          All
        </Link>
        {cats.map((c) => (
          <Link key={c} href={link(kind, c, status)} className={pill(category === c)}>
            {QUEUE_CATEGORY_LABELS[c] ?? c}
          </Link>
        ))}
        <span className="mx-1 text-faint">·</span>
        {STATUSES[kind].map((s) => (
          <Link
            key={s.v}
            href={link(kind, category, s.v)}
            className={pill(status === s.v)}
          >
            {s.l}
          </Link>
        ))}
      </div>

      <Card>
        {items.length ? (
          <div className="-mx-2">
            {items.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                highlight={item.id === highlightId}
              />
            ))}
          </div>
        ) : (
          <Empty>Nothing here yet.</Empty>
        )}
      </Card>
    </div>
  );
}
