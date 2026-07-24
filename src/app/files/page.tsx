import {
  getAllFolders,
  getFile,
  getFiles,
  getFolderPath,
  getSubfolders,
} from "@/lib/queries";
import { FilesBrowser } from "@/components/files";

export const dynamic = "force-dynamic";

export const metadata = { title: "Files" };

export default async function FilesPage(props: {
  searchParams: Promise<{ folder?: string; file?: string }>;
}) {
  const sp = await props.searchParams;
  const openFile = sp.file ? (getFile(Number(sp.file)) ?? null) : null;

  let folderId: number | null = null;
  if (sp.folder) {
    const n = Number(sp.folder);
    folderId = Number.isInteger(n) ? n : null;
  } else if (openFile) {
    folderId = openFile.folder_id; // show the file's folder behind the viewer
  }

  const path = folderId != null ? getFolderPath(folderId) : [];
  const folders = getSubfolders(folderId);
  const files = getFiles(folderId);
  const allFolders = getAllFolders();

  return (
    <FilesBrowser
      folderId={folderId}
      path={path}
      folders={folders}
      files={files}
      allFolders={allFolders}
      openFile={openFile}
    />
  );
}
