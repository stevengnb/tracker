# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # next dev — http://localhost:3000
npm run build    # next build
npm run start    # next start -H 127.0.0.1 (loopback only, by design)
npm run lint     # eslint (flat config, eslint.config.mjs)

sqlite3 logbook.db < schema.sql   # initialise a fresh DB from the DDL
```

There is no test framework in this repo — `npm run lint` and `npm run build`
(type-checking) are the verification steps.

## Architecture

Next.js 16 App Router + React 19 + Tailwind v4, backed by a **local SQLite file
via better-sqlite3** — everything is synchronous, server-side, single-process.
There is no ORM, no API client layer, and no external service.

**Data flow.** Server components import query functions directly from
`src/lib/queries.ts` (the single home for all SQL — ~700 lines, sectioned by
domain with `// ── Challenges ──` style headers) and render. Mutations go the
other way: client components `fetch()` a route handler under `src/app/api/…`,
which writes through `getDb()` and returns `{ ok: true }` / `{ ok: false, error }`,
then the component calls `router.refresh()`. Page components are
`export const dynamic = "force-dynamic"` (all 16 of them) because the data is
always live from SQLite.

**Route handler convention** — every mutating route follows the same shape
(see `src/lib/api.ts` and `src/app/api/tasks/route.ts` as the canonical example):

```ts
const { data, isForm } = await readBody(req);   // accepts JSON *and* form-encoded
… validate, return fail("…") on bad input …
return isForm ? formRedirect(req, "/tasks") : ok();
```

Dual JSON/form body support is deliberate: the app predates its React client and
still accepts plain `<form>` posts. `formRedirect` only mirrors a same-origin
`Referer` (open-redirect guard). Keep both paths when editing a route.

**`getDb()`** (`src/lib/db.ts`) is a lazily-opened module-level singleton with
`fileMustExist: true`, WAL, and a 5s busy timeout; pragma failures are swallowed
so a read-only DB file still serves reads.

**Security layer** lives in `src/proxy.ts` — this is Next 16's renamed
`middleware.ts`, matching every route except static assets. Two independent
gates: an always-on same-origin check on POST/PUT/PATCH/DELETE (header-absent
means a non-browser client, which is allowed), and opt-in Cloudflare Access JWT
verification enabled only when both `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`
are set (RS256 pinned to prevent algorithm confusion). There is no in-app login;
production sits behind Cloudflare Access. See `docs/cf-access-jwt.md` before
enabling — it 401s direct localhost access by design. Note `docs/` and
`PRD-revamp.md` are gitignored.

**Uploads.** Validation is centralised in `src/lib/uploads.ts` (images, PDF,
archives, and Markdown; 100 MB) — `/api/files` and both attachment routes must all
use `validateUpload`; they drifted apart once already. `resolveUploadKind(file)`
is the single kind resolver (`image`/`pdf`/`zip`/`markdown`) stored on the
`files` row: it prefers the reported MIME (`ALLOWED_UPLOAD_MIME`) and falls back
to the extension (`ALLOWED_UPLOAD_EXT`), because browsers report archive/`.md`
MIMEs inconsistently (often empty/`octet-stream`) — both `validateUpload` and the
client input (`src/components/files.tsx`) accept those by extension too, so the
client and server gates stay aligned. The `zip` kind is **generic "archive"**
(zip / gzip / tar / tar.gz), so adding an archive format needs no new `kind`
enum value and no `schema.sql` CHECK-constraint migration. Archives aren't
previewable (download-only in the viewer); the thumbnail badge shows the real
extension. Serving goes through
`src/app/uploads/[...path]/route.ts`, which normalises the path and rejects
anything escaping `uploadsDir()`, and always sends `X-Content-Type-Options: nosniff`.

**Optional subsystems**, each degrading to empty when unconfigured:
`src/lib/vault.ts` (read-only Markdown vault browser, `VAULT_DIR`),
`src/lib/hermesDb.ts` + `src/lib/system.ts` (companion-agent monitoring page,
shells out to `systemctl`/a dump script; `HERMES_*`, `GATEWAY_UNIT`), and
`/api/backup` (404 unless `BACKUP_API_ENABLED=true`; runs a shell script
synchronously and blocks the event loop), and the **Quiz** page (`/quiz`,
`src/lib/quiz.ts`, `QUIZ_DIR` — default `/srv/shared/etc/quizzes`) which reads
Markdown quiz files (numbered questions + `- [ ]`/`- [x]` task-list options, `>`
explanation; multiple `[x]` = multi-select) and records scores in the
`quiz_attempts` table. Quiz files are read-only and live *outside* the vault so
they needn't satisfy the vault's `lint.py`; `readQuiz(slug)` guards against path
traversal. It degrades to an empty list when `QUIZ_DIR` is missing.

## Conventions

- Types for every DB row live in `src/lib/types.ts`; query functions cast their
  `better-sqlite3` results to them. Adding a column means touching `schema.sql`,
  `types.ts`, and `queries.ts`.
- Shared presentational primitives (`Card`, `StatCard`, `Badge`, `PageHeader`,
  `Empty`) are in `src/components/ui.tsx`. Domain components are lowercase files
  (`tasks.tsx`, `goals.tsx`, `habits.tsx`); infrastructure/widget components are
  PascalCase (`Sidebar.tsx`, `CommandPalette.tsx`).
- Colours come from CSS custom properties in `src/app/globals.css` mapped to
  Tailwind names — use `text-muted`, `text-faint`, `border-line`, `bg-card`,
  `text-accent`, `bg-accent-soft`, `text-good/bad/warn`, never raw hex or
  `zinc-*`. Dark mode is class-based via `next-themes` and defaults to dark; both
  palettes are defined in that file.
- Client components wrap fetches in a small local `api()` helper that toasts
  `data.error` on failure (`src/lib/toast.ts`); destructive actions go through
  `confirmDialog()` (`src/lib/confirm.ts`).
- User UI preferences (sidebar order/hidden, clocks, Today card layout) are
  **shared across devices**: stored as one JSON row in `app_settings` via
  `/api/settings`. `src/lib/settings.ts` (client hooks) keeps localStorage key
  `portal-settings` only as a first-paint cache and pulls the server copy once
  per page load. Shape/defaults/validation live in the hook-free
  `src/lib/settingsCore.ts` so server code can import them.
- `better-sqlite3` is in `serverExternalPackages` (`next.config.ts`); it must
  never be pulled into a `"use client"` module.
- `NEXT_PUBLIC_*` vars are inlined at build time — changing
  `NEXT_PUBLIC_LOGOUT_URL` requires a rebuild, not just a restart.
- The database, `uploads/`, and `.env*` are gitignored; the app reads them from
  paths outside the repo in production (`DB_PATH`, `UPLOADS_DIR`).

---

## Lab notebook — dead ends and things not to retry

A running log of approaches that were tried on this project and **did not work**,
so future instances don't burn a cycle rediscovering them. Treat it like a
researcher's notebook: the point is the negative result and *why* it failed, not
a changelog of what shipped.

**When to append:** any time you take a wrong turn that cost real work — a fix
that didn't fix it, a wrong assumption about the stack, a command that failed for
a non-obvious reason, a change the user rejected on principle. Add it *when it
happens*, not at the end of the session.

**When not to append:** a typo you caught immediately, anything already covered
by a section above, or a one-off environment hiccup that teaches nothing.

**Format** — newest entry at the bottom:

```
### YYYY-MM-DD — one-line title of the wrong turn
**Tried:** what was attempted.
**Result:** how it failed / what the user said.
**Why:** the underlying reason.
**Instead:** what to do next time.
```

If a later session proves an entry wrong, edit it in place and say so rather than
leaving a misleading note standing.

### Seed entries (recovered from code comments, not from a live session)

These are documented past mistakes already annotated in the source — recorded
here so the reasoning isn't lost if the comment moves.

### undated — `systemctl --user` for the gateway status
**Tried:** v1 read gateway health with `systemctl --user is-active hermes-gateway`.
**Result:** status rendered blank, always.
**Why:** the gateway is a *system* unit, not a user unit.
**Instead:** query the system manager (`src/lib/system.ts` does this now).

### undated — deriving the allowed origin from `req.nextUrl.origin`
**Tried:** comparing the request `Origin` against `req.nextUrl.origin` in the
same-origin gate.
**Result:** legitimate posts 403'd behind the proxy.
**Why:** `nextUrl.origin` is derived from `Host`, which the proxy rewrites to the
internal address.
**Instead:** compare against `x-forwarded-host`/`host`, or `ALLOWED_ORIGIN` when
set (`src/proxy.ts`).

### undated — per-route upload validation
**Tried:** each upload route carried its own MIME allowlist and size cap.
**Result:** the attachment routes drifted away from `/api/files` and accepted
files it rejected.
**Why:** duplicated policy with no shared source of truth.
**Instead:** every route that accepts a file calls `validateUpload` from
`src/lib/uploads.ts`.

### 2026-08-12 — widening an upload `kind` without touching the DB constraint
**Tried:** added `zip`/`markdown` to the `kind` union in `types.ts`, the
`ALLOWED_UPLOAD_MIME` map, and the client, then shipped — expecting `.zip`
uploads to work.
**Result:** upload failed at runtime with `CHECK constraint failed: kind IN
('image','pdf')`. The row was rejected by SQLite, not the app.
**Why:** the `files.kind` column has a column-level `CHECK(kind IN (...))` in
`schema.sql`, and the *live* DB still enforced the old two-value list. Editing
`schema.sql` only affects freshly-created DBs; SQLite can't `ALTER` a CHECK
constraint in place.
**Instead:** when adding a value to any `CHECK`-constrained column, also migrate
the live DB by recreating the table (create `_new`, copy rows, drop, rename,
**recreate indexes**, `PRAGMA foreign_key_check`). Better still, avoid the
migration: the `zip` kind is now generic "archive", so new archive formats
(tar.gz, etc.) map to it and need no enum/constraint change at all.

### 2026-08-12 — raising the upload cap without raising the proxy/middleware body limit
**Tried:** bumped `MAX_UPLOAD_BYTES` in `src/lib/uploads.ts` to 100 MB and
expected large uploads to work.
**Result:** uploads > ~10 MB failed with "Failed to parse body as FormData"; the
log showed `Request body exceeded 10MB for /api/files. Only the first 10MB will
be available unless configured.`
**Why:** every route runs through `src/proxy.ts` (Next 16's renamed middleware),
and Next buffers the request body for middleware with a **10 MB default**. The
truncated body then can't be parsed as multipart in the route handler. The
app-level size check never even runs.
**Instead:** set `experimental.proxyClientMaxBodySize` in `next.config.ts` above
`MAX_UPLOAD_BYTES` (+ multipart overhead). Note `middlewareClientMaxBodySize` is
the deprecated alias for the same thing. Changing `next.config.ts` needs a
rebuild + restart, not just a restart.

### 2026-09-01 — `npm run build` as a verification step broke the live site
**Tried:** ran `npm run build` in the repo (several times) purely to type-check
changes, without restarting anything.
**Result:** the production `tracker-v2` service (running `next start` from this
same directory) started throwing `Module NNNNN … module factory is not
available` when lazy-loading page chunks — /files 500'd until a restart.
**Why:** `next build` rewrites `.next/` in place; the long-running server keeps
its old in-memory module graph but lazy-loads chunks from the *new* build on
disk, and the module IDs don't match.
**Instead:** after any `npm run build` here, either `systemctl --user restart
tracker-v2` immediately, or build in a throwaway copy. Never leave the service
running against a `.next/` it didn't start from.

### 2026-09-06 — smoke-testing the live service on port 3000
**Tried:** after `npm run build && systemctl --user restart tracker-v2`,
curled `http://127.0.0.1:3000/...` to verify pages — got `000` (connection
refused) on every path and briefly thought the deploy was broken.
**Result:** wasted a step chasing a non-existent failure; the service was
`active` and healthy the whole time.
**Why:** the `tracker-v2` systemd *user* unit sets `Environment=PORT=5090`, so
`next start` listens on **127.0.0.1:5090**, not the default 3000. `npm run dev`
uses 3000, but the running production service does not.
**Instead:** get the real port from the unit
(`systemctl --user show tracker-v2 -p Environment`) or `ss -tlnp | grep
next-server` before smoke-testing. It's 5090.

### 2026-09-06 — awaiting confirmDialog inside startTransition breaks deletes
**Tried:** wrote the guide/pin delete handler as `start(async () => { const ok
= await confirmDialog(...); if (!ok) return; await api(DELETE); router.refresh();
})` — the whole thing (confirm + fetch + refresh) inside the transition.
**Result:** clicking delete greyed the row out (`isPending` → `opacity-50`) but
it never disappeared ("gray things but not gone"). The server delete actually
succeeded (curl DELETE → 200); a manual reload showed it gone.
**Why:** in React 19 `startTransition(async …)` is an Action that keeps
`isPending` true until the async fn settles. Awaiting a user-interaction dialog
inside it holds the transition open, and firing `router.refresh()` from within
that still-pending async transition leaves React showing the stale (greyed) tree
instead of committing the refreshed one.
**Instead:** await `confirmDialog` OUTSIDE `start()`; put only the `fetch` +
`router.refresh()` inside the transition. `QueueRow` in `watchlist.tsx` is the
canonical correct pattern. Fixed in `guides.tsx` and `pins.tsx`.

### 2026-09-25 — importing a hooks module from a route handler, then deploying with `;`
**Tried:** the new `/api/settings` route imported `normalizeSettings` from
`src/lib/settings.ts` (which also imports `useEffect`/`useState`). `tsc` and
eslint passed. Deployed with `npm run build … | grep …; systemctl --user restart
tracker-v2`.
**Result:** Turbopack build failed ("Ecmascript file had an error", import trace
through the route), but the `;` + pipe swallowed the failure and the restart
ran anyway — the service crash-looped against a half-written `.next/` and the
site was down for a few minutes.
**Why:** route handlers compile under the `react-server` condition, where React
client hooks don't exist; `tsc --noEmit` can't catch that, only `next build` does.
And `cmd | grep` returns grep's status, not the build's.
**Instead:** keep anything server code needs in hook-free modules
(`settingsCore.ts`). Deploy as `npm run build > log 2>&1 && systemctl --user
restart tracker-v2` so a failed build never triggers a restart.

### 2026-09-25 — `?1` numbered parameters with better-sqlite3
**Tried:** reused one bound value with `?1` three times in a query and called
`.all(like)`.
**Result:** runtime `Too many parameter values were provided` (search 500'd).
**Why:** better-sqlite3's binding of numbered `?NNN` params doesn't accept this
the way raw SQLite does.
**Instead:** use a named parameter (`@like`) and pass an object: `.all({ like })`.
