# Tracker Portal

A self-hosted personal dashboard for tracking daily brain challenges, tasks,
goals, habits, experiments, a watch/read queue, uploaded files, and analytics —
built on Next.js (App Router) with a local SQLite database.

## Features

- **Today** — a daily overview across all sections.
- **Challenges** — log answers to daily puzzles; attempts are recorded ungraded
  and can be reviewed asynchronously by an external grader.
- **Tasks** — categorised to-dos with priorities and due dates.
- **Goals** — monthly goals with progress, notes, links, and file attachments.
- **Habits** — a 30-day habit grid with manual and automatic logging.
- **Experiments** — a "things to try" board with hypotheses and results.
- **Queue** — a watch/read list (videos, articles, docs, …).
- **Files** — a Google-Drive-style file manager: nested folders, image/PDF
  uploads with title + note, paste (⌘/Ctrl+V) and drag-and-drop, inline viewer.
- **Analytics** — streaks, consistency, and performance charts.
- **Hermes** *(optional)* — a monitoring page for a companion agent; harmless
  and empty if you don't run one.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · better-sqlite3 · Recharts

## Getting started

```bash
npm install
cp .env.example .env.local        # optional; adjust as needed
sqlite3 logbook.db < schema.sql   # create the database (default DB_PATH)
npm run dev                       # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

`npm start` binds to `127.0.0.1:3000` only — the app is never directly
reachable from the network. Serve it through a same-host reverse proxy or a
Cloudflare Tunnel, and point the proxy at `http://127.0.0.1:3000` (not
`localhost`, which may resolve to IPv6 `::1` — the app binds the IPv4 loopback
only). Binding a public interface directly is insecure; if you must, run
`next start -H 0.0.0.0` explicitly.

## Configuration

All configuration is via environment variables — see [`.env.example`](.env.example).
Nothing is required; defaults are used when unset. Notable ones:

- `DB_PATH` — SQLite database location (default `../logbook.db`).
- `UPLOADS_DIR` — where uploaded files are stored (default `../uploads`).
- `NEXT_PUBLIC_LOGOUT_URL` — the logout button target (e.g. a Cloudflare Access
  logout URL). `NEXT_PUBLIC_` variables are inlined at build time.

## Database

The app uses a SQLite database (`logbook.db` by default, resolved from the app
directory's parent — override with `DB_PATH`). Initialise a fresh one from the
bundled schema:

```bash
sqlite3 logbook.db < schema.sql
```

[`schema.sql`](schema.sql) contains every table (challenges, attempts, tasks,
goals, habits, experiments, queue items, files, folders, …) and its indexes —
DDL only, no data. See `src/lib/queries.ts` and `src/lib/types.ts` for the
shapes each query uses.

## Auth

The app has no built-in login. In production it's intended to sit behind a
reverse proxy or zero-trust layer (e.g. Cloudflare Access); the logout button
simply points at that layer's logout endpoint via `NEXT_PUBLIC_LOGOUT_URL`.

Two application-layer hardening hooks live in `src/proxy.ts` (see
[`.env.example`](.env.example)):

- **CF Access assertion verification** *(opt-in)* — set `CF_ACCESS_TEAM_DOMAIN`
  and `CF_ACCESS_AUD` and every request must carry a valid
  `Cf-Access-Jwt-Assertion` header (RS256-verified against your team's JWKS,
  `aud` + `iss` checked). Unset → no in-app verification (dev default).
  See [`docs/cf-access-jwt.md`](docs/cf-access-jwt.md) for the full enable/
  disable/troubleshooting guide — read it before enabling (it 401s direct
  localhost access by design).
- **Same-origin gate** *(always on)* — mutating requests (`POST`/`PUT`/
  `PATCH`/`DELETE`) are rejected with 403 unless `Sec-Fetch-Site`/`Origin`
  indicate same-origin. Set `ALLOWED_ORIGIN` if your proxy rewrites the `Host`
  header.
