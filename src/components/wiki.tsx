"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  PanelLeft,
  Search,
} from "lucide-react";
import type { VaultNode } from "@/lib/vault";
import { Empty, PageHeader } from "./ui";

function flatten(nodes: VaultNode[], acc: VaultNode[] = []): VaultNode[] {
  for (const n of nodes) {
    if (n.type === "file") acc.push(n);
    else if (n.children) flatten(n.children, acc);
  }
  return acc;
}

function ancestors(p: string | null): string[] {
  if (!p) return [];
  const parts = p.split("/");
  parts.pop(); // drop filename
  const res: string[] = [];
  let acc = "";
  for (const seg of parts) {
    acc = acc ? `${acc}/${seg}` : seg;
    res.push(acc);
  }
  return res;
}

const label = (name: string) => name.replace(/\.md$/i, "");

export function WikiBrowser({
  tree,
  current,
  content,
  error,
  empty,
}: {
  tree: VaultNode[];
  current: string | null;
  content: string | null;
  error: string | null;
  empty: boolean;
}) {
  const [q, setQ] = useState("");
  const [showTree, setShowTree] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(ancestors(current)),
  );
  const query = q.trim().toLowerCase();
  const allFileNodes = useMemo(() => flatten(tree), [tree]);

  // Expand the folder chain to the current file when it changes.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const a of ancestors(current)) next.add(a);
      return next;
    });
  }, [current]);

  const toggle = (p: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const results = query
    ? allFileNodes.filter((f) => f.path.toLowerCase().includes(query))
    : null;

  return (
    <div>
      <PageHeader
        title="Wiki"
        subtitle="Browse your Markdown vault (read-only)."
        action={
          <button
            onClick={() => setShowTree((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-text sm:hidden"
          >
            <PanelLeft className="size-4" /> Pages
          </button>
        }
      />

      {empty ? (
        <Empty>
          No vault found. Set <code className="text-accent">VAULT_DIR</code> to a
          folder of Markdown files.
        </Empty>
      ) : (
        <div className="flex gap-5">
          <aside
            className={`${showTree ? "block" : "hidden"} w-full shrink-0 sm:sticky sm:top-16 sm:block sm:w-64 sm:self-start`}
          >
            <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5">
              <Search className="size-3.5 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter pages…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
              />
            </div>
            <div className="mt-2 max-h-[72vh] overflow-y-auto pr-1">
              {results ? (
                results.length ? (
                  results.map((f) => (
                    <FileLink key={f.path} node={f} current={current} depth={0} />
                  ))
                ) : (
                  <p className="px-2 py-3 text-[12px] text-faint">No matches.</p>
                )
              ) : (
                <Tree
                  nodes={tree}
                  current={current}
                  expanded={expanded}
                  toggle={toggle}
                  depth={0}
                />
              )}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {content != null ? (
              <article className="wiki-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            ) : error ? (
              <Empty>{error}</Empty>
            ) : (
              <Empty>Select a page from the list.</Empty>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tree({
  nodes,
  current,
  expanded,
  toggle,
  depth,
}: {
  nodes: VaultNode[];
  current: string | null;
  expanded: Set<string>;
  toggle: (p: string) => void;
  depth: number;
}) {
  return (
    <>
      {nodes.map((n) =>
        n.type === "dir" ? (
          <div key={n.path}>
            <button
              onClick={() => toggle(n.path)}
              style={{ paddingLeft: depth * 12 + 6 }}
              className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] text-muted transition-colors hover:bg-line/60 hover:text-text"
            >
              {expanded.has(n.path) ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )}
              <Folder className="size-3.5 shrink-0 text-faint" />
              <span className="truncate">{n.name}</span>
            </button>
            {expanded.has(n.path) && n.children && (
              <Tree
                nodes={n.children}
                current={current}
                expanded={expanded}
                toggle={toggle}
                depth={depth + 1}
              />
            )}
          </div>
        ) : (
          <FileLink key={n.path} node={n} current={current} depth={depth} />
        ),
      )}
    </>
  );
}

function FileLink({
  node,
  current,
  depth,
}: {
  node: VaultNode;
  current: string | null;
  depth: number;
}) {
  const active = node.path === current;
  return (
    <Link
      href={`/wiki?path=${encodeURIComponent(node.path)}`}
      style={{ paddingLeft: depth * 12 + 26 }}
      className={`flex items-center gap-1.5 rounded-md py-1 pr-2 text-[13px] transition-colors ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-line/60 hover:text-text"
      }`}
      title={node.path}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{label(node.name)}</span>
    </Link>
  );
}
