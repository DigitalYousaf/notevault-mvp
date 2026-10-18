# NoteVault — LMS submission description

## Problem

Everyone takes notes — on phones, sticky notes, scattered apps — but most
note tools are either too simple (no search, notes get lost) or bloated
subscriptions with features nobody uses. People need one private place where
they can quickly save a thought and actually find it again later.

## Target market / users

Students, freelancers, and professionals who jot down ideas, tasks, and
reference notes daily and want them searchable and organized by tags —
without paying for a heavy productivity suite. The app is deliberately
simple so anyone can use it in seconds.

## Proposed solution

NoteVault: a full-stack web app with real user accounts and a real database.
Each user signs up, logs in, and gets a private notes workspace: create and
edit notes, search across titles and bodies, and filter by tags. Passwords are
salted + hashed, sessions use random tokens, and users can only ever access
their own notes. It runs from one codebase with a Dockerfile, so it can be
hosted anywhere with a persistent disk.

## Technologies / services used

Node.js + Express backend (single npm dependency), SQLite database via Node's
`better-sqlite3` (file auto-created on boot),
and a vanilla HTML/CSS/JS frontend with no build step. Password hashing uses
`node:crypto` scrypt; auth is Bearer-token based. Docker + docker-compose for
hosting with a persistent volume for the database file.
