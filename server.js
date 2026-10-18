// server.js — NoteVault backend. Express API + static frontend.
// Run:  npm install && node server.js   (http://localhost:3000)
const express = require('express');
const path = require('path');
require('./db'); // creates data/notevault.db + schema on boot

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// --- API --------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/notes', requireAuth, notesRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'notevault' }));

// --- Frontend (static files in public/) -------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
// SPA fallback: unknown non-API routes serve the app
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Errors -----------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`NoteVault running at http://localhost:${PORT}`);
});
