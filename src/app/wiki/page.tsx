import {
  allFiles,
  buildTree,
  linkIndex,
  preprocessWikiLinks,
  readVaultFile,
  stripFrontmatter,
} from "@/lib/vault";
import { WikiBrowser } from "@/components/wiki";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wiki" };

export default async function WikiPage(props: {
  searchParams: Promise<{ path?: string }>;
}) {
  const sp = await props.searchParams;
  const tree = buildTree();
  const files = allFiles(tree);

  const current =
    sp.path && files.includes(sp.path)
      ? sp.path
      : files.includes("index.md")
        ? "index.md"
        : (files[0] ?? null);

  let content: string | null = null;
  let error: string | null = null;
  if (current) {
    const raw = readVaultFile(current);
    if (raw == null) {
      error = "Couldn't read this file — it may be permission-restricted.";
    } else {
      content = preprocessWikiLinks(stripFrontmatter(raw), linkIndex(files));
    }
  }

  return (
    <WikiBrowser
      tree={tree}
      current={current}
      content={content}
      error={error}
      empty={files.length === 0}
    />
  );
}
