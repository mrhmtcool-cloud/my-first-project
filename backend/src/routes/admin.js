/**
 * routes/admin.js — Platform-owner dashboard API.
 * Guard: user.role === 'admin'. Features: stats, verification queue, provider CRUD,
 * bulk CSV onboarding, category management, moderation (reports).
 */
const express = require('express');
const { load, save, uid } = require('../db');
const { requireAuth } = require('./auth');
const { sendPush, verifyPush } = require('../services');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin_only' });
  next();
}
// Path-scoped guards (all admin routes live under /admin/*)
router.use('/admin', requireAuth, requireAdmin);

/* ───────────────────────── ANALYTICS ───────────────────────────────────── */
// GET /api/admin/stats — headline numbers for the dashboard tiles + charts
router.get('/admin/stats', (req, res) => {
  const db = load();
  const byCity = {};
  const byCategory = {};
  db.providers.forEach((p) => {
    byCity[p.address.cityId] = (byCity[p.address.cityId] || 0) + 1;
    byCategory[p.categoryId] = (byCategory[p.categoryId] || 0) + 1;
  });
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    totals: {
      providers: db.providers.length,
      verified: db.providers.filter((p) => p.verified === 'verified').length,
      pending: db.providers.filter((p) => p.verified === 'pending').length,
      users: db.users.length,
      reviews: db.reviews.length,
      leads: db.leads.length,
      searches: db.searches.length,
      searchesToday: db.searches.filter((s) => s.createdAt.slice(0, 10) === today).length,
      openReports: db.reports.filter((r) => r.status === 'open').length,
    },
    byCity, byCategory,
    recentSearches: db.searches.slice(0, 15),
  });
});

/* ───────────────────────── PROVIDERS ───────────────────────────────────── */
// GET /api/admin/providers?status=pending|verified|rejected&q=
router.get('/admin/providers', (req, res) => {
  const db = load();
  const { status, q } = req.query;
  let rows = db.providers.slice().reverse();
  if (status) rows = rows.filter((p) => p.verified === status);
  if (q) {
    const s = String(q).toLowerCase();
    rows = rows.filter((p) => (p.name + p.businessName + p.phone + p.address.city).toLowerCase().includes(s));
  }
  res.json(rows);
});

// POST /api/admin/providers — admin-manual add (instantly verified — "admin-added" trust signal)
router.post('/admin/providers', (req, res) => {
  const db = load();
  const b = req.body || {};
  const cat = db.categories.find((c) => c.id === b.categoryId);
  if (!cat) return res.status(400).json({ error: 'invalid_category' });
  const city = db.cities.find((c) => c.id === b.cityId) || db.cities[0];
  const provider = {
    id: uid('prv'), userId: b.userId || null,
    name: String(b.name || '').slice(0, 60) || 'Unnamed',
    businessName: String(b.businessName || b.name || '').slice(0, 80),
    categoryId: cat.id, subcategory: String(b.subcategory || (cat.subcategories[0] || {}).id || ''),
    phone: String(b.phone || '').replace(/\D/g, '').slice(-10),
    whatsapp: String(b.whatsapp || b.phone || '').replace(/\D/g, '').slice(-10),
    photo: null,
    about: String(b.about || '').slice(0, 500),
    skills: Array.isArray(b.skills) ? b.skills.slice(0, 8).map(String) : [],
    priceHint: String(b.priceHint || '').slice(0, 40),
    address: {
      line1: String(b.address || '').slice(0, 120), area: String(b.area || '').slice(0, 60),
      city: city.name_en, cityId: city.id, state: String(b.state || city.state).slice(0, 40),
      pincode: String(b.pincode || '').slice(0, 10),
    },
    location: { lat: Number(b.lat) || city.lat, lng: Number(b.lng) || city.lng },
    availability: { manualOpen: true, hours: { open: '09:00', close: '19:00' }, offDays: [0] },
    verified: 'verified', source: 'admin', kycStatus: 'admin-added',
    ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'],
    createdAt: new Date().toISOString(),
  };
  db.providers.push(provider);
  save();
  res.status(201).json({ ok: true, provider: { id: provider.id, verified: provider.verified } });
});

/**
 * POST /api/admin/providers/bulk — bulk onboard via CSV text.
 * Columns: name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about
 * Verified instantly (admin-supplied data is trusted). Invalid rows are reported back.
 */
router.post('/admin/providers/bulk', (req, res) => {
  const db = load();
  const csv = String(req.body.csv || '');
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const out = { added: 0, skipped: [], rows: [] };
  const parse = (line) => {
    const out = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur); return out.map((s) => s.trim());
  };
  for (const line of lines) {
    const c = parse(line);
    if (/^name$/i.test(c[0])) continue; // header row
    const [name, businessName, category, subcategory, phone, whatsapp, address, area, cityId, state, pincode, lat, lng, about] = c;
    const cat = db.categories.find((x) => x.id === category);
    const city = db.cities.find((x) => x.id === (cityId || '').toLowerCase());
    if (!name || !cat || !city) { out.skipped.push({ name, reason: !name ? 'no name' : !cat ? 'bad category' : 'bad city' }); continue; }
    db.providers.push({
      id: uid('prv'), userId: null,
      name: name.slice(0, 60), businessName: (businessName || name).slice(0, 80),
      categoryId: cat.id, subcategory: subcategory || (cat.subcategories[0] || {}).id || '',
      phone: String(phone || '').replace(/\D/g, '').slice(-10),
      whatsapp: String(whatsapp || phone || '').replace(/\D/g, '').slice(-10),
      photo: null, about: (about || '').slice(0, 500), skills: [], priceHint: '',
      address: { line1: address || area || '', area: area || '', city: city.name_en, cityId: city.id, state: state || city.state, pincode: pincode || '' },
      location: { lat: Number(lat) || city.lat, lng: Number(lng) || city.lng },
      availability: { manualOpen: true, hours: { open: '09:00', close: '19:00' }, offDays: [0] },
      verified: 'verified', source: 'csv', kycStatus: 'bulk-import',
      ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'], createdAt: new Date().toISOString(),
    });
    out.added++; out.rows.push(name);
  }
  save();
  res.json(out);
});

// POST /api/admin/providers/:id/verify | /reject — approval queue actions
function notifyProvider(p, status) {
  const owner = p.userId && load().users.find((u) => u.id === p.userId);
  if (owner && owner.fcmToken) sendPush(owner.fcmToken, verifyPush(status)).catch(() => {});
}
router.post('/admin/providers/:id/verify', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  p.verified = 'verified'; save();
  notifyProvider(p, 'verified'); // push: "आपकी लिस्टिंग लाइव है!"
  res.json({ ok: true, verified: 'verified' });
});
router.post('/admin/providers/:id/reject', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  p.verified = 'rejected'; save();
  notifyProvider(p, 'rejected');
  res.json({ ok: true, verified: 'rejected' });
});

// PUT /api/admin/providers/:id — full edit (same body as POST add)
router.put('/admin/providers/:id', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  ['name', 'businessName', 'about', 'phone', 'whatsapp', 'priceHint'].forEach((k) => { if (b[k] != null) p[k] = String(b[k]).slice(0, 500); });
  if (b.categoryId && db.categories.find((c) => c.id === b.categoryId)) p.categoryId = b.categoryId;
  if (b.subcategory) p.subcategory = String(b.subcategory);
  if (b.address) p.address.line1 = String(b.address).slice(0, 120);
  if (b.area) p.address.area = String(b.area).slice(0, 60);
  if (b.pincode) p.address.pincode = String(b.pincode).slice(0, 10);
  if (Number.isFinite(Number(b.lat))) p.location.lat = Number(b.lat);
  if (Number.isFinite(Number(b.lng))) p.location.lng = Number(b.lng);
  save();
  res.json({ ok: true });
});

// DELETE /api/admin/providers/:id — remove listing
router.delete('/admin/providers/:id', (req, res) => {
  const db = load();
  db.providers = db.providers.filter((p) => p.id !== req.params.id);
  save();
  res.json({ ok: true });
});

/* ───────────────────────── CATEGORIES ──────────────────────────────────── */
router.get('/admin/categories', (req, res) => res.json(load().categories));

router.post('/admin/categories', (req, res) => {
  const db = load();
  const b = req.body || {};
  const id = String(b.id || b.name_en || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!id || db.categories.find((c) => c.id === id)) return res.status(400).json({ error: 'bad_or_duplicate_id' });
  db.categories.push({
    id,
    name_en: String(b.name_en || '').slice(0, 40),
    name_hi: String(b.name_hi || '').slice(0, 40),
    icon: String(b.icon || 'wrench').slice(0, 20),
    order: db.categories.length + 1,
    active: true,
    subcategories: Array.isArray(b.subcategories) ? b.subcategories : [],
  });
  save();
  res.status(201).json({ ok: true, id });
});

router.put('/admin/categories/:id', (req, res) => {
  const db = load();
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  if (b.name_en) c.name_en = String(b.name_en).slice(0, 40);
  if (b.name_hi) c.name_hi = String(b.name_hi).slice(0, 40);
  if (b.icon) c.icon = String(b.icon).slice(0, 20);
  if (b.active !== undefined) c.active = !!b.active;
  if (Array.isArray(b.subcategories)) c.subcategories = b.subcategories;
  save();
  res.json({ ok: true });
});

router.delete('/admin/categories/:id', (req, res) => {
  const db = load();
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  save();
  res.json({ ok: true });
});

/* ───────────────────────── MODERATION ──────────────────────────────────── */
router.get('/admin/reports', (req, res) => {
  const db = load();
  res.json(db.reports.map((r) => ({
    ...r,
    provider: db.providers.find((p) => p.id === r.providerId) || null,
  })));
});

router.post('/admin/reports/:id/resolve', (req, res) => {
  const db = load();
  const r = db.reports.find((x) => x.id === req.params.id);
  if (r) { r.status = 'resolved'; save(); }
  res.json({ ok: true });
});

module.exports = router;
