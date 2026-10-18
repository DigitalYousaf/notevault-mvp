# CLAUDE.md — NoteVault

> Project context file for AI coding agents, written the way the
> SMIT "Vibe Engineering with AI Coding Agents" course teaches (Class 3: tight,
> effective project context; Class 10: write the CLAUDE.md before building).

## What this is

NoteVault is a personal notes web app — a **full-stack MVP** with a real
backend and a real database. Users sign up, log in, and manage private notes
with full-text search and tag filters. Built for the SMIT assignment
*"Complete MVP development and deployment with Vibe Coding"*
(frontend + backend + active database + hosting).

## Tech stack

- **Backend:** Node.js 24 + Express 4 (only npm dependency)
- **Database:** SQLite via Node's built-in `node:sqlite` — zero extra deps.
  File: `data/notevault.db`, auto-created on boot (`db.js`)
- **Auth:** `node:crypto` scrypt password hashing (salt:hash hex);
  random 256-bit Bearer tokens, in-memory sessions with 7-day TTL (`auth.js`)
- **Frontend:** vanilla HTML/CSS/JS, no build step, `fetch` API client
  (`public/`)

## How to run

```bash
npm install
node server.js        # http://localhost:3000
```

Docker (untested here — no Docker on this machine):

```bash
docker compose up --build
```

## Architecture

```
browser ──fetch/JSON──▶ Express (server.js)
                            ├─ /api/auth/*      → routes/auth.js ─┐
                            ├─ /api/notes/* ──▶ requireAuth ──▶ routes/notes.js ─┤
                            └─ /                → public/ (static)              ├─▶ db.js ─▶ data/notevault.db
                                                                                 └─ auth.js (scrypt + sessions)
```

- Every notes query is scoped by `req.userId` — users can never see or touch
  another user's notes (verified by tests).
- Tags are stored lowercase, comma-separated; `GET /api/notes?tag=x` matches
  whole tags only.
- Sessions live in a `Map` in `auth.js` — restart wipes them (documented in
  README; use DB/Redis sessions for production).

## Key files

| File | Purpose |
|------|---------|
| `server.js` | Express wiring: JSON body parsing, API routes, static frontend, error handler |
| `db.js` | Schema + all SQL. `DatabaseSync` from `node:sqlite` |
| `auth.js` | `hashPassword` / `verifyPassword` (scrypt), `createSession` / `getSession` / `destroySession` |
| `routes/auth.js` | signup (validates, 409 on duplicate), login (generic 401 message), logout |
| `routes/notes.js` | CRUD + `?search=` + `?tag=` + `/tags`; note `GET /tags` is defined **before** `GET /:id` so Express doesn't swallow it |
| `middleware/requireAuth.js` | Parses `Authorization: Bearer`, 401 when missing/invalid/expired |
| `public/js/app.js` | Token in `localStorage`; `api()` auto-signs-out on 401; debounced search |

## Conventions

- API always returns JSON; errors are `{ error: "human message" }` with the
  right status code (400 validation, 401 auth, 404 not-found/mine, 409 conflict).
- Frontend: no frameworks; `esc()` all user text before injecting into HTML.
- Tests: `node --check` on every JS file; end-to-end curl suite covering the
  full user journey plus 401/404/409 and cross-user isolation (see README NV-8).

## What to know before changing things

- `data/` is git-ignored territory (see `.dockerignore`) — the DB file must
  never be committed; it is created at runtime.
- If you add a column, add it in the `CREATE TABLE` in `db.js` (fresh installs
  only) — there is no migration system; this is an MVP.
- The frontend has no build: edit `public/` files and refresh the browser.
