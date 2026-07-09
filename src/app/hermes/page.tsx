import {
  Clock,
  Cpu,
  Database,
  HardDrive,
  Radio,
  Timer,
  Wrench,
} from "lucide-react";
import {
  cronJobs,
  gatewayLogTail,
  gatewayStatus,
  getSystemHealth,
} from "@/lib/system";
import {
  fmtCronTime,
  fmtDuration,
  fmtEpoch,
  fmtTokens,
  getHermesActivity,
} from "@/lib/hermesDb";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hermes" };

export default async function HermesPage(props: {
  searchParams: Promise<{ log_lines?: string }>;
}) {
  const sp = await props.searchParams;
  const logLines = Number(sp.log_lines) || 25;
  const health = getSystemHealth();
  const log = gatewayLogTail(logLines);
  const gateway = gatewayStatus();
  const activity = getHermesActivity();
  const cron = cronJobs();

  return (
    <div>
      <PageHeader
        title="Hermes"
        subtitle="Agent activity, token spend, and system health."
      />

      {/* System health strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 !p-3.5">
          <HardDrive className="size-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-faint">Disk</p>
            <p className="truncate text-[13px] font-medium tabular-nums">{health.disk}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-3.5">
          <Cpu className="size-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-faint">RAM</p>
            <p className="truncate text-[13px] font-medium tabular-nums">{health.ram}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-3.5">
          <Timer className="size-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-faint">Uptime</p>
            <p className="truncate text-[13px] font-medium">{health.uptime}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-3.5">
          <Radio className="size-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-faint">Gateway</p>
            <p
              className={`truncate text-[13px] font-medium ${
                gateway === "active"
                  ? "text-good"
                  : gateway === "failed"
                    ? "text-bad"
                    : ""
              }`}
            >
              {gateway}
            </p>
          </div>
        </Card>
      </div>

      {/* Recent sessions */}
      <Card className="mb-5">
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
          <Database className="size-4 text-accent" /> Recent sessions
        </h2>
        {activity?.sessions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="pb-2 pr-3 font-medium">Title</th>
                  <th className="pb-2 pr-3 font-medium">Source</th>
                  <th className="pb-2 pr-3 font-medium">Model</th>
                  <th className="pb-2 pr-3 text-right font-medium">Msgs</th>
                  <th className="pb-2 pr-3 text-right font-medium">Tools</th>
                  <th className="pb-2 pr-3 text-right font-medium">Tok in</th>
                  <th className="pb-2 pr-3 text-right font-medium">Tok out</th>
                  <th className="pb-2 pr-3 font-medium">Started</th>
                  <th className="pb-2 font-medium">Dur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activity.sessions.map((s) => (
                  <tr key={s.id} className="text-muted">
                    <td className="max-w-64 truncate py-1.5 pr-3 text-text">
                      {s.title ?? s.id.slice(0, 12)}
                    </td>
                    <td className="py-1.5 pr-3">{s.source}</td>
                    <td className="max-w-40 truncate py-1.5 pr-3">
                      {s.model ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {s.message_count}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {s.tool_call_count}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {fmtTokens(s.input_tokens)}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {fmtTokens(s.output_tokens)}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3">
                      {fmtEpoch(s.started_at)}
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {fmtDuration(s.started_at, s.ended_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            No data — the agent state DB is not readable by this account.
          </Empty>
        )}
      </Card>

      {/* Tools + models */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
            <Wrench className="size-4 text-accent" /> Top tools
          </h2>
          {activity?.topTools.length ? (
            <div className="flex flex-col gap-1.5">
              {activity.topTools.map((t) => {
                const max = activity.topTools[0].n;
                return (
                  <div key={t.tool} className="flex items-center gap-2 text-[12px]">
                    <span className="w-40 truncate text-muted">{t.tool}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(t.n / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums text-muted">
                      {t.n}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>No data.</Empty>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold">By model</h2>
          {activity?.byModel.length ? (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                  <th className="pb-2 pr-3 font-medium">Model</th>
                  <th className="pb-2 pr-3 text-right font-medium">Sessions</th>
                  <th className="pb-2 pr-3 text-right font-medium">Tok in</th>
                  <th className="pb-2 text-right font-medium">Tok out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activity.byModel.map((m) => (
                  <tr key={m.model} className="text-muted">
                    <td className="max-w-52 truncate py-1.5 pr-3 text-text">
                      {m.model}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {m.sessions}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {fmtTokens(m.input_tokens)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fmtTokens(m.output_tokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No data.</Empty>
          )}
        </Card>
      </div>

      {/* Cron jobs */}
      <Card className="mb-5">
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
          <Clock className="size-4 text-accent" /> Cron jobs
        </h2>
        {cron?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {cron.map((j) => (
              <div
                key={j.id}
                className={`rounded-lg border border-line p-3 ${j.status !== "active" ? "opacity-60" : ""}`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {j.name ?? j.id}
                  </span>
                  <Badge tone={j.status === "active" ? "good" : j.status === "error" ? "bad" : "warn"}>
                    {j.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
                  {j.schedule && (
                    <span className="font-mono">{j.schedule}</span>
                  )}
                  <span>next: {fmtCronTime(j.next_run)}</span>
                  <span>
                    last: {fmtCronTime(j.last_run)}
                    {j.last_run?.endsWith("ok") && (
                      <span className="text-good"> ok</span>
                    )}
                  </span>
                  {j.script && <span className="font-mono">{j.script}</span>}
                  {j.deliver && <span>→ {j.deliver}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            No data — listing needs the hermes CLI (runs as the hermes user).
          </Empty>
        )}
      </Card>

      {/* Gateway log tail */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Gateway log tail</h2>
          {log && (
            <a
              href={`/hermes?log_lines=${logLines + 25}`}
              className="text-[12px] text-muted hover:text-accent"
            >
              Load more
            </a>
          )}
        </div>
        {log?.length ? (
          <div className="max-h-96 divide-y divide-line overflow-auto rounded-lg border border-line bg-surface">
            {log.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-1.5 font-mono text-[11px] leading-relaxed"
              >
                <span className="hidden shrink-0 whitespace-nowrap text-faint sm:inline">
                  {e.timestamp}
                </span>
                {e.level && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold ${
                      e.level === "ERROR" || e.level === "CRITICAL"
                        ? "bg-bad-soft text-bad"
                        : e.level === "WARNING"
                          ? "bg-warn-soft text-warn"
                          : e.level === "INFO"
                            ? "bg-accent-soft text-accent"
                            : "bg-line/60 text-muted"
                    }`}
                  >
                    {e.level}
                  </span>
                )}
                {e.module && (
                  <span className="hidden shrink-0 text-faint lg:inline">
                    {e.module}
                  </span>
                )}
                <span className="min-w-0 break-words text-muted">
                  {e.message}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No log data — journal unavailable for hermes-gateway.</Empty>
        )}
      </Card>
    </div>
  );
}
