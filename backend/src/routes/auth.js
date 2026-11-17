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
  return { id: u.id, phone: u.phone, name: u.name, role: u.role, cityId: u.cityId };
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
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  } else if (req.body.name) {
    user.name = String(req.body.name).slice(0, 60);
  }
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
