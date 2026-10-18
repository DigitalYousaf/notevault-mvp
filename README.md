# NoteVault — personal notes app (full-stack MVP)

A complete, working website with **frontend + backend + active database**:
sign up, log in, and keep private notes with search and tag filters.
Built for the SMIT *"Complete MVP development and deployment with Vibe Coding"*
assignment — frontend, backend, database, and hosting.

**Author:** Muhammad Yousaf — SMIT Vibe Engineering with AI Agents, Batch 1

## Run it

```bash
npm install
node server.js
# open http://localhost:3000
```

The SQLite database file (`data/notevault.db`) is created automatically on first boot.

## Features

- **Auth:** signup / login / logout, salted scrypt password hashing, random
  Bearer tokens, all note routes protected
- **Notes CRUD:** create, read, update, delete — users only ever see their own notes
- **Search** across titles + bodies, **tag filter** chips, distinct-tag listing
- Clean responsive dark UI: auth screens, notes grid, editor modal, toasts,
  delete confirmation, empty states

## API

| Method | Route                | Auth | Description                              |
|--------|----------------------|------|------------------------------------------|
| POST   | `/api/auth/signup`   | no   | `{name, email, password}` → `{user, token}` |
| POST   | `/api/auth/login`    | no   | `{email, password}` → `{user, token}`    |
| POST   | `/api/auth/logout`   | no   | invalidates the Bearer token            |
| GET    | `/api/notes`         | yes  | list own notes; `?search=` `?tag=` filters |
| GET    | `/api/notes/tags`    | yes  | distinct tags for filter chips           |
| POST   | `/api/notes`         | yes  | `{title, body, tags}` → created note     |
| GET    | `/api/notes/:id`     | yes  | one note (404 if not yours)              |
| PUT    | `/api/notes/:id`     | yes  | update title/body/tags                   |
| DELETE | `/api/notes/:id`     | yes  | delete note                              |
| GET    | `/api/health`        | no   | `{ok:true}` liveness check               |

Authenticated routes expect `Authorization: Bearer <token>`.

## Data model (SQLite — `data/notevault.db`)

```sql
users(id, name, email UNIQUE, password_hash /* salt:scrypt-hex */, created_at)
notes(id, user_id → users.id, title, body, tags /* csv, lowercase */,
      created_at, updated_at)
```

Sessions are **in-memory** (`Map` of token → user, 7-day TTL). Tradeoff: a server
restart logs everyone out. For production, persist sessions in the DB or Redis.

## Docker (written, not run — no Docker on this machine)

```bash
docker compose up --build   # app on http://localhost:3000
```

The SQLite file lives in `/app/data`, persisted through the `notevault-data`
volume so notes survive container restarts.

## Hosting notes

Deploy the **Docker image** (or `node server.js`) on any host with a persistent
disk: **Render** (persistent disk add-on), **Railway** (volume), or a small **VPS**.
Plain serverless platforms (e.g. Vercel functions) are a bad fit here because
SQLite needs a real file that survives between requests — the file would be
wiped on every cold start. That is exactly why this project ships a Dockerfile:
the database travels with the container.

## Project structure

```
server.js            Express app: API + static frontend
db.js                SQLite schema + all queries (node:sqlite, zero deps)
auth.js              scrypt password hashing + token sessions
routes/auth.js       signup / login / logout
routes/notes.js      notes CRUD, search, tag filter
middleware/requireAuth.js   Bearer-token guard for /api/notes
public/              frontend — index.html, css/styles.css, js/app.js (no build step)
Dockerfile / docker-compose.yml / .dockerignore
```

## Build plan — ticket by ticket (course FeatureDev method)

Written the way the course teaches: human-level tickets, then build each one
end to end (clarify → build → test → review), as done for Pre-Legal in Class 10.

| Ticket | Title | What "done" means |
|--------|-------|-------------------|
| NV-1 | Project scaffold + CLAUDE.md | `package.json`, Express hello, static `public/`, CLAUDE.md written |
| NV-2 | Database layer | SQLite file auto-created; `users` + `notes` tables; all queries in `db.js` |
| NV-3 | Auth: signup/login | scrypt hashing, unique-email check, validation errors |
| NV-4 | Sessions + protected routes | Bearer tokens, 7-day TTL, `requireAuth` on `/api/notes`, 401s correct |
| NV-5 | Notes CRUD API | create/read/update/delete, search + tag filter, per-user isolation |
| NV-6 | Frontend: auth screens | sign-in/sign-up tabs, error display, token in localStorage |
| NV-7 | Frontend: notes UI | grid, search box, tag chips, editor modal, toasts, delete confirm |
| NV-8 | End-to-end test pass | curl: full user journey + 401/404/409 cases + cross-user isolation |
| NV-9 | Docker + docs | Dockerfile, compose with volume, README, SUBMISSION.md |

Each ticket was verified before moving on — the same "what did you actually
test?" discipline from Class 9.5.
