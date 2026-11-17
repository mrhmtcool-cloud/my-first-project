/**
 * routes/public.js — Open endpoints: categories, cities, nearby search, provider detail, reviews.
 * No auth required (browse is open — critical for low-friction first use).
 */
const express = require('express');
const { load, save, uid } = require('../db');
const { haversineMetres, formatDistance, isOpenNow, relevanceScore } = require('../geo');

const router = express.Router();

/** Shape a provider for the wire (adds computed fields the UI needs). */
function publicProvider(p, db, origin) {
  const cat = db.categories.find((c) => c.id === p.categoryId) || {};
  const sub = (cat.subcategories || []).find((s) => s.id === p.subcategory) || {};
  return {
    id: p.id,
    name: p.name,
    businessName: p.businessName,
    categoryId: p.categoryId,
    categoryNameEn: cat.name_en || '', categoryNameHi: cat.name_hi || '',
    subcategory: p.subcategory,
    subcategoryNameEn: sub.name_en || '', subcategoryNameHi: sub.name_hi || '',
    categoryIcon: cat.icon || 'wrench',
    phone: p.phone, whatsapp: p.whatsapp,
    photo: p.photo,
    about: p.about, skills: p.skills, priceHint: p.priceHint,
    address: p.address, location: p.location,
    availability: p.availability,
    isOpenNow: isOpenNow(p.availability),
    verified: p.verified,
    ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
    languages: p.languages,
  };
}

// GET /api/categories — icon grid data (bilingual names + subcategories)
router.get('/categories', (req, res) => {
  const db = load();
  res.json(db.categories.filter((c) => c.active !== false).sort((a, b) => a.order - b.order));
});

// GET /api/cities — pan-India city switcher
router.get('/cities', (req, res) => {
  const db = load();
  res.json(db.cities);
});

/**
 * GET /api/providers/nearby — THE core query.
 * Query: lat, lng, radius(m, default 25000), cityId, q, category, openNow, minRating,
 *        sort=distance|rating|reviews, limit (default 50)
 * Production: same contract, executed via PostGIS ST_DWithin (see ARCHITECTURE §3, §6).
 */
router.get('/providers/nearby', (req, res) => {
  const db = load();
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const cityId = String(req.query.cityId || '').trim();
  const radius = Number(req.query.radius) > 0 ? Number(req.query.radius) : 25000;
  const minRating = Number(req.query.minRating) || 0;
  const openNow = req.query.openNow === '1' || req.query.openNow === 'true';
  const sort = ['distance', 'rating', 'reviews', 'relevance'].includes(req.query.sort) ? req.query.sort : 'distance';
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  // Origin: explicit lat/lng (GPS) else chosen city centre else Indore
  let lat = Number(req.query.lat), lng = Number(req.query.lng);
  let originLabel = 'gps';
  const city = db.cities.find((c) => c.id === cityId);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const c = city || db.cities.find((x) => x.id === 'indore');
    lat = c.lat; lng = c.lng; originLabel = 'city:' + c.id;
  }

  let rows = db.providers
    .filter((p) => p.verified === 'verified') // seekers only see verified listings
    .map((p) => {
      const d = haversineMetres(lat, lng, p.location.lat, p.location.lng);
      return { p, distance: d };
    })
    .filter(({ p, distance }) => distance <= radius)
    .filter(({ p }) => {
      if (category && p.categoryId !== category) return false;
      if (cityId && p.address.cityId !== cityId) return false;
      if (minRating && p.ratingAvg < minRating) return false;
      if (openNow && !isOpenNow(p.availability)) return false;
      if (q) {
        const cat = db.categories.find((c) => c.id === p.categoryId) || {};
        const hay = [
          p.name, p.businessName, p.about, (p.skills || []).join(' '),
          cat.name_en, cat.name_hi, p.subcategory, p.address.area, p.address.city,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) {
          // multi-word queries like "electrician near me" → match ANY token of length ≥4
          const tokens = q.split(/\s+/).filter((t) => t.length >= 4 && !['near', 'me'].includes(t));
          if (!tokens.some((t) => hay.includes(t))) return false;
        }
      }
      return true;
    });

  rows.sort((a, b) =>
    sort === 'rating' ? b.p.ratingAvg - a.p.ratingAvg
    : sort === 'reviews' ? b.p.ratingCount - a.p.ratingCount
    : sort === 'relevance'
      ? relevanceScore(b.p, b.distance, radius) - relevanceScore(a.p, a.distance, radius)
      : a.distance - b.distance
  );

  const total = rows.length;
  rows = rows.slice(0, limit);

  res.json({
    origin: { lat, lng, label: originLabel },
    radius, total,
    sort,
    results: rows.map(({ p, distance }) => ({
      ...publicProvider(p, db),
      distance: Math.round(distance),
      distanceText: formatDistance(distance),
    })),
  });
});

// GET /api/providers/:id — full public profile
// `?preview=1` lets the OWNER (or admin) view their not-yet-verified listing.
router.get('/providers/:id', (req, res) => {
  const db = load();
  const p = db.providers.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'provider_not_found' });
  if (p.verified !== 'verified') {
    if (req.query.preview !== '1') return res.status(404).json({ error: 'provider_not_found' });
    // optional auth: only the owner or an admin may preview an unverified listing
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const session = token && db.sessions.find((s) => s.token === token);
    const me = session && db.users.find((u) => u.id === session.userId);
    if (!me || (me.id !== p.userId && me.role !== 'admin')) {
      return res.status(403).json({ error: 'forbidden' });
    }
  }
  const origin = {
    lat: Number(req.query.lat), lng: Number(req.query.lng),
  };
  let distance = null;
  if (Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    distance = Math.round(haversineMetres(origin.lat, origin.lng, p.location.lat, p.location.lng));
  }
  res.json({ ...publicProvider(p, db), distance, distanceText: formatDistance(distance) });
});

// GET /api/providers/:id/reviews
router.get('/providers/:id/reviews', (req, res) => {
  const db = load();
  const reviews = db.reviews
    .filter((r) => r.providerId === req.params.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(reviews);
});

// POST /api/searches — log a search (fire-and-forget from client; powers admin analytics + "popular")
router.post('/searches', (req, res) => {
  const db = load();
  db.searches.unshift({
    id: uid('srch'),
    q: String(req.body.q || '').slice(0, 80),
    cityId: String(req.body.cityId || ''),
    userId: req.body.userId || null,
    createdAt: new Date().toISOString(),
  });
  db.searches = db.searches.slice(0, 500);
  save();
  res.status(201).json({ ok: true });
});

// GET /api/searches/popular — trending chips on home screen
router.get('/searches/popular', (req, res) => {
  const db = load();
  const counts = {};
  db.searches.forEach((s) => { if (s.q) counts[s.q] = (counts[s.q] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q]) => q);
  res.json(top.length ? top : ['electrician', 'raj mistri', 'tailor', 'plumber', 'bhandara']);
});

module.exports = router;
