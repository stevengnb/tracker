import Link from "next/link";
import {
  getExperimentAttachments,
  getExperimentCounts,
  getExperiments,
} from "@/lib/queries";
import { Empty, PageHeader } from "@/components/ui";
import { AddExperiment, ExperimentCard } from "@/components/experiments";

export const dynamic = "force-dynamic";

export const metadata = { title: "Experiments" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "to-try", label: "To try" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "abandoned", label: "Abandoned" },
];

export default async function ExperimentsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const status = sp.status ?? "all";
  const experiments = getExperiments(status);
  const attachments = getExperimentAttachments(experiments.map((x) => x.id));
  const counts = getExperimentCounts();

  return (
    <div>
      <PageHeader
        title="Experiments"
        subtitle="Things to try — with the proof and what came of them."
      />

      <div className="mb-4">
        <AddExperiment />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/experiments?status=${f.value}`}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              status === f.value
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-line/60"
            }`}
          >
            {f.label}
            {counts[f.value] ? (
              <span className="ml-1 text-faint">{counts[f.value]}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {experiments.length ? (
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {experiments.map((x) => (
            <ExperimentCard
              key={x.id}
              experiment={x}
              attachments={attachments.filter((a) => a.experiment_id === x.id)}
            />
          ))}
        </div>
      ) : (
        <Empty>
          No experiments{status !== "all" ? " with this status" : " yet"}. Add one
          to start tracking what you try.
        </Empty>
      )}
    </div>
  );
}
