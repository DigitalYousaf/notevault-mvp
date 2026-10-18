// middleware/requireAuth.js — protects /api/notes. Expects: Authorization: Bearer <token>
const { getSession } = require('../auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token ? getSession(token) : null;
  if (!session) return res.status(401).json({ error: 'Not signed in. Please log in.' });
  req.userId = session.userId;
  next();
}

module.exports = requireAuth;
