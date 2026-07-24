import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { getDb } from "@/lib/db";
import { fail } from "@/lib/api";

// GET /api/export?format=db|json — download a copy of all data.
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "db";
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    const db = getDb();

    if (format === "json") {
      const tables = (
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          )
          .all() as { name: string }[]
      ).map((t) => t.name);
      const dump: Record<string, unknown[]> = {};
      for (const t of tables) dump[t] = db.prepare(`SELECT * FROM "${t}"`).all();
      return new NextResponse(JSON.stringify(dump, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="tracker-${stamp}.json"`,
        },
      });
    }

    // Consistent single-file snapshot (WAL-safe).
    const tmp = path.join(os.tmpdir(), `tracker-export-${Date.now()}.db`);
    db.exec(`VACUUM INTO '${tmp}'`);
    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="logbook-${stamp}.db"`,
      },
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "export failed", 500);
  }
}
