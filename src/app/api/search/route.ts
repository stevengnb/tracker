import { NextRequest } from "next/server";
import { globalSearch } from "@/lib/queries";
import { fail, ok } from "@/lib/api";

// GET /api/search?q=...
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    return ok({ results: globalSearch(q) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "search failed", 500);
  }
}
