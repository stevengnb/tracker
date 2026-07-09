import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { fail, formRedirect, ok, readBody } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { data, isForm } = await readBody(req);
  const name = (data.name ?? "").trim();
  if (!name) return fail("name is required");
  try {
    getDb()
      .prepare("INSERT INTO habits (name, icon, auto_source) VALUES (?, ?, ?)")
      .run(name, data.icon || "○", data.auto_source || null);
    return isForm ? formRedirect(req, "/habits") : ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
