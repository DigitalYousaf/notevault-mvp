// auth.js — password hashing (scrypt, no bcrypt dependency) + token sessions.
//
// Sessions are kept in an in-memory Map: token -> { userId, createdAt }.
// Tradeoff (documented in README): restarting the server logs everyone out.
// For production, persist sessions in the DB or Redis instead.
const crypto = require('crypto');

const sessions = new Map(); // token -> { userId, createdAt }
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  // timingSafeEqual prevents timing attacks on the comparison
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function destroySession(token) {
  sessions.delete(token);
}

module.exports = { hashPassword, verifyPassword, createSession, getSession, destroySession };
