// routes/auth.js — POST /api/auth/signup | /login | /logout
const express = require('express');
const db = require('../db');
const { hashPassword, verifyPassword, createSession, destroySession } = require('../auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, created_at: u.created_at };
}

router.post('/signup', (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanName.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.getUserByEmail(cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const user = db.createUser(cleanName, cleanEmail, hashPassword(String(password)));
  const token = createSession(user.id);
  res.status(201).json({ user: publicUser(user), token });
});

router.post('/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const user = db.getUserByEmail(String(email).trim().toLowerCase());
  // Same generic message either way so attackers can't probe for valid emails
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const full = db.getUserById(user.id);
  const token = createSession(user.id);
  res.json({ user: publicUser(full), token });
});

router.post('/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) destroySession(token);
  res.json({ ok: true });
});

module.exports = router;
