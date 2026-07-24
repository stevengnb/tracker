import Link from "next/link";
import { getTaskCategories, getTasks } from "@/lib/queries";
import { Card, Empty, PageHeader } from "@/components/ui";
import { QuickAddTask, TaskRow } from "@/components/tasks";
import { TaskFilterMemory } from "@/components/TaskFilterMemory";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tasks" };

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

export default async function TasksPage(props: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const sp = await props.searchParams;
  const status = sp.status ?? "pending";
  const category = sp.category ?? "all";
  const tasks = getTasks({ status, category });
  const categories = getTaskCategories();

  const link = (s: string, c: string) =>
    `/tasks?status=${s}${c !== "all" ? `&category=${encodeURIComponent(c)}` : ""}`;

  return (
    <div className="mx-auto max-w-3xl">
      <TaskFilterMemory />
      <PageHeader title="Tasks" subtitle="Quick to-dos and one-offs." />
      <QuickAddTask categories={categories} />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={link(s.value, category)}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              status === s.value
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-line/60"
            }`}
          >
            {s.label}
          </Link>
        ))}
        {categories.length > 1 && (
          <>
            <span className="mx-1 text-faint">·</span>
            <Link
              href={link(status, "all")}
              className={`rounded-full px-3 py-1 text-[12px] ${category === "all" ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-line/60"}`}
            >
              All categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={link(status, c)}
                className={`rounded-full px-3 py-1 text-[12px] ${category === c ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-line/60"}`}
              >
                {c}
              </Link>
            ))}
          </>
        )}
      </div>

      <Card>
        {tasks.length ? (
          <div className="-mx-2">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <Empty>No tasks here.</Empty>
        )}
      </Card>
    </div>
  );
}
