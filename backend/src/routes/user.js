/**
 * routes/user.js — Logged-in seeker + provider features:
 * favorites, leads (contact events), reviews, provider self-registration & dashboard.
 */
const express = require('express');
const { load, save, uid } = require('../db');
const { requireAuth } = require('./auth');
const { isOpenNow, haversineMetres, formatDistance } = require('../geo');
const { sendPush, newLeadPush, uploadPhoto } = require('../services');

const router = express.Router();
// Path-scoped auth: only these route groups need a logged-in user
// (a blanket router.use() would 401 every unmatched /api request).
router.use(['/favorites', '/leads', '/providers', '/reports', '/me'], requireAuth);

/* ───────────────────────── FAVOURITES (save/bookmark) ───────────────────── */
router.get('/favorites', (req, res) => {
  const db = load();
  const ids = db.favorites.filter((f) => f.userId === req.user.id).map((f) => f.providerId);
  res.json(db.providers.filter((p) => ids.includes(p.id)).map((p) => ({
    id: p.id, name: p.name, businessName: p.businessName, categoryId: p.categoryId,
    phone: p.phone, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
    address: p.address, location: p.location, verified: p.verified,
  })));
});

router.post('/favorites/:providerId', (req, res) => {
  const db = load();
  if (!db.favorites.find((f) => f.userId === req.user.id && f.providerId === req.params.providerId)) {
    db.favorites.push({ userId: req.user.id, providerId: req.params.providerId, createdAt: new Date().toISOString() });
    save();
  }
  res.status(201).json({ ok: true });
});

router.delete('/favorites/:providerId', (req, res) => {
  const db = load();
  db.favorites = db.favorites.filter((f) => !(f.userId === req.user.id && f.providerId === req.params.providerId));
  save();
  res.json({ ok: true });
});

/* ───────────────────────── LEADS (call/WhatsApp events) ─────────────────── */
// POST /api/leads — fired when seeker taps Call / WhatsApp / Directions.
// This is the provider dashboard's lead feed + admin analytics fuel.
router.post('/leads', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.body.providerId);
  if (!p) return res.status(404).json({ error: 'provider_not_found' });
  db.leads.unshift({
    id: uid('lead'),
    providerId: p.id,
    userId: req.user.id,
    userName: req.user.name,
    type: ['call', 'whatsapp', 'directions'].includes(req.body.type) ? req.body.type : 'call',
    createdAt: new Date().toISOString(),
  });
  db.leads = db.leads.slice(0, 2000);
  save();
  // 🔔 Push "new lead" to the provider's device (FCM when configured — ARCHITECTURE §6.5)
  const owner = p.userId && db.users.find((u) => u.id === p.userId);
  if (owner && owner.fcmToken) {
    const lead = db.leads[0];
    sendPush(owner.fcmToken, newLeadPush(lead)).catch(() => {});
  }
  res.status(201).json({ ok: true });
});

// POST /api/me/fcm-token — register device push token (Flutter/Android/iOS)
router.post('/me/fcm-token', (req, res) => {
  const db = load();
  req.user.fcmToken = String(req.body.token || '').slice(0, 512) || null;
  save();
  res.json({ ok: true });
});

/* ───────────────────────── REVIEWS ─────────────────────────────────────── */
router.post('/providers/:id/reviews', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'provider_not_found' });
  const rating = Math.max(1, Math.min(5, Number(req.body.rating) || 5));
  const text = String(req.body.text || '').slice(0, 500);
  if (db.reviews.find((r) => r.providerId === p.id && r.userId === req.user.id)) {
    return res.status(400).json({ error: 'already_reviewed' });
  }
  db.reviews.push({
    id: uid('rev'), providerId: p.id, userId: req.user.id,
    userName: req.user.name, rating, text,
    createdAt: new Date().toISOString(),
  });
  // Weighted aggregate update (mirrors the PG trigger in ARCHITECTURE §3):
  // lifetime ratingCount may exceed the reviews stored, so blend rather than reset.
  p.ratingAvg = Math.round(((p.ratingAvg * p.ratingCount + rating) / (p.ratingCount + 1)) * 10) / 10;
  p.ratingCount += 1;
  save();
  res.status(201).json({ ok: true, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount });
});

// POST /api/reports — flag a listing (moderation queue in admin panel)
router.post('/reports', (req, res) => {
  const db = load();
  db.reports.unshift({
    id: uid('rep'), providerId: String(req.body.providerId || ''),
    userId: req.user.id, reason: String(req.body.reason || '').slice(0, 300),
    status: 'open', createdAt: new Date().toISOString(),
  });
  save();
  res.status(201).json({ ok: true });
});

/* ───────────────── PROVIDER SELF-REGISTRATION & DASHBOARD ───────────────── */

// POST /api/providers/register — self-onboarding (goes to admin verification queue)
router.post('/providers/register', (req, res) => {
  const db = load();
  const b = req.body || {};
  const cat = db.categories.find((c) => c.id === b.categoryId);
  if (!cat) return res.status(400).json({ error: 'invalid_category' });
  if (!b.name || !b.phone) return res.status(400).json({ error: 'name_and_phone_required' });

  const city = db.cities.find((c) => c.id === b.cityId) || db.cities.find((c) => c.id === 'indore');
  const provider = {
    id: uid('prv'),
    userId: req.user.id,
    name: String(b.name).slice(0, 60),
    businessName: String(b.businessName || b.name).slice(0, 80),
    categoryId: cat.id,
    subcategory: String(b.subcategory || (cat.subcategories[0] || {}).id || ''),
    phone: String(b.phone).replace(/\D/g, '').slice(-10),
    whatsapp: String(b.whatsapp || b.phone).replace(/\D/g, '').slice(-10),
    photo: typeof b.photo === 'string' && b.photo.startsWith('data:image') ? b.photo.slice(0, 400000) : null,
    about: String(b.about || '').slice(0, 500),
    skills: Array.isArray(b.skills) ? b.skills.slice(0, 8).map(String) : [],
    priceHint: String(b.priceHint || '').slice(0, 40),
    address: {
      line1: String(b.address || '').slice(0, 120),
      area: String(b.area || '').slice(0, 60),
      city: city.name_en, cityId: city.id,
      state: String(b.state || city.state).slice(0, 40),
      pincode: String(b.pincode || '').slice(0, 10),
    },
    location: {
      lat: Number(b.lat) || city.lat + (Math.random() - 0.5) * 0.02,
      lng: Number(b.lng) || city.lng + (Math.random() - 0.5) * 0.02,
    },
    availability: {
      manualOpen: true,
      hours: { open: String(b.open || '09:00'), close: String(b.close || '19:00') },
      offDays: Array.isArray(b.offDays) ? b.offDays.map(Number) : [0],
    },
    verified: 'pending',           // ← admin must approve before it appears in search
    source: 'self',
    kycStatus: b.kycName ? 'submitted' : 'pending', // MVP stores KYC name only (doc upload = S3 in prod)
    kycName: String(b.kycName || '').slice(0, 80),
    ratingAvg: 0, ratingCount: 0,
    languages: ['hi', 'en'],
    createdAt: new Date().toISOString(),
  };
  db.providers.push(provider);
  // Media adapter: uploads to Cloudinary when configured, else keeps the demo data-URL
  if (b.photo && String(b.photo).startsWith('data:image')) {
    uploadPhoto(b.photo).then((url) => {
      if (url) { provider.photo = url; save(); }
    }).catch(() => {});
  }
  if (req.user.role === 'user') req.user.role = 'provider';
  save();
  res.status(201).json({ ok: true, provider: { id: provider.id, verified: provider.verified }, message: 'Verification ke liye bhej diya gaya. Admin approve karte hi listing live hogi.' });
});

// GET /api/me/providers — provider dashboard: my listings (+ status)
router.get('/me/providers', (req, res) => {
  const db = load();
  const mine = db.providers.filter((p) => p.userId === req.user.id);
  res.json(mine.map((p) => {
    const leads = db.leads.filter((l) => l.providerId === p.id);
    return {
      id: p.id, name: p.name, businessName: p.businessName, categoryId: p.categoryId,
      verified: p.verified, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      availability: p.availability, isOpenNow: isOpenNow(p.availability),
      leadCount: leads.length,
      phone: p.phone, address: p.address,
    };
  }));
});

// GET /api/me/leads — who contacted me
router.get('/me/leads', (req, res) => {
  const db = load();
  const myIds = db.providers.filter((p) => p.userId === req.user.id).map((p) => p.id);
  res.json(db.leads.filter((l) => myIds.includes(l.providerId)).slice(0, 100));
});

// PUT /api/providers/:id — edit own listing (or admin)
router.put('/providers/:id', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'provider_not_found' });
  if (p.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  const b = req.body || {};
  ['name', 'businessName', 'about', 'priceHint', 'phone'].forEach((k) => {
    if (b[k] != null) p[k] = String(b[k]).slice(0, 500);
  });
  if (b.whatsapp) p.whatsapp = String(b.whatsapp).replace(/\D/g, '').slice(-10);
  if (b.photo === null || (typeof b.photo === 'string' && b.photo.startsWith('data:image'))) p.photo = b.photo ? b.photo.slice(0, 400000) : null;
  if (Array.isArray(b.skills)) p.skills = b.skills.slice(0, 8).map(String);
  if (b.address) p.address.line1 = String(b.address).slice(0, 120);
  if (b.area) p.address.area = String(b.area).slice(0, 60);
  if (b.pincode) p.address.pincode = String(b.pincode).slice(0, 10);
  if (Number.isFinite(Number(b.lat))) p.location.lat = Number(b.lat);
  if (Number.isFinite(Number(b.lng))) p.location.lng = Number(b.lng);
  if (b.open || b.close) {
    p.availability.hours = { open: String(b.open || p.availability.hours.open), close: String(b.close || p.availability.hours.close) };
  }
  save();
  res.json({ ok: true });
});

// POST /api/providers/:id/availability — one-tap open/closed toggle
router.post('/providers/:id/availability', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'provider_not_found' });
  if (p.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  // One-tap toggle: explicit `open` body wins, otherwise flip current state
  p.availability.manualOpen = req.body.open === undefined ? !p.availability.manualOpen : !!req.body.open;
  save();
  res.json({ ok: true, manualOpen: p.availability.manualOpen });
});

module.exports = router;
