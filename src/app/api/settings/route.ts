import { NextRequest } from "next/server";
import { getSettingsJson, saveSettingsJson } from "@/lib/queries";
import { normalizeSettings } from "@/lib/settingsCore";
import { fail, ok } from "@/lib/api";

// GET → { settings } (null until the first save). Shared by every device.
export async function GET() {
  try {
    const raw = getSettingsJson();
    return ok({ settings: raw ? normalizeSettings(JSON.parse(raw)) : null });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "read failed", 500);
  }
}

// PUT a full Settings object. JSON only: the value is nested arrays, which a
// plain <form> post can't express.
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail("settings must be an object");
  const data = JSON.stringify(normalizeSettings(body));
  if (data.length > 20_000) return fail("settings too large");
  try {
    saveSettingsJson(data);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "write failed", 500);
  }
}
