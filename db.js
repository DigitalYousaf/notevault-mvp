// db.js — SQLite database layer (Node's built-in node:sqlite, no extra dependency).
// Creates data/notevault.db on first boot and ensures the schema exists.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'notevault.db'));

// --- Schema -----------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '',   -- comma-separated, lowercase
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
`);

// --- Users ------------------------------------------------------------------
function createUser(name, email, passwordHash) {
  const r = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name, email, passwordHash);
  return getUserById(Number(r.lastInsertRowid));
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function getUserById(id) {
  const u = db.prepare(
    'SELECT id, name, email, created_at FROM users WHERE id = ?'
  ).get(id);
  return u || null;
}

// --- Notes ------------------------------------------------------------------
function createNote(userId, title, body, tags) {
  const r = db.prepare(
    'INSERT INTO notes (user_id, title, body, tags) VALUES (?, ?, ?, ?)'
  ).run(userId, title, body, tags);
  return getNoteById(Number(r.lastInsertRowid), userId);
}

function getNoteById(id, userId) {
  return (
    db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) ||
    null
  );
}

// search: matches title/body (LIKE); tag: exact single-tag match on the CSV list
function listNotes(userId, { search = '', tag = '' } = {}) {
  let sql = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [userId];
  if (search) {
    sql += ' AND (title LIKE ? OR body LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    sql += ` AND (',' || tags || ',' LIKE ?)`;
    params.push(`%,${tag.toLowerCase()},%`);
  }
  sql += ' ORDER BY updated_at DESC';
  return db.prepare(sql).all(...params);
}

function updateNote(id, userId, { title, body, tags }) {
  db.prepare(
    `UPDATE notes SET title = ?, body = ?, tags = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(title, body, tags, id, userId);
  return getNoteById(id, userId);
}

function deleteNote(id, userId) {
  const r = db
    .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return r.changes > 0;
}

// Distinct tags used by this user (for the filter chips in the UI)
function listTags(userId) {
  const rows = db
    .prepare('SELECT tags FROM notes WHERE user_id = ? AND tags != ?')
    .all(userId, '');
  const set = new Set();
  for (const r of rows)
    for (const t of r.tags.split(',')) {
      const tag = t.trim();
      if (tag) set.add(tag);
    }
  return [...set].sort();
}

module.exports = {
  createUser, getUserByEmail, getUserById,
  createNote, getNoteById, listNotes, updateNote, deleteNote, listTags,
};
