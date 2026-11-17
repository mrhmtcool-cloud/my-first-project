/**
 * app.js — Express application: static PWA + REST API.
 * Same-origin design (API + web on one host) keeps the client simple and
 * works behind any proxy — no CORS, relative URLs only (preview-safe).
 */
const express = require('express');
const path = require('path');
const { load } = require('./db');
const { buildSeed } = require('./seed');
const publicRoutes = require('./routes/public');
const { router: authRoutes } = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

function createApp() {
  load(buildSeed); // initialise store (seeded on first boot)
  const app = express();
  app.use(express.json({ limit: '5mb' })); // photo data-URLs on registration

  // ── API ────────────────────────────────────────────────────────────────
  app.use('/api', publicRoutes);
  app.use('/api', authRoutes);
  app.get('/api/health', (req, res) => res.json({ ok: true, name: 'labors-near-me', ts: Date.now() }));
  app.use('/api', userRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

  // ── Static PWA (website + installable mobile app) ──────────────────────
  const webDir = path.join(__dirname, '..', '..', 'web');
  app.use(express.static(webDir, { maxAge: '1h', index: 'index.html' }));

  // SPA fallback for any non-API path
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(webDir, 'index.html')));

  // ── Errors ─────────────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'server_error' });
  });
  return app;
}

module.exports = { createApp };
