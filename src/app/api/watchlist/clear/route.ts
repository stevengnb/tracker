import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

// Sweep: delete every already-consumed item (watched / read) in one
// bucket + kind. Keeps the "decide when to sweep" model — nothing is removed
// until this is called explicitly.
export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const bucket = data.bucket === "entertainment" ? "entertainment" : "queue";
  const kind = data.kind === "read" ? "read" : "watch";
  const doneStatus = kind === "read" ? "read" : "watched";
  try {
    const info = getDb()
      .prepare(
        "DELETE FROM watchlist_items WHERE bucket = ? AND kind = ? AND status = ?",
      )
      .run(bucket, kind, doneStatus);
    return isForm
      ? formRedirect(req, bucket === "entertainment" ? "/entertainment" : "/queue")
      : ok({ deleted: info.changes });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
