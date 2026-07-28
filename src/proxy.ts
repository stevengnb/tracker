import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ── Same-origin gate for state-mutating requests (CSRF) ─────────────────────
//
// Runs unconditionally (independent of the CF Access flags below). The app
// accepts classic <form> posts and JSON fetches; both are forgeable
// cross-origin — a cross-origin <form> POST, or a fetch with
// Content-Type: text/plain carrying a JSON body (route handlers call
// req.json(), which ignores the declared content type). Modern browsers always
// attach Sec-Fetch-Site to navigation/form requests, so header-absent means a
// non-browser client (curl, scripts), which we allow.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sameOriginAllowed(req: NextRequest): boolean {
  if (!MUTATING.has(req.method)) return true;

  const sfs = req.headers.get("sec-fetch-site");
  if (sfs === "same-origin" || sfs === "none") return true;

  const origin = req.headers.get("origin");
  if (sfs === null && origin === null) return true; // curl / scripts send neither
  if (origin === null) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // Optional explicit override for deployments where the proxy rewrites Host.
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    try {
      return originHost === new URL(allowed).host;
    } catch {
      return false;
    }
  }

  // Compare against the forwarded/original Host header — not req.nextUrl.origin,
  // which is derived from Host and breaks (403s legitimate posts) if a proxy
  // rewrites it to the internal address.
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return originHost === host;
}

// ── Cloudflare Access assertion verification (defense in depth) ─────────────
//
// Off unless BOTH env vars are set (dev/staging without the proxy stays open).
// When on, every request must carry a Cf-Access-Jwt-Assertion header whose
// signature verifies against the team's JWKS, with matching aud + iss.
// RS256 is pinned explicitly: Cloudflare Access only signs RS256, and accepting
// HS256 against the RSA public key would be the classic algorithm-confusion
// forgery.

const rawTeam = process.env.CF_ACCESS_TEAM_DOMAIN;
const TEAM_DOMAIN = rawTeam?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
const AUD = process.env.CF_ACCESS_AUD;
const cfAccessOn = Boolean(TEAM_DOMAIN && AUD);
const JWKS = cfAccessOn
  ? createRemoteJWKSet(new URL(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`))
  : null;

async function cfAccessAllowed(req: NextRequest): Promise<boolean> {
  if (!cfAccessOn || !JWKS) return true;
  const token = req.headers.get("cf-access-jwt-assertion");
  if (!token) return false;
  try {
    await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
      audience: AUD,
      issuer: `https://${TEAM_DOMAIN}`,
    });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  if (!sameOriginAllowed(req)) {
    return NextResponse.json(
      { ok: false, error: "forbidden origin" },
      { status: 403 },
    );
  }
  if (!(await cfAccessAllowed(req))) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
