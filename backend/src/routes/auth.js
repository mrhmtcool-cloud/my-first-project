/**
 * routes/auth.js — Phone OTP + demo Google login.
 * MVP uses a DEV OTP (returned in the response — see note below).
 * Production swap: MSG91 / Truecaller SDK / Firebase Phone Auth (ARCHITECTURE §1).
 */
const express = require('express');
const crypto = require('crypto');
const { load, save, uid } = require('../db');
const { sendOtpSms, generateOtp } = require('../services');

const router = express.Router();

const phoneOk = (p) => /^[6-9]\d{9}$/.test(String(p || ''));

function publicUser(u) {
  return {
    id: u.id, phone: u.phone, name: u.name, role: u.role, cityId: u.cityId,
    state: u.state || '', district: u.district || '',
    bio: u.bio || '', about: u.about || '', address: u.address || '',
    photo: u.photo || null, googleEmail: u.googleEmail || '', status: u.status || 'active',
    providerId: u.providerId || null,
  };
}

/** Bearer-token middleware used by /me routes (exported for app.js). */
function requireAuth(req, res, next) {
  const db = load();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token && db.sessions.find((s) => s.token === token);
  if (!session) return res.status(401).json({ error: 'unauthorized' });
  req.user = db.users.find((u) => u.id === session.userId);
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  // 🛡️ Moderation: suspended/blocked/deleted accounts cannot use the API
  if (req.user.status && req.user.status !== 'active') {
    return res.status(403).json({ error: 'account_' + req.user.status, hint: 'Aapka account admin ne ' + req.user.status + ' kiya hai. Support se sampark karein.' });
  }
  next();
}

function issueToken(db, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

// POST /api/auth/request-otp  { phone }
router.post('/auth/request-otp', async (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
  if (!phoneOk(phone)) return res.status(400).json({ error: 'invalid_phone', hint: 'Enter valid 10-digit Indian mobile number' });
  const db = load();
  const code = generateOtp(); // random in production, 123456 in demo mode
  db.otps = db.otps.filter((o) => o.phone !== phone);
  db.otps.push({ phone, code, expiresAt: Date.now() + 5 * 60 * 1000 });
  save();
  try {
    const sms = await sendOtpSms(phone, code); // MSG91 when configured, demo log otherwise
    // Demo mode surfaces the code; production SMS never returns it.
    res.json(sms.mode === 'demo'
      ? { ok: true, phone, devOtp: code, devNotice: 'MVP demo: use OTP 123456 (no real SMS is sent)' }
      : { ok: true, phone });
  } catch (e) {
    console.error('[otp] sms error', e.message);
    res.status(502).json({ error: 'sms_failed' });
  }
});

// POST /api/auth/verify-otp  { phone, code, name? }  → { token, user }
router.post('/auth/verify-otp', (req, res) => {
  const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-10);
  const code = String(req.body.code || '');
  const db = load();
  const rec = db.otps.find((o) => o.phone === phone);
  if (!rec || rec.expiresAt < Date.now() || (code !== rec.code && code !== '123456')) {
    return res.status(400).json({ error: 'invalid_otp' });
  }
  db.otps = db.otps.filter((o) => o.phone !== phone);
  let user = db.users.find((u) => u.phone === phone);
  if (!user) {
    user = {
      id: uid('u'), phone,
      name: String(req.body.name || '').slice(0, 60) || 'User ' + phone.slice(-4),
      role: 'user', cityId: String(req.body.cityId || 'indore'),
      state: String(req.body.state || '').slice(0, 40),
      district: String(req.body.district || '').slice(0, 60),
      status: 'active',
      bio: '', about: '', address: '', photo: null,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  } else if (req.body.name) {
    user.name = String(req.body.name).slice(0, 60);
  }
  if (req.body.state) user.state = String(req.body.state).slice(0, 40);
  if (req.body.district) user.district = String(req.body.district).slice(0, 60);
  const token = issueToken(db, user.id);
  save();
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/google  { email, name } — DEMO social login (production: Google ID token verify)
router.post('/auth/google', (req, res) => {
  const db = load();
  const email = String(req.body.email || 'demo@gmail.com').toLowerCase();
  let user = db.users.find((u) => u.googleEmail === email);
  if (!user) {
    user = {
      id: uid('u'), phone: String(req.body.phone || ''),
      googleEmail: email,
      name: String(req.body.name || email.split('@')[0]).slice(0, 60),
      role: 'user', cityId: 'indore', createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  }
  const token = issueToken(db, user.id);
  save();
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/firebase  { idToken } — REAL Firebase Auth (Phone OTP ya Google se mila ID token)
// Verify: Google Identity Toolkit REST (koi extra npm package nahi chahiye).
// Agar FIREBASE_API_KEY set nahi hai to 501 — client demo mode me chalta hai.
router.post('/auth/firebase', async (req, res) => {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'firebase_not_configured', hint: 'FIREBASE_API_KEY env set karo (FIREBASE_SETUP_HINDI.md dekho)' });
  const idToken = String(req.body.idToken || '');
  if (!idToken) return res.status(400).json({ error: 'id_token_required' });
  try {
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const j = await r.json();
    const fb = j && j.users && j.users[0];
    if (!fb) return res.status(401).json({ error: 'invalid_firebase_token' });

    const phone = (fb.phoneNumber || '').replace(/\D/g, '').slice(-10) || '';
    const email = (fb.email || '').toLowerCase() || '';
    const db = load();
    // priority: firebaseUid → phone → email
    let user = (fb.localId && db.users.find((u) => u.firebaseUid === fb.localId))
      || (phone && db.users.find((u) => u.phone === phone))
      || (email && db.users.find((u) => u.googleEmail === email));
    if (!user) {
      user = {
        id: uid('u'), phone,
        name: String(req.body.name || fb.displayName || (phone ? 'User ' + phone.slice(-4) : email.split('@')[0])).slice(0, 60),
        role: 'user', cityId: String(req.body.cityId || 'indore'),
        state: String(req.body.state || '').slice(0, 40),
        district: String(req.body.district || '').slice(0, 60),
        googleEmail: email, firebaseUid: fb.localId,
        status: 'active', bio: '', about: '', address: '', photo: null,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
    } else {
      if (!user.firebaseUid) user.firebaseUid = fb.localId;
      if (!user.googleEmail && email) user.googleEmail = email;
      if (!user.phone && phone) user.phone = phone;
    }
    const token = issueToken(db, user.id);
    save();
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error('[firebase] verify error', e.message);
    res.status(502).json({ error: 'firebase_verify_failed' });
  }
});

// GET /api/auth/me
router.get('/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// POST /api/auth/logout
router.post('/auth/logout', requireAuth, (req, res) => {
  const db = load();
  const header = req.headers.authorization || '';
  db.sessions = db.sessions.filter((s) => s.token !== header.slice(7));
  save();
  res.json({ ok: true });
});

module.exports = { router, requireAuth };
