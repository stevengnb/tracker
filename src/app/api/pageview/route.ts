import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getPageviewStats } from "@/lib/queries";
import { fail, ok } from "@/lib/api";
import { NAV } from "@/components/nav";

// Only real sections are counted — typos/404s would otherwise pollute stats.
const TRACKED = new Set([...NAV.map((n) => n.href), "/settings"]);

// Record a page visit. Body: { path }. Also stores who/what sent it (Cloudflare
// Access email, client IP, user agent) so odd-looking visits can be traced.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = (body.path ?? "").toString();
  if (!TRACKED.has(path)) return fail("invalid path");
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  try {
    getDb()
      .prepare(
        "INSERT INTO pageviews (path, user_email, ip, user_agent) VALUES (?, ?, ?, ?)",
      )
      .run(
        path,
        h.get("cf-access-authenticated-user-email"),
        ip,
        h.get("user-agent")?.slice(0, 300) ?? null,
      );
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
