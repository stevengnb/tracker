import { NextRequest, NextResponse } from "next/server";

export function ok(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * The v1 app accepts both JSON (fetch) and form-encoded (plain <form>)
 * bodies on its POST endpoints; form posts get redirected back to the
 * referring page. Keep both behaviors.
 */
export async function readBody(
  req: NextRequest,
): Promise<{ data: Record<string, string>; isForm: boolean }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return { data: await req.json(), isForm: false };
  }
  const form = await req.formData();
  const data: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") data[k] = v;
  });
  return { data, isForm: true };
}

export function formRedirect(req: NextRequest, fallback: string) {
  // Redirect back to the referring page, but only if it points at this same
  // origin — mirroring an arbitrary Referer would be a reflected open redirect.
  const referer = req.headers.get("referer");
  let back = fallback;
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === req.nextUrl.origin) back = url.toString();
    } catch {
      // malformed Referer — fall through to the safe fallback
    }
  }
  return NextResponse.redirect(new URL(back, req.nextUrl.origin), 303);
}
