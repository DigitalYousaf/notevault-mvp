// routes/notes.js — CRUD for notes. All routes require auth; users can only
// ever see or touch their own notes (every query is scoped by req.userId).
const express = require('express');
const db = require('../db');

const router = express.Router();

// Normalise "Work, ideas" -> "work,ideas"
function normaliseTags(input) {
  return String(input || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .join(',');
}

// GET /api/notes?search=...&tag=...  — list (newest first)
router.get('/', (req, res) => {
  const notes = db.listNotes(req.userId, {
    search: String(req.query.search || ''),
    tag: String(req.query.tag || ''),
  });
  res.json({ notes });
});

// GET /api/notes/tags — distinct tags for filter chips
router.get('/tags', (req, res) => {
  res.json({ tags: db.listTags(req.userId) });
});

// POST /api/notes — create
router.post('/', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const note = db.createNote(
    req.userId,
    title,
    String(req.body?.body || ''),
    normaliseTags(req.body?.tags)
  );
  res.status(201).json({ note });
});

// GET /api/notes/:id — read one
router.get('/:id', (req, res) => {
  const note = db.getNoteById(Number(req.params.id), req.userId);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json({ note });
});

// PUT /api/notes/:id — update
router.put('/:id', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const note = db.updateNote(Number(req.params.id), req.userId, {
    title,
    body: String(req.body?.body || ''),
    tags: normaliseTags(req.body?.tags),
  });
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json({ note });
});

// DELETE /api/notes/:id — delete
router.delete('/:id', (req, res) => {
  const ok = db.deleteNote(Number(req.params.id), req.userId);
  if (!ok) return res.status(404).json({ error: 'Note not found.' });
  res.json({ ok: true });
});

module.exports = router;
