import fs from "fs";
import path from "path";

// Read-only browser over a local Markdown vault (e.g. an Obsidian folder).
// Path is configurable; the app never writes to it.
export function vaultDir(): string {
  return process.env.VAULT_DIR ?? path.join(process.cwd(), "vault");
}

export type VaultNode = {
  name: string;
  path: string; // relative to the vault root, POSIX separators
  type: "file" | "dir";
  children?: VaultNode[];
};

// Skip hidden dirs and tool/system folders.
const SKIP_DIRS = new Set([".obsidian", ".trash", ".archive", ".stfolder", ".git"]);

export function buildTree(): VaultNode[] {
  const root = vaultDir();
  const walk = (abs: string, rel: string): VaultNode[] => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return [];
    }
    const dirs: VaultNode[] = [];
    const files: VaultNode[] = [];
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        const children = walk(path.join(abs, e.name), childRel);
        if (children.length)
          dirs.push({ name: e.name, path: childRel, type: "dir", children });
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        files.push({ name: e.name, path: childRel, type: "file" });
      }
    }
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  };
  return walk(root, "");
}

// Guarded read of a .md file under the vault (path traversal + extension check).
export function readVaultFile(relPath: string): string | null {
  const root = vaultDir();
  const target = path.normalize(path.join(root, relPath));
  if (!target.startsWith(root + path.sep)) return null;
  if (!target.toLowerCase().endsWith(".md")) return null;
  try {
    return fs.readFileSync(target, "utf-8");
  } catch {
    return null;
  }
}

export function allFiles(nodes: VaultNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (n.type === "file") acc.push(n.path);
    else if (n.children) allFiles(n.children, acc);
  }
  return acc;
}

// basename (lowercased, no extension) -> relpath, for [[wikilink]] resolution.
export function linkIndex(files: string[]): Record<string, string> {
  const idx: Record<string, string> = {};
  for (const p of files) {
    const base = (p.split("/").pop() ?? "").replace(/\.md$/i, "").toLowerCase();
    if (base && !(base in idx)) idx[base] = p;
  }
  return idx;
}

// Drop a leading YAML frontmatter block so it doesn't render as text.
export function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  const nl = md.indexOf("\n", end + 1);
  return nl === -1 ? "" : md.slice(nl + 1);
}

// Turn [[Target]] / [[Target|alias]] (and ![[embed]]) into standard links to
// /wiki?path=…; unresolved links degrade to their plain label text.
export function preprocessWikiLinks(
  md: string,
  idx: Record<string, string>,
): string {
  return md.replace(/!?\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const [targetRaw, alias] = inner.split("|");
    const base = (targetRaw.split("#")[0].split("/").pop() ?? "").trim();
    const label = (alias ?? targetRaw).trim();
    const rel = idx[base.toLowerCase()];
    return rel ? `[${label}](/wiki?path=${encodeURIComponent(rel)})` : label;
  });
}
