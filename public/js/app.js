// app.js — NoteVault frontend. Talks to the Express API via fetch, token in localStorage.
'use strict';

const $ = (id) => document.getElementById(id);
const TOKEN_KEY = 'nv_token';
const USER_KEY = 'nv_user';

// ---------- tiny API client ----------
async function api(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch('/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON (shouldn't happen) */ }
  if (res.status === 401 && auth) { signOut(); throw new Error('Session expired — please sign in again.'); }
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

// ---------- toasts ----------
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- auth ----------
let authMode = 'signin';

function setAuthMode(mode) {
  authMode = mode;
  $('tab-signin').classList.toggle('active', mode === 'signin');
  $('tab-signup').classList.toggle('active', mode === 'signup');
  $('name-label').classList.toggle('hidden', mode === 'signin');
  $('auth-submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  $('auth-error').classList.add('hidden');
}

async function handleAuth(e) {
  e.preventDefault();
  $('auth-error').classList.add('hidden');
  const payload = {
    email: $('auth-email').value.trim(),
    password: $('auth-password').value,
  };
  if (authMode === 'signup') payload.name = $('auth-name').value.trim();
  try {
    const data = await api('/auth/' + (authMode === 'signin' ? 'login' : 'signup'), {
      method: 'POST', body: payload, auth: false,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    enterApp();
    toast(authMode === 'signin' ? 'Welcome back!' : 'Account created — welcome!', 'ok');
  } catch (err) {
    const box = $('auth-error');
    box.textContent = err.message;
    box.classList.remove('hidden');
  }
}

async function signOut() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* best effort */ }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  $('app-view').classList.add('hidden');
  $('editor-backdrop').classList.add('hidden');
  $('auth-view').classList.remove('hidden');
}

// ---------- notes state ----------
let notes = [];
let tags = [];
let activeTag = '';
let searchTimer = null;
let editingId = null; // null = creating

function enterApp() {
  const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  $('user-name').textContent = user.name || user.email || '';
  $('auth-view').classList.add('hidden');
  $('app-view').classList.remove('hidden');
  refresh();
}

async function refresh() {
  try {
    const q = new URLSearchParams();
    const s = $('search').value.trim();
    if (s) q.set('search', s);
    if (activeTag) q.set('tag', activeTag);
    const qs = q.toString() ? '?' + q.toString() : '';
    const [n, t] = await Promise.all([
      api('/notes' + qs),
      api('/notes/tags'),
    ]);
    notes = n.notes; tags = t.tags;
    renderChips(); renderNotes();
  } catch (err) { toast(err.message, 'err'); }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(iso) {
  try { return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function renderChips() {
  const box = $('tag-chips');
  box.innerHTML = '';
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip' + (activeTag === '' ? ' active' : '');
  all.textContent = 'All';
  all.onclick = () => { activeTag = ''; refresh(); };
  box.appendChild(all);
  for (const t of tags) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'chip' + (activeTag === t ? ' active' : '');
    c.textContent = '#' + t;
    c.onclick = () => { activeTag = activeTag === t ? '' : t; refresh(); };
    box.appendChild(c);
  }
}

function renderNotes() {
  const grid = $('notes-grid');
  grid.innerHTML = '';
  $('empty-state').classList.toggle('hidden', notes.length > 0);
  for (const n of notes) {
    const card = document.createElement('article');
    card.className = 'card';
    const tagHtml = n.tags
      ? n.tags.split(',').filter(Boolean).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')
      : '';
    card.innerHTML = `
      <h3>${esc(n.title)}</h3>
      <p class="snippet">${esc(n.body)}</p>
      <div class="meta">${tagHtml}<span class="date">${esc(fmtDate(n.updated_at))}</span></div>`;
    card.onclick = () => openEditor(n);
    grid.appendChild(card);
  }
}

// ---------- editor ----------
function openEditor(note = null) {
  editingId = note ? note.id : null;
  $('note-title').value = note ? note.title : '';
  $('note-tags').value = note ? note.tags.split(',').join(', ') : '';
  $('note-body').value = note ? note.body : '';
  $('editor-error').classList.add('hidden');
  $('btn-delete').classList.toggle('hidden', !note);
  $('editor-backdrop').classList.remove('hidden');
  $('note-title').focus();
}

function closeEditor() {
  $('editor-backdrop').classList.add('hidden');
  editingId = null;
}

async function saveNote() {
  $('editor-error').classList.add('hidden');
  const payload = {
    title: $('note-title').value.trim(),
    tags: $('note-tags').value,
    body: $('note-body').value,
  };
  try {
    if (editingId) {
      await api('/notes/' + editingId, { method: 'PUT', body: payload });
      toast('Note updated.', 'ok');
    } else {
      await api('/notes', { method: 'POST', body: payload });
      toast('Note saved.', 'ok');
    }
    closeEditor();
    refresh();
  } catch (err) {
    const box = $('editor-error');
    box.textContent = err.message;
    box.classList.remove('hidden');
  }
}

async function deleteNote() {
  if (!editingId) return;
  if (!confirm('Delete this note? This cannot be undone.')) return;
  try {
    await api('/notes/' + editingId, { method: 'DELETE' });
    toast('Note deleted.', 'ok');
    closeEditor();
    refresh();
  } catch (err) { toast(err.message, 'err'); }
}

// ---------- wiring ----------
$('tab-signin').onclick = () => setAuthMode('signin');
$('tab-signup').onclick = () => setAuthMode('signup');
$('auth-form').addEventListener('submit', handleAuth);
$('btn-signout').onclick = signOut;
$('btn-new').onclick = () => openEditor(null);
$('btn-cancel').onclick = closeEditor;
$('btn-save').onclick = saveNote;
$('btn-delete').onclick = deleteNote;
$('editor-backdrop').addEventListener('click', (e) => {
  if (e.target === $('editor-backdrop')) closeEditor();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('editor-backdrop').classList.contains('hidden')) closeEditor();
});
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(refresh, 300);
});

// Boot: if a token exists, try to enter the app (API will reject a bad one)
if (localStorage.getItem(TOKEN_KEY)) enterApp();
