import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getPageviewStats } from "@/lib/queries";
import { fail, ok } from "@/lib/api";

// Record a page visit. Body: { path }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = (body.path ?? "").toString();
  if (!path.startsWith("/") || path.length > 100) return fail("invalid path");
  try {
    getDb().prepare("INSERT INTO pageviews (path) VALUES (?)").run(path);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}

export async function GET() {
  try {
    return ok({ stats: getPageviewStats(30) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}
