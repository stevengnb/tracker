import { getFiles, getFolderPath, getSubfolders } from "@/lib/queries";
import { FilesBrowser } from "@/components/files";

export const dynamic = "force-dynamic";

export const metadata = { title: "Files" };

export default async function FilesPage(props: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const sp = await props.searchParams;
  const parsed = sp.folder ? Number(sp.folder) : NaN;
  const folderId = Number.isInteger(parsed) ? parsed : null;
  const path = folderId != null ? getFolderPath(folderId) : [];
  const folders = getSubfolders(folderId);
  const files = getFiles(folderId);

  return (
    <FilesBrowser
      folderId={folderId}
      path={path}
      folders={folders}
      files={files}
    />
  );
}
