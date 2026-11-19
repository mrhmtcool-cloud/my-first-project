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
  // ⚠️ Koi bhi file cache NA ho — warna naye features dikhne me der lagti hai
  // (sirf icons/images thodi der cache ho sakti hain)
  app.use(express.static(webDir, {
    maxAge: 0,
    index: false,
    setHeaders: (res, filePath) => {
      const isImage = /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(filePath);
      if (!isImage) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  }));

  // 🔧 Purana SW apne aap uninstall ho jaye + cache saaf (self-destruct sw.js)
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(webDir, 'sw.js'));
  });

  // SPA fallback for any non-API path
  const sendShell = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(webDir, 'index.html'));
  };
  app.get('/fresh', sendShell); // ← cache-free entry point (preview path me /fresh likho)
  app.get('/v2', sendShell);
  app.get(/^\/(?!api\/).*/, sendShell);

  // ── Errors ─────────────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'server_error' });
  });
  return app;
}

module.exports = { createApp };
