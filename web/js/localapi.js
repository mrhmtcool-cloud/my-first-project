/**
 * localapi.js — OFFLINE ENGINE for the single-file app (LaborsNearMe.html).
 * Mirrors the Express backend 1:1 (routes/auth.js, user.js, admin.js, public.js)
 * but runs entirely in the browser: data lives in localStorage (seeded from
 * window.LNM_SEED). API.req() is replaced, so the whole SPA works unchanged —
 * search, filters, OTP login, favourites, reviews, registration, admin panel.
 */
(function () {
  'use strict';

  /* ───────────────────────── DB (localStorage-backed) ───────────────────── */
  const DB_KEY = 'lnm_db';
  let db = null;

  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { db = null; }
    if (!db || !db.providers || !db.categories) {
      db = JSON.parse(JSON.stringify(window.LNM_SEED)); // fresh copy of seed
      save();
    }
    return db;
  }
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* quota — memory only */ }
  }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ───────────────────────── geo.js (copied) ────────────────────────────── */
  function haversineMetres(lat1, lon1, lat2, lon2) {
    const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function formatDistance(metres) {
    if (metres == null) return '';
    return metres < 1000 ? Math.round(metres / 10) * 10 + ' m'
      : (metres / 1000).toFixed(metres < 10000 ? 1 : 0) + ' km';
  }
  function relevanceScore(p, distance, radius) {
    const prox = 1 - Math.min(distance / (radius || 25000), 1);
    const rating = (p.ratingAvg || 0) / 5;
    const trust = Math.min(Math.log10(1 + (p.ratingCount || 0)) / 3, 1);
    let complete = 0;
    if (p.about) complete += 0.25;
    if (p.photo) complete += 0.25;
    if (p.skills && p.skills.length) complete += 0.25;
    if (p.priceHint) complete += 0.125;
    if (p.subcategory) complete += 0.125;
    const claimed = p.source === 'self' ? 0.05 : 0;
    return 0.45 * prox + 0.30 * rating + 0.15 * trust + 0.10 * complete + claimed;
  }
  function isOpenNow(avail) {
    if (!avail) return true;
    if (avail.manualOpen === false) return false;
    const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
    const day = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    if (Array.isArray(avail.offDays) && avail.offDays.includes(day)) return false;
    const h = avail.hours || { open: '08:00', close: '20:00' };
    const toM = (t) => { const [hh, mm] = String(t || '0:0').split(':').map(Number); return hh * 60 + (mm || 0); };
    return mins >= toM(h.open) && mins <= toM(h.close);
  }

  /* ───────────────────────── auth helpers (copied) ──────────────────────── */
  const phoneOk = (p) => /^[6-9]\d{9}$/.test(String(p || ''));
  function publicUser(u) {
    return { id: u.id, phone: u.phone, name: u.name, role: u.role, cityId: u.cityId };
  }
  function authByToken(token) {
    const d = load();
    const s = token && d.sessions.find((x) => x.token === token);
    return s ? d.users.find((u) => u.id === s.userId) || null : null;
  }
  function issueToken(userId) {
    const d = load();
    const token = uid('tok') + Math.random().toString(36).slice(2, 10);
    d.sessions.push({ token, userId, createdAt: new Date().toISOString() });
    return token;
  }

  /* ───────────────────────── publicProvider (copied) ────────────────────── */
  function publicProvider(p) {
    const d = load();
    const cat = d.categories.find((c) => c.id === p.categoryId) || {};
    const sub = (cat.subcategories || []).find((s) => s.id === p.subcategory) || {};
    return {
      id: p.id, name: p.name, businessName: p.businessName,
      categoryId: p.categoryId,
      categoryNameEn: cat.name_en || '', categoryNameHi: cat.name_hi || '',
      subcategory: p.subcategory,
      subcategoryNameEn: sub.name_en || '', subcategoryNameHi: sub.name_hi || '',
      categoryIcon: cat.icon || 'wrench',
      phone: p.phone, whatsapp: p.whatsapp, photo: p.photo,
      about: p.about, skills: p.skills, priceHint: p.priceHint,
      address: p.address, location: p.location,
      availability: p.availability, isOpenNow: isOpenNow(p.availability),
      verified: p.verified, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      languages: p.languages,
    };
  }

  /* ═══════════════════════ ROUTER ═══════════════════════ */
  function route(method, path, body, token) {
    const [p, qs] = path.split('?');
    const q = new URLSearchParams(qs || '');
    const seg = p.replace(/^\/+|\/+$/g, '').split('/'); // e.g. ['providers','nearby']
    const user = authByToken(token);
    const needUser = () => { if (!user) throw err(401, 'unauthorized'); return user; };
    const needAdmin = () => { const u = needUser(); if (u.role !== 'admin') throw err(403, 'admin_only'); return u; };

    // ---- auth ----
    if (p === '/auth/request-otp' && method === 'POST') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      if (!phoneOk(phone)) throw err(400, 'invalid_phone', 'Enter valid 10-digit Indian mobile number');
      const d = load();
      const code = '123456'; // demo mode (production: MSG91)
      d.otps = d.otps.filter((o) => o.phone !== phone);
      d.otps.push({ phone, code, expiresAt: Date.now() + 5 * 60 * 1000 });
      save();
      return ok({ ok: true, phone, devOtp: code, devNotice: 'MVP demo: use OTP 123456 (no real SMS is sent)' });
    }
    if (p === '/auth/verify-otp' && method === 'POST') {
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      const code = String(body.code || '');
      const d = load();
      const rec = d.otps.find((o) => o.phone === phone);
      if (!rec || rec.expiresAt < Date.now() || (code !== rec.code && code !== '123456')) throw err(400, 'invalid_otp');
      d.otps = d.otps.filter((o) => o.phone !== phone);
      let user = d.users.find((u) => u.phone === phone);
      if (!user) {
        user = {
          id: uid('u'), phone,
          name: String(body.name || '').slice(0, 60) || 'User ' + phone.slice(-4),
          role: 'user', cityId: String(body.cityId || 'indore'),
          createdAt: new Date().toISOString(),
        };
        d.users.push(user);
      } else if (body.name) user.name = String(body.name).slice(0, 60);
      const token2 = issueToken(user.id);
      save();
      return ok({ token: token2, user: publicUser(user) });
    }
    if (p === '/auth/google' && method === 'POST') {
      const d = load();
      const email = String(body.email || 'demo@gmail.com').toLowerCase();
      let user = d.users.find((u) => u.googleEmail === email);
      if (!user) {
        user = {
          id: uid('u'), phone: String(body.phone || ''), googleEmail: email,
          name: String(body.name || email.split('@')[0]).slice(0, 60),
          role: 'user', cityId: 'indore', createdAt: new Date().toISOString(),
        };
        d.users.push(user);
      }
      const token2 = issueToken(user.id);
      save();
      return ok({ token: token2, user: publicUser(user) });
    }
    if (p === '/auth/me' && method === 'GET') return ok({ user: publicUser(needUser()) });
    if (p === '/auth/logout' && method === 'POST') {
      const d = load();
      d.sessions = d.sessions.filter((s) => s.token !== token);
      save();
      return ok({ ok: true });
    }

    // ---- public meta & search ----
    if (p === '/categories' && method === 'GET') {
      return ok(load().categories.filter((c) => c.active !== false).sort((a, b) => a.order - b.order));
    }
    if (p === '/cities' && method === 'GET') return ok(load().cities);

    if (p === '/providers/nearby' && method === 'GET') {
      const d = load();
      const qq = String(q.get('q') || '').trim().toLowerCase();
      const category = String(q.get('category') || '').trim();
      const cityId = String(q.get('cityId') || '').trim();
      const radius = Number(q.get('radius')) > 0 ? Number(q.get('radius')) : 25000;
      const minRating = Number(q.get('minRating')) || 0;
      const openNow = q.get('openNow') === '1' || q.get('openNow') === 'true';
      const sort = ['distance', 'rating', 'reviews', 'relevance'].includes(q.get('sort')) ? q.get('sort') : 'distance';
      const limit = Math.min(Number(q.get('limit')) || 50, 100);
      let lat = q.has('lat') && q.get('lat') !== '' ? Number(q.get('lat')) : NaN;
      let lng = q.has('lng') && q.get('lng') !== '' ? Number(q.get('lng')) : NaN;
      let originLabel = 'gps';
      const city = d.cities.find((c) => c.id === cityId);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const c = city || d.cities.find((x) => x.id === 'indore');
        lat = c.lat; lng = c.lng; originLabel = 'city:' + c.id;
      }
      let rows = d.providers
        .filter((pr) => pr.verified === 'verified')
        .map((pr) => ({ p: pr, distance: haversineMetres(lat, lng, pr.location.lat, pr.location.lng) }))
        .filter(({ distance }) => distance <= radius)
        .filter(({ p: pr }) => {
          if (category && pr.categoryId !== category) return false;
          if (cityId && pr.address.cityId !== cityId) return false;
          if (minRating && pr.ratingAvg < minRating) return false;
          if (openNow && !isOpenNow(pr.availability)) return false;
          if (qq) {
            const cat = d.categories.find((c) => c.id === pr.categoryId) || {};
            const hay = [
              pr.name, pr.businessName, pr.about, (pr.skills || []).join(' '),
              cat.name_en, cat.name_hi, pr.subcategory, pr.address.area, pr.address.city,
            ].join(' ').toLowerCase();
            if (!hay.includes(qq)) {
              const tokens = qq.split(/\s+/).filter((t) => t.length >= 4 && !['near', 'me'].includes(t));
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
              : a.distance - b.distance);
      const total = rows.length;
      rows = rows.slice(0, limit);
      return ok({
        origin: { lat, lng, label: originLabel }, radius, total, sort,
        results: rows.map(({ p: pr, distance }) => ({
          ...publicProvider(pr), distance: Math.round(distance), distanceText: formatDistance(distance),
        })),
      });
    }

    if (seg[0] === 'providers' && seg[1] && method === 'GET' && seg.length === 2) {
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.verified !== 'verified') {
        if (q.get('preview') !== '1') throw err(404, 'provider_not_found');
        if (!user || (user.id !== pr.userId && user.role !== 'admin')) throw err(403, 'forbidden');
      }
      const oLat = q.has('lat') && q.get('lat') !== '' ? Number(q.get('lat')) : NaN;
      const oLng = q.has('lng') && q.get('lng') !== '' ? Number(q.get('lng')) : NaN;
      let distance = null;
      if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
        distance = Math.round(haversineMetres(oLat, oLng, pr.location.lat, pr.location.lng));
      }
      return ok({ ...publicProvider(pr), distance, distanceText: formatDistance(distance) });
    }

    if (seg[0] === 'providers' && seg[2] === 'reviews' && method === 'GET') {
      const d = load();
      return ok(d.reviews.filter((r) => r.providerId === seg[1])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }

    if (p === '/searches' && method === 'POST') {
      const d = load();
      d.searches.unshift({
        id: uid('srch'), q: String(body.q || '').slice(0, 80),
        cityId: String(body.cityId || ''), userId: body.userId || null,
        createdAt: new Date().toISOString(),
      });
      d.searches = d.searches.slice(0, 500);
      save();
      return ok({ ok: true }, 201);
    }
    if (p === '/searches/popular' && method === 'GET') {
      const d = load();
      const counts = {};
      d.searches.forEach((s) => { if (s.q) counts[s.q] = (counts[s.q] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([qq]) => qq);
      return ok(top.length ? top : ['electrician', 'raj mistri', 'tailor', 'plumber', 'bhandara']);
    }

    // ---- favourites ----
    if (p === '/favorites' && method === 'GET') {
      const d = load();
      const ids = d.favorites.filter((f) => f.userId === user.id).map((f) => f.providerId);
      return ok(d.providers.filter((pr) => ids.includes(pr.id)).map((pr) => ({
        id: pr.id, name: pr.name, businessName: pr.businessName, categoryId: pr.categoryId,
        phone: pr.phone, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount,
        address: pr.address, location: pr.location, verified: pr.verified,
      })));
    }
    if (seg[0] === 'favorites' && seg[1] && method === 'POST') {
      const u = needUser(); const d = load();
      if (!d.favorites.find((f) => f.userId === u.id && f.providerId === seg[1])) {
        d.favorites.push({ userId: u.id, providerId: seg[1], createdAt: new Date().toISOString() });
        save();
      }
      return ok({ ok: true }, 201);
    }
    if (seg[0] === 'favorites' && seg[1] && method === 'DELETE') {
      const u = needUser(); const d = load();
      d.favorites = d.favorites.filter((f) => !(f.userId === u.id && f.providerId === seg[1]));
      save();
      return ok({ ok: true });
    }

    // ---- leads ----
    if (p === '/leads' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === body.providerId);
      if (!pr) throw err(404, 'provider_not_found');
      d.leads.unshift({
        id: uid('lead'), providerId: pr.id, userId: u.id, userName: u.name,
        type: ['call', 'whatsapp', 'directions'].includes(body.type) ? body.type : 'call',
        createdAt: new Date().toISOString(),
      });
      d.leads = d.leads.slice(0, 2000);
      save();
      return ok({ ok: true }, 201);
    }
    if (p === '/me/fcm-token' && method === 'POST') { needUser(); return ok({ ok: true }); }

    // ---- reviews ----
    if (seg[0] === 'providers' && seg[2] === 'reviews' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      const text = String(body.text || '').slice(0, 500);
      if (d.reviews.find((r) => r.providerId === pr.id && r.userId === u.id)) throw err(400, 'already_reviewed');
      d.reviews.push({
        id: uid('rev'), providerId: pr.id, userId: u.id, userName: u.name,
        rating, text, createdAt: new Date().toISOString(),
      });
      pr.ratingAvg = Math.round(((pr.ratingAvg * pr.ratingCount + rating) / (pr.ratingCount + 1)) * 10) / 10;
      pr.ratingCount += 1;
      save();
      return ok({ ok: true, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount }, 201);
    }

    // ---- reports ----
    if (p === '/reports' && method === 'POST') {
      const u = needUser(); const d = load();
      d.reports.unshift({
        id: uid('rep'), providerId: String(body.providerId || ''),
        userId: u.id, userName: u.name,
        reason: String(body.reason || 'User report').slice(0, 300),
        status: 'open', createdAt: new Date().toISOString(),
      });
      save();
      return ok({ ok: true }, 201);
    }

    // ---- provider self-registration ----
    if (p === '/providers/register' && method === 'POST') {
      const u = needUser(); const d = load();
      const b = body || {};
      const cat = d.categories.find((c) => c.id === b.categoryId);
      if (!cat) throw err(400, 'invalid_category');
      if (!b.name || !b.phone) throw err(400, 'name_and_phone_required');
      const city = d.cities.find((c) => c.id === b.cityId) || d.cities.find((c) => c.id === 'indore');
      const provider = {
        id: uid('prv'), userId: u.id,
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
          line1: String(b.address || '').slice(0, 120), area: String(b.area || '').slice(0, 60),
          city: city.name_en, cityId: city.id,
          state: String(b.state || city.state).slice(0, 40), pincode: String(b.pincode || '').slice(0, 10),
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
        verified: 'pending', source: 'self',
        kycStatus: b.kycName ? 'submitted' : 'pending',
        kycName: String(b.kycName || '').slice(0, 80),
        ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'],
        createdAt: new Date().toISOString(),
      };
      d.providers.push(provider);
      if (u.role === 'user') u.role = 'provider';
      save();
      return ok({
        ok: true, provider: { id: provider.id, verified: provider.verified },
        message: 'Verification ke liye bhej diya gaya. Admin approve karte hi listing live hogi.',
      }, 201);
    }

    // ---- provider dashboard ----
    if (p === '/me/providers' && method === 'GET') {
      const u = needUser(); const d = load();
      return ok(d.providers.filter((pr) => pr.userId === u.id).map((pr) => {
        const leads = d.leads.filter((l) => l.providerId === pr.id);
        return {
          id: pr.id, name: pr.name, businessName: pr.businessName, categoryId: pr.categoryId,
          verified: pr.verified, ratingAvg: pr.ratingAvg, ratingCount: pr.ratingCount,
          availability: pr.availability, isOpenNow: isOpenNow(pr.availability),
          leadCount: leads.length, phone: pr.phone, address: pr.address,
        };
      }));
    }
    if (p === '/me/leads' && method === 'GET') {
      const u = needUser(); const d = load();
      const myIds = d.providers.filter((pr) => pr.userId === u.id).map((pr) => pr.id);
      return ok(d.leads.filter((l) => myIds.includes(l.providerId)).slice(0, 100));
    }

    // ---- provider edit (owner or admin) ----
    if (seg[0] === 'providers' && seg[1] && method === 'PUT') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      const b = body || {};
      ['name', 'businessName', 'about', 'priceHint', 'phone'].forEach((k) => {
        if (b[k] != null) pr[k] = String(b[k]).slice(0, 500);
      });
      if (b.whatsapp) pr.whatsapp = String(b.whatsapp).replace(/\D/g, '').slice(-10);
      if (b.photo === null || (typeof b.photo === 'string' && b.photo.startsWith('data:image'))) {
        pr.photo = b.photo ? b.photo.slice(0, 400000) : null;
      }
      if (Array.isArray(b.skills)) pr.skills = b.skills.slice(0, 8).map(String);
      if (b.address) pr.address.line1 = String(b.address).slice(0, 120);
      if (b.area) pr.address.area = String(b.area).slice(0, 60);
      if (b.pincode) pr.address.pincode = String(b.pincode).slice(0, 10);
      if (Number.isFinite(Number(b.lat))) pr.location.lat = Number(b.lat);
      if (Number.isFinite(Number(b.lng))) pr.location.lng = Number(b.lng);
      if (b.open || b.close) {
        pr.availability.hours = {
          open: String(b.open || pr.availability.hours.open),
          close: String(b.close || pr.availability.hours.close),
        };
      }
      save();
      return ok({ ok: true });
    }

    // ---- availability toggle ----
    if (seg[0] === 'providers' && seg[2] === 'availability' && method === 'POST') {
      const u = needUser(); const d = load();
      const pr = d.providers.find((x) => x.id === seg[1]);
      if (!pr) throw err(404, 'provider_not_found');
      if (pr.userId !== u.id && u.role !== 'admin') throw err(403, 'forbidden');
      pr.availability.manualOpen = body.open === undefined ? !pr.availability.manualOpen : !!body.open;
      save();
      return ok({ ok: true, manualOpen: pr.availability.manualOpen });
    }

    // ═══════════ ADMIN ═══════════
    if (p === '/admin/stats' && method === 'GET') {
      needAdmin();
      const d = load();
      const byCity = {}, byCategory = {};
      d.providers.forEach((pr) => {
        byCity[pr.address.cityId] = (byCity[pr.address.cityId] || 0) + 1;
        byCategory[pr.categoryId] = (byCategory[pr.categoryId] || 0) + 1;
      });
      const today = new Date().toISOString().slice(0, 10);
      return ok({
        totals: {
          providers: d.providers.length,
          verified: d.providers.filter((pr) => pr.verified === 'verified').length,
          pending: d.providers.filter((pr) => pr.verified === 'pending').length,
          users: d.users.length, reviews: d.reviews.length, leads: d.leads.length,
          searches: d.searches.length,
          searchesToday: d.searches.filter((s) => s.createdAt.slice(0, 10) === today).length,
          openReports: d.reports.filter((r) => r.status === 'open').length,
        },
        byCity, byCategory, recentSearches: d.searches.slice(0, 15),
      });
    }
    if (p === '/admin/providers' && method === 'GET') {
      needAdmin();
      const d = load();
      const status = q.get('status'), search = q.get('q');
      let rows = d.providers.slice().reverse();
      if (status) rows = rows.filter((pr) => pr.verified === status);
      if (search) {
        const s = String(search).toLowerCase();
        rows = rows.filter((pr) => (pr.name + pr.businessName + pr.phone + pr.address.city).toLowerCase().includes(s));
      }
      return ok(rows);
    }
    if (p === '/admin/providers' && method === 'POST') {
      needAdmin();
      const d = load(); const b = body || {};
      const cat = d.categories.find((c) => c.id === b.categoryId);
      if (!cat) throw err(400, 'invalid_category');
      const city = d.cities.find((c) => c.id === b.cityId) || d.cities[0];
      d.providers.push({
        id: uid('prv'), userId: b.userId || null,
        name: String(b.name || '').slice(0, 60) || 'Unnamed',
        businessName: String(b.businessName || b.name || '').slice(0, 80),
        categoryId: cat.id, subcategory: String(b.subcategory || (cat.subcategories[0] || {}).id || ''),
        phone: String(b.phone || '').replace(/\D/g, '').slice(-10),
        whatsapp: String(b.whatsapp || b.phone || '').replace(/\D/g, '').slice(-10),
        photo: null, about: String(b.about || '').slice(0, 500),
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
        ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'], createdAt: new Date().toISOString(),
      });
      save();
      return ok({ ok: true, provider: { id: 'new', verified: 'verified' } }, 201);
    }
    if (p === '/admin/providers/bulk' && method === 'POST') {
      needAdmin();
      const d = load();
      const csv = String(body.csv || '');
      const lines = csv.split(/\r?\n/).filter((l) => l.trim());
      const out = { added: 0, skipped: [], rows: [] };
      const parse = (line) => {
        const o = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { o.push(cur); cur = ''; }
          else cur += ch;
        }
        o.push(cur); return o.map((s) => s.trim());
      };
      for (const line of lines) {
        const c = parse(line);
        if (/^name$/i.test(c[0])) continue;
        const [name, businessName, category, subcategory, phone, whatsapp, address, area, cityId, state, pincode, lat, lng, about] = c;
        const cat = d.categories.find((x) => x.id === category);
        const city = d.cities.find((x) => x.id === (cityId || '').toLowerCase());
        if (!name || !cat || !city) {
          out.skipped.push({ name, reason: !name ? 'no name' : !cat ? 'bad category' : 'bad city' });
          continue;
        }
        d.providers.push({
          id: uid('prv'), userId: null,
          name: name.slice(0, 60), businessName: (businessName || name).slice(0, 80),
          categoryId: cat.id, subcategory: subcategory || (cat.subcategories[0] || {}).id || '',
          phone: String(phone || '').replace(/\D/g, '').slice(-10),
          whatsapp: String(whatsapp || phone || '').replace(/\D/g, '').slice(-10),
          photo: null, about: (about || '').slice(0, 500), skills: [], priceHint: '',
          address: {
            line1: address || area || '', area: area || '', city: city.name_en,
            cityId: city.id, state: state || city.state, pincode: pincode || '',
          },
          location: { lat: Number(lat) || city.lat, lng: Number(lng) || city.lng },
          availability: { manualOpen: true, hours: { open: '09:00', close: '19:00' }, offDays: [0] },
          verified: 'verified', source: 'csv', kycStatus: 'bulk-import',
          ratingAvg: 0, ratingCount: 0, languages: ['hi', 'en'], createdAt: new Date().toISOString(),
        });
        out.added++; out.rows.push(name);
      }
      save();
      return ok(out);
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[3] === 'verify' && method === 'POST') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      pr.verified = 'verified'; save();
      return ok({ ok: true, verified: 'verified' });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[3] === 'reject' && method === 'POST') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      pr.verified = 'rejected'; save();
      return ok({ ok: true, verified: 'rejected' });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[2] && method === 'PUT') {
      needAdmin();
      const d = load();
      const pr = d.providers.find((x) => x.id === seg[2]);
      if (!pr) throw err(404, 'not_found');
      const b = body || {};
      ['name', 'businessName', 'about', 'phone', 'whatsapp', 'priceHint'].forEach((k) => {
        if (b[k] != null) pr[k] = String(b[k]).slice(0, 500);
      });
      if (b.categoryId && d.categories.find((c) => c.id === b.categoryId)) pr.categoryId = b.categoryId;
      if (b.subcategory) pr.subcategory = String(b.subcategory);
      if (b.address) pr.address.line1 = String(b.address).slice(0, 120);
      if (b.area) pr.address.area = String(b.area).slice(0, 60);
      if (b.pincode) pr.address.pincode = String(b.pincode).slice(0, 10);
      if (Number.isFinite(Number(b.lat))) pr.location.lat = Number(b.lat);
      if (Number.isFinite(Number(b.lng))) pr.location.lng = Number(b.lng);
      save();
      return ok({ ok: true });
    }
    if (seg[0] === 'admin' && seg[1] === 'providers' && seg[2] && method === 'DELETE') {
      needAdmin();
      const d = load();
      d.providers = d.providers.filter((pr) => pr.id !== seg[2]);
      save();
      return ok({ ok: true });
    }

    // ---- categories admin ----
    if (p === '/admin/categories' && method === 'GET') { needAdmin(); return ok(load().categories); }
    if (p === '/admin/categories' && method === 'POST') {
      needAdmin();
      const d = load(); const b = body || {};
      const id = String(b.id || b.name_en || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
      if (!id || d.categories.find((c) => c.id === id)) throw err(400, 'bad_or_duplicate_id');
      d.categories.push({
        id, name_en: String(b.name_en || '').slice(0, 40), name_hi: String(b.name_hi || '').slice(0, 40),
        icon: String(b.icon || 'wrench').slice(0, 20), order: d.categories.length + 1, active: true,
        subcategories: Array.isArray(b.subcategories) ? b.subcategories : [],
      });
      save();
      return ok({ ok: true, id }, 201);
    }
    if (seg[0] === 'admin' && seg[1] === 'categories' && seg[2] && method === 'PUT') {
      needAdmin();
      const d = load();
      const c = d.categories.find((x) => x.id === seg[2]);
      if (!c) throw err(404, 'not_found');
      const b = body || {};
      if (b.name_en) c.name_en = String(b.name_en).slice(0, 40);
      if (b.name_hi) c.name_hi = String(b.name_hi).slice(0, 40);
      if (b.icon) c.icon = String(b.icon).slice(0, 20);
      if (b.active !== undefined) c.active = !!b.active;
      if (Array.isArray(b.subcategories)) c.subcategories = b.subcategories;
      save();
      return ok({ ok: true });
    }
    if (seg[0] === 'admin' && seg[1] === 'categories' && seg[2] && method === 'DELETE') {
      needAdmin();
      const d = load();
      d.categories = d.categories.filter((c) => c.id !== seg[2]);
      save();
      return ok({ ok: true });
    }

    // ---- moderation ----
    if (p === '/admin/reports' && method === 'GET') {
      needAdmin();
      const d = load();
      return ok(d.reports.map((r) => ({ ...r, provider: d.providers.find((pr) => pr.id === r.providerId) || null })));
    }
    if (seg[0] === 'admin' && seg[1] === 'reports' && seg[3] === 'resolve' && method === 'POST') {
      needAdmin();
      const d = load();
      const r = d.reports.find((x) => x.id === seg[2]);
      if (r) { r.status = 'resolved'; save(); }
      return ok({ ok: true });
    }

    throw err(404, 'not_found');
  }

  function ok(data, status) { return { status: status || 200, data }; }
  function err(status, error, hint) {
    const e = new Error(error);
    e.status = status; e.data = hint ? { error, hint } : { error };
    return e;
  }

  /* ═══════════ OVERRIDE API.req — everything runs locally now ═══════════ */
  if (window.API) {
    API.req = async function (method, path, body) {
      try {
        const r = route(method, path, body, this.token);
        return JSON.parse(JSON.stringify(r.data)); // snapshot like Express res.json
      } catch (e) {
        if (e && e.status === 401) { this.token = ''; this.user = null; }
        if (e && e.status) throw e;
        throw Object.assign(new Error('error'), { data: { error: 'error' }, status: 500 });
      }
    };
    window.LNM_OFFLINE = true; // marker for the UI badge
  }
})();
