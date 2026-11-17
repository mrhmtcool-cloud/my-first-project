# Labors Near Me — Complete Source Code (पूरा सोर्स कोड)

> **इस file को किसी भी AI (ChatGPT / Claude / Gemini / Cursor) में upload या paste करो
> और कहो: "ये पूरा project बना दो और चला दो" — नीचे हर file का exact code है।**
>
> **Upload/paste this entire file to any AI coding assistant and say:**
> **"Recreate every file below with the exact paths and contents, then run the project."**
> The AI must write each file EXACTLY as given (same path, same content), then follow
> the RUN section. No external services are required — everything works offline.

---

## 🏃 RUN (how to build & start)

```bash
# 1. Recreate all files exactly as listed below (folder structure = the paths shown)
# 2. Only npm dependency is "express" — install and start:
cd backend
npm install          # installs express (see backend/package.json)
npm start            # → http://localhost:3000  (API + PWA on one port)
```

Open **http://localhost:3000** — that is the whole product (website + installable
mobile PWA + admin panel). Health check: `GET /api/health` → `{"ok":true}`.

### Demo logins (demo OTP mode — no real SMS)
| Role | Mobile | OTP |
|---|---|---|
| Admin | `9000000001` | `123456` |
| Demo user | `9000000002` | `123456` |
| Any new user | any valid 10-digit (starts 6–9) | `123456` |

### Optional extras
```bash
# Single-file OFFLINE app (everything inlined — copy one HTML to any phone):
node tools/build-standalone.js        # → LaborsNearMe.html (~500 KB)

# 39 automated tests of the offline engine:
node tools/test-localapi.js           # → "39 passed, 0 failed"

# Flutter APK source (needs local Flutter SDK):
cd mobile && flutter create . --platforms android && flutter build apk
```

### Binary files (PNG icons) — see the BASE64 section at the end
`web/icons/*.png` and `web/vendor/leaflet/images/*.png` are binary. `icon-192.png` is
provided as base64 at the bottom of this file — decode it. The other icon sizes can be
resized copies of it (or any square PNG placeholders). Leaflet marker PNGs are optional
(markers in the app use inline divIcons; missing leaflet images only affect one default
marker in the registration map).

### Important notes for the AI
- Node.js ≥ 18 required. Backend is CommonJS (`require`). No build step for the web app.
- Database is `backend/data/db.json` (auto-created + seeded on first boot, JSON store).
- The app is bilingual (English/हिंदी), mobile-first, low-bandwidth — keep payloads small.
- `web/js/localapi.js` is an OFFLINE engine that mirrors the REST API in the browser
  (used only by the single-file build; the server build ignores it).
- Do NOT redesign the UI/UX unless asked: big touch targets, icon grid, Hindi/English
  toggle are core requirements. Seed data: 16 categories · 10 cities · 93 providers.

---

## 📁 Folder structure

```
labors-near-me/
├── README.md                  — quickstart + feature checklist
├── DEPLOY_HINDI.md            — Hindi deploy guide (Render/VPS)
├── render.yaml                — one-click Render.com deploy config
├── SOURCE_CODE.md             — THIS FILE
├── docs/
│   └── ARCHITECTURE.md        — 7-deliverable architecture document
├── backend/                   — Node.js + Express REST API
│   ├── package.json
│   └── src/
│       ├── server.js          — entry (0.0.0.0:3000)
│       ├── app.js             — Express app: API + static PWA
│       ├── db.js              — JSON store (backend/data/db.json)
│       ├── geo.js             — haversine / open-now / ranking v2
│       ├── services.js        — MSG91 / FCM / Cloudinary adapters (demo fallbacks)
│       ├── seed.js            — 16 categories, 10 cities, 93 providers, 39 reviews
│       └── routes/
│           ├── public.js      — categories, cities, nearby search, reviews
│           ├── auth.js        — phone-OTP + demo Google login
│           ├── user.js        — favorites, leads, reviews, register, dashboard
│           └── admin.js       — stats, verification, bulk CSV, categories, moderation
├── web/                       — installable PWA (website + app in one)
│   ├── index.html             — app shell + SVG icon sprite
│   ├── css/app.css            — mobile-first stylesheet
│   ├── js/i18n.js             — English/हिंदी dictionary
│   ├── js/api.js              — REST client + UI utilities
│   ├── js/localapi.js         — offline engine (single-file build)
│   ├── js/app.js              — SPA (hash router + all screens)
│   ├── sw.js                  — service worker (offline shell)
│   ├── manifest.webmanifest   — PWA manifest
│   ├── icons/                 — app icons (binary, see BASE64 section)
│   └── vendor/leaflet/        — Leaflet maps (JS/CSS included below)
├── tools/
│   ├── build-standalone.js    — builds single-file offline app
│   └── test-localapi.js       — 39 smoke tests
└── mobile/                    — Flutter source for APK build
    ├── pubspec.yaml
    ├── README.md
    └── lib/ (main, models, core/, screens/)
```

---

# SOURCE FILES


## 📄 `backend/package.json`

````json
{
  "name": "labors-near-me-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node src/server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "Labors Near Me — hyperlocal worker discovery API + PWA",
  "dependencies": {
    "express": "^5.2.1",
    "leaflet": "^1.9.4"
  }
}
````

## 📄 `backend/src/server.js`

````javascript
/**
 * server.js — Entry point. Bind 0.0.0.0 so the live preview proxy can reach it.
 *   node src/server.js   (or: npm start)
 */
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Labors Near Me — API + PWA running at http://0.0.0.0:${PORT}`);
  console.log(`   Health: /api/health · Admin: /#/admin (phone 9000000001, OTP 123456)`);
});
````

## 📄 `backend/src/app.js`

````javascript
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
````

## 📄 `backend/src/db.js`

````javascript
/**
 * db.js — Lightweight JSON document store for the MVP.
 *
 * WHY JSON store here, PostgreSQL in production?
 *  - The MVP must boot anywhere (no DB server to install) — speed-to-MVP.
 *  - The collection shapes below EXACTLY mirror the PostgreSQL schema in
 *    docs/ARCHITECTURE.md (Section 3). Migrating = writing one repository layer.
 * Swap `load()/save()` for pg Pool calls and the routes stay untouched.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

let state = null;

function load(seedIfEmpty) {
  if (state) return state;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DATA_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error('[db] corrupt db.json, reseeding:', e.message);
      state = null;
    }
  }
  if (!state) {
    state = seedIfEmpty();
    save();
  }
  return state;
}

/** Persist to disk (write-through). Fine for MVP traffic; swap for PG at scale. */
function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, DATA_FILE);
}

const uid = (prefix) => prefix + '_' + crypto.randomBytes(6).toString('hex');

module.exports = { load, save, uid, DATA_FILE };
````

## 📄 `backend/src/geo.js`

````javascript
/**
 * geo.js — Geospatial helpers (haversine distance + open-now logic).
 * In production these queries move to PostGIS `ST_DWithin` on a geography
 * column (see ARCHITECTURE.md §3). For thousands of rows, haversine in JS
 * is identical in accuracy and needs no extension.
 */

/** Distance between two lat/lng points in metres (haversine). */
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius (m)
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Human-friendly distance label used across the UI (bilingual-neutral). */
function formatDistance(metres) {
  if (metres == null) return '';
  return metres < 1000
    ? Math.round(metres / 10) * 10 + ' m'
    : (metres / 1000).toFixed(metres < 10000 ? 1 : 0) + ' km';
}

/**
 * Ranking v2 — "Best match" composite score (docs/ARCHITECTURE.md §2):
 *   score = w1·proximity + w2·rating + w3·review-trust + w4·profile-completeness + claim boost
 * Keeps pure `distance` sort available (spec default) while giving better first results.
 */
function relevanceScore(p, distance, radius) {
  const prox = 1 - Math.min(distance / (radius || 25000), 1);   // closer = better
  const rating = (p.ratingAvg || 0) / 5;                          // 0–1
  const trust = Math.min(Math.log10(1 + (p.ratingCount || 0)) / 3, 1); // diminishing returns
  let complete = 0;
  if (p.about) complete += 0.25;
  if (p.photo) complete += 0.25;
  if (p.skills && p.skills.length) complete += 0.25;
  if (p.priceHint) complete += 0.125;
  if (p.subcategory) complete += 0.125;
  const claimed = p.source === 'self' ? 0.05 : 0;                // owner-managed listings
  return 0.45 * prox + 0.30 * rating + 0.15 * trust + 0.10 * complete + claimed;
}

/**
 * Is a provider open right now? IST (UTC+5:30) — platform is India-first.
 * availability = { manualOpen:boolean, hours:{open:"09:00",close:"19:00"}, offDays:[0] }
 */
function isOpenNow(avail) {
  if (!avail) return true;
  if (avail.manualOpen === false) return false;
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const day = ist.getUTCDay(); // 0=Sun after +5:30 shift
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (Array.isArray(avail.offDays) && avail.offDays.includes(day)) return false;
  const h = avail.hours || { open: '08:00', close: '20:00' };
  const toM = (t) => {
    const [hh, mm] = String(t || '0:0').split(':').map(Number);
    return hh * 60 + (mm || 0);
  };
  return mins >= toM(h.open) && mins <= toM(h.close);
}

module.exports = { haversineMetres, formatDistance, isOpenNow, relevanceScore };
````

## 📄 `backend/src/services.js`

````javascript
/**
 * services.js — Production integration adapters with SAFE DEMO FALLBACKS.
 *
 * Each adapter works out-of-the-box in demo mode (no keys needed) and switches
 * to the real provider the moment the matching env var is set — no code changes:
 *
 *   SMS/OTP   : MSG91        → set MSG91_AUTHKEY + MSG91_SENDER_ID (DLT-registered)
 *   Push      : Firebase FCM → set FCM_SERVER_KEY
 *   Photos/KYC: Cloudinary   → set CLOUDINARY_URL
 *
 * This is the exact swap-point promised in docs/ARCHITECTURE.md §1.6–1.8.
 */
const crypto = require('crypto');

/* ───────────────────────── SMS / OTP ───────────────────────── */
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '';
const MSG91_SENDER = process.env.MSG91_SENDER_ID || 'LABORS';

/**
 * Send the login OTP. Demo mode returns the code for on-screen display;
 * production sends a DLT template SMS and the code NEVER leaves the server.
 * @returns {{mode:'demo'|'sent'}}
 */
async function sendOtpSms(phone, code) {
  if (!MSG91_AUTHKEY) {
    console.log(`[sms:demo] +91${phone} → OTP ${code}`);
    return { mode: 'demo' };
  }
  // MSG91 Flow API (DLT-compliant template variable = OTP)
  const body = new URLSearchParams({
    template_id: process.env.MSG91_TEMPLATE_ID || '',
    recipients: JSON.stringify([{ mobiles: '91' + phone, VAR1: code }]),
  });
  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: MSG91_AUTHKEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('sms_failed:' + res.status);
  return { mode: 'sent' };
}

/** Production OTP is random; demo keeps 123456 so testers never get stuck. */
function generateOtp() {
  return MSG91_AUTHKEY ? String(crypto.randomInt(100000, 1000000)) : '123456';
}

/* ───────────────────────── PUSH (FCM) ───────────────────────── */
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';

/**
 * Send a push notification (new lead / verification status).
 * Demo mode logs instead — set FCM_SERVER_KEY for real delivery (Phase 2 phones).
 */
async function sendPush(fcmToken, payload) {
  if (!fcmToken) return { mode: 'skipped' };
  const message = {
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
  };
  if (!FCM_SERVER_KEY) {
    console.log(`[push:demo] ${fcmToken.slice(0, 12)}… →`, message.notification.title, '|', message.notification.body);
    return { mode: 'demo' };
  }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: 'key=' + FCM_SERVER_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: fcmToken, notification: message.notification, data: message.data }),
  });
  return { mode: res.ok ? 'sent' : 'failed' };
}

/** Bilingual "new lead" push — the notification providers care about most. */
function newLeadPush(lead) {
  return {
    title: 'नई लीड! 🔔',
    body: lead.type === 'whatsapp' ? 'किसी ने व्हाट्सएप किया — अभी देखें'
      : lead.type === 'call' ? 'किसी ने कॉल किया — अभी देखें'
      : 'किसी ने रास्ता पूछा',
    data: { type: 'new_lead', leadId: String(lead.id), leadType: lead.type, providerId: String(lead.providerId) },
  };
}

/** Bilingual verification-status push. */
function verifyPush(status) {
  return status === 'verified'
    ? { title: '✅ आपकी लिस्टिंग लाइव है!', body: 'Labors Near Me पर आप खोज में दिख रहे हैं। नई लीड्स के लिए तैयार रहें।', data: { type: 'verified' } }
    : { title: 'लिस्टिंग अपडेट', body: 'आपकी लिस्टिंग की स्थिति बदली गई है — डैशबोर्ड देखें।', data: { type: 'status', status } };
}

/* ───────────────────────── MEDIA (Cloudinary) ───────────────────────── */
const CLOUDINARY_URL = process.env.CLOUDINARY_URL || '';

/**
 * Upload a photo (data-URL from the MVP client) to Cloudinary when configured.
 * Falls back to keeping the compressed data-URL (demo mode — single-node store).
 * @returns {Promise<string|null>} public image URL
 */
async function uploadPhoto(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  if (!CLOUDINARY_URL) return dataUrl.slice(0, 400000); // demo: inline
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', process.env.CLOUDINARY_PRESET || 'labors_unsigned');
  form.append('folder', 'labors-near-me/providers');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_URL.split('@')[1]}/image/upload`, {
    method: 'POST', body: form,
  });
  if (!res.ok) return dataUrl.slice(0, 400000); // never block onboarding on media
  const json = await res.json();
  return json.secure_url || dataUrl.slice(0, 400000);
}

module.exports = {
  sendOtpSms, generateOtp,
  sendPush, newLeadPush, verifyPush,
  uploadPhoto,
  smsDemo: !MSG91_AUTHKEY,
};
````

## 📄 `backend/src/seed.js`

````javascript
/**
 * seed.js — Day-one demo data for a PAN-INDIA launch.
 * 16 icon-driven categories (bilingual) + 93 providers across 10 cities,
 * realistic Indian names/areas, reviews in Hindi + English.
 * Phone numbers are clearly-fake demo numbers (9xxxxxxx pattern).
 */

const CATEGORIES = [
  { id: 'electrician', name_en: 'Electrician', name_hi: 'इलेक्ट्रीशियन', icon: 'bolt', order: 1, active: true,
    subcategories: [
      { id: 'house-wiring', name_en: 'House Wiring', name_hi: 'घर की वायरिंग' },
      { id: 'fan-inverter', name_en: 'Fan / Inverter', name_hi: 'पंखा / इन्वर्टर' },
      { id: 'electrical-repair', name_en: 'Electrical Repair', name_hi: 'बिजली मरम्मत' } ] },
  { id: 'engineer', name_en: 'Engineer', name_hi: 'इंजीनियर', icon: 'helmet', order: 2, active: true,
    subcategories: [
      { id: 'civil', name_en: 'Civil Engineer', name_hi: 'सिविल इंजीनियर' },
      { id: 'site-supervisor', name_en: 'Site Supervisor', name_hi: 'साइट सुपरवाइजर' },
      { id: 'estimation', name_en: 'Estimation / Drawing', name_hi: 'एस्टीमेट / ड्राइंग' } ] },
  { id: 'tailor', name_en: 'Tailor', name_hi: 'दर्जी', icon: 'scissors', order: 3, active: true,
    subcategories: [
      { id: 'blouse-suit', name_en: 'Blouse / Suit Stitching', name_hi: 'ब्लाउज / सूट सिलाई' },
      { id: 'alteration', name_en: 'Alteration', name_hi: 'अल्टरेशन' },
      { id: 'boutique', name_en: 'Boutique / Designer', name_hi: 'बुटीक / डिज़ाइनर' } ] },
  { id: 'dry-cleaner', name_en: 'Dry Cleaner', name_hi: 'ड्राई क्लीनर', icon: 'hanger', order: 4, active: true,
    subcategories: [
      { id: 'dry-clean', name_en: 'Dry Clean', name_hi: 'ड्राई क्लीन' },
      { id: 'laundry', name_en: 'Laundry', name_hi: 'लॉन्ड्री' },
      { id: 'steam-press', name_en: 'Steam Press', name_hi: 'स्टीम प्रेस' } ] },
  { id: 'raj-mistri', name_en: 'Raj Mistri (Mason)', name_hi: 'राज मिस्त्री', icon: 'brick', order: 5, active: true,
    subcategories: [
      { id: 'brickwork', name_en: 'Brick / Masonry', name_hi: 'ईंट / राज मिस्त्री काम' },
      { id: 'plaster', name_en: 'Plaster / POP', name_hi: 'प्लास्टर / पीओपी' },
      { id: 'tiles', name_en: 'Tiles / Flooring', name_hi: 'टाइल्स / फर्श' } ] },
  { id: 'bhandara-catering', name_en: 'Bhandara / Catering', name_hi: 'भंडारा / कैटरिंग', icon: 'pot', order: 6, active: true,
    subcategories: [
      { id: 'bhandara', name_en: 'Bhandara / Langar', name_hi: 'भंडारा / लंगर' },
      { id: 'catering', name_en: 'Party Catering', name_hi: 'पार्टी कैटरिंग' },
      { id: 'sweets', name_en: 'Sweets / Namkeen', name_hi: 'मिठाई / नमकीन' } ] },
  { id: 'plumber', name_en: 'Plumber', name_hi: 'प्लंबर', icon: 'wrench', order: 7, active: true,
    subcategories: [
      { id: 'tap-leak', name_en: 'Tap / Leak Repair', name_hi: 'नल / लीक मरम्मत' },
      { id: 'fitting', name_en: 'Bathroom Fitting', name_hi: 'बाथरूम फिटिंग' },
      { id: 'tank', name_en: 'Water Tank Work', name_hi: 'पानी टंकी काम' } ] },
  { id: 'carpenter', name_en: 'Carpenter', name_hi: 'बढ़ई', icon: 'hammer', order: 8, active: true,
    subcategories: [
      { id: 'furniture', name_en: 'Furniture', name_hi: 'फर्नीचर' },
      { id: 'door-window', name_en: 'Door / Window', name_hi: 'दरवाज़ा / खिड़की' },
      { id: 'repair', name_en: 'Repair Work', name_hi: 'मरम्मत काम' } ] },
  { id: 'painter', name_en: 'Painter', name_hi: 'पेंटर', icon: 'brush', order: 9, active: true,
    subcategories: [
      { id: 'interior', name_en: 'Interior Painting', name_hi: 'इंटीरियर पेंट' },
      { id: 'exterior', name_en: 'Exterior Painting', name_hi: 'एक्सटीरियर पेंट' },
      { id: 'polish', name_en: 'Polish / Duco', name_hi: 'पॉलिश / ड्यूको' } ] },
  { id: 'safai-karamchari', name_en: 'Safai Karamchari', name_hi: 'सफाई कर्मचारी', icon: 'broom', order: 10, active: true,
    subcategories: [
      { id: 'house-cleaning', name_en: 'House Cleaning', name_hi: 'घर की सफाई' },
      { id: 'office-cleaning', name_en: 'Office / Shop Cleaning', name_hi: 'ऑफिस / दुकान सफाई' },
      { id: 'deep-clean', name_en: 'Deep Cleaning', name_hi: 'डीप क्लीनिंग' } ] },
  { id: 'ac-fridge-repair', name_en: 'AC / Fridge Repair', name_hi: 'एसी / फ्रिज मरम्मत', icon: 'snow', order: 11, active: true,
    subcategories: [
      { id: 'ac-repair', name_en: 'AC Repair / Service', name_hi: 'एसी मरम्मत / सर्विस' },
      { id: 'fridge', name_en: 'Fridge Repair', name_hi: 'फ्रिज मरम्मत' },
      { id: 'washing-machine', name_en: 'Washing Machine', name_hi: 'वॉशिंग मशीन' } ] },
  { id: 'driver', name_en: 'Driver', name_hi: 'ड्राइवर', icon: 'wheel', order: 12, active: true,
    subcategories: [
      { id: 'personal-driver', name_en: 'Personal Driver', name_hi: 'पर्सनल ड्राइवर' },
      { id: 'taxi', name_en: 'Taxi / Cab', name_hi: 'टैक्सी / कैब' },
      { id: 'goods', name_en: 'Goods Vehicle', name_hi: 'माल गाड़ी' } ] },
  { id: 'mobile-repair', name_en: 'Mobile Repair', name_hi: 'मोबाइल मरम्मत', icon: 'mobile', order: 13, active: true,
    subcategories: [
      { id: 'screen-battery', name_en: 'Screen / Battery', name_hi: 'स्क्रीन / बैटरी' },
      { id: 'software', name_en: 'Software / Update', name_hi: 'सॉफ्टवेयर / अपडेट' },
      { id: 'accessories', name_en: 'Accessories / Charging', name_hi: 'एक्सेसरीज़ / चार्जिंग' } ] },
  { id: 'beautician', name_en: 'Beautician at Home', name_hi: 'ब्यूटीशियन (घर पर)', icon: 'comb', order: 14, active: true,
    subcategories: [
      { id: 'bridal', name_en: 'Bridal Makeup', name_hi: 'दुल्हन मेकअप' },
      { id: 'salon-home', name_en: 'Salon at Home', name_hi: 'घर पर सैलून' },
      { id: 'mehndi', name_en: 'Mehndi / Hair', name_hi: 'मेहंदी / हेयर' } ] },
  { id: 'cook', name_en: 'Cook / Rasoiya', name_hi: 'कुक / रसोइया', icon: 'chef', order: 15, active: true,
    subcategories: [
      { id: 'home-cook', name_en: 'Home Cook', name_hi: 'घर का खाना' },
      { id: 'party-cook', name_en: 'Party Cook', name_hi: 'पार्टी कुक' },
      { id: 'tiffin', name_en: 'Tiffin Service', name_hi: 'टिफिन सर्विस' } ] },
  { id: 'mali', name_en: 'Mali / Gardener', name_hi: 'माली / बागवान', icon: 'leaf', order: 16, active: true,
    subcategories: [
      { id: 'garden-care', name_en: 'Garden Care', name_hi: 'बगीचा देखभाल' },
      { id: 'plants', name_en: 'Indoor Plants', name_hi: 'इनडोर प्लांट' },
      { id: 'lawn', name_en: 'Lawn / Tree Trim', name_hi: 'लॉन / पेड़ कटाई' } ] },
];

const CITIES = [
  { id: 'indore', name_en: 'Indore', name_hi: 'इंदौर', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { id: 'bhopal', name_en: 'Bhopal', name_hi: 'भोपाल', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { id: 'jaipur', name_en: 'Jaipur', name_hi: 'जयपुर', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { id: 'pune', name_en: 'Pune', name_hi: 'पुणे', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { id: 'lucknow', name_en: 'Lucknow', name_hi: 'लखनऊ', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { id: 'patna', name_en: 'Patna', name_hi: 'पटना', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { id: 'nagpur', name_en: 'Nagpur', name_hi: 'नागपुर', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { id: 'surat', name_en: 'Surat', name_hi: 'सूरत', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { id: 'ahmedabad', name_en: 'Ahmedabad', name_hi: 'अहमदाबाद', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { id: 'varanasi', name_en: 'Varanasi', name_hi: 'वाराणसी', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
];

/** Compact provider tuple → full record.
 * [name, business, cat, sub, phone, cityId, area, pincode, dLat, dLng, about, skills, price, rating, count, source, verified] */
const P = (t) => {
  const [name, businessName, categoryId, subcategory, phone, cityId, area, pincode, dLat, dLng, about, skills, priceHint, ratingAvg, ratingCount, source, verified, userId] = t;
  const city = CITIES.find((c) => c.id === cityId);
  const hours = t[18] || { open: '09:00', close: '19:00', offDays: [0] };
  return {
    id: 'prv_' + businessName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) + '_' + cityId.slice(0, 3),
    userId: userId || null,
    name, businessName, categoryId, subcategory,
    phone, whatsapp: phone,
    photo: null, // null → UI renders a low-bandwidth SVG monogram avatar
    about, skills,
    priceHint,
    address: { line1: area + ', ' + city.name_en, area, city: city.name_en, cityId, state: city.state, pincode },
    location: { lat: +(city.lat + dLat).toFixed(6), lng: +(city.lng + dLng).toFixed(6) },
    availability: { manualOpen: true, hours: { open: hours.open, close: hours.close }, offDays: hours.offDays },
    verified,
    source,
    kycStatus: source === 'self' ? 'submitted' : 'admin-added',
    ratingAvg, ratingCount,
    languages: ['hi', 'en'],
    createdAt: '2026-08-01T10:00:00.000Z',
  };
};

const PROVIDERS = P.toString; // (placeholder to keep linter quiet — real list below)

function buildProviders() {
  const list = [
    // ─── INDORE ────────────────────────────────────────────────────────────
    P(['Ramprasad Yadav', 'Shree Ram Raj Mistri Karyalaya', 'raj-mistri', 'brickwork', '9826011101', 'indore', 'Rajwada, Sarafa Bazaar', '452002', 0.004, -0.003, '20+ saal ka anubhav — makan, deewar, plaster aur tiles ka pura kaam. Mazdoor team ke saath.', ['Brickwork', 'Plaster', 'House construction'], '₹450/day per mazdoor', 4.8, 64, 'admin', 'verified']),
    P(['Sunita Verma', 'Verma Electricals', 'electrician', 'house-wiring', '9826011102', 'indore', 'Vijay Nagar', '452010', 0.021, 0.030, 'Ghar ki wiring, MCB, inverter fitting — ladies electrician team available.', ['House wiring', 'MCB', 'Inverter'], '₹250 visit', 4.6, 41, 'self', 'verified', 'u_sunita']),
    P(['Imran Qureshi', 'Qureshi Tailors & Boutique', 'tailor', 'blouse-suit', '9826011103', 'indore', 'Sarafa Road, Itwaria Bazaar', '452002', 0.002, 0.008, 'Blouse, suit, kurti silai — 24 ghante me delivery option. Bridal orders welcome.', ['Blouse stitching', 'Suit', 'Bridal'], '₹150 blouse onwards', 4.9, 88, 'admin', 'verified']),
    P(['Anil Kushwaha', 'Kushwaha Plumbing Works', 'plumber', 'tap-leak', '9826011104', 'indore', 'Sudama Nagar', '452009', -0.035, -0.028, 'Nal, leak, motor, bathroom fitting — emergency me 30 minute me. 24x7 emergency service.', ['Leak repair', 'Bathroom fitting', 'Motor'], '₹200 visit', 4.4, 33, 'self', 'verified', 'u_anil', { open: '00:00', close: '23:59', offDays: [] }]),
    P(['Dinesh Patidar', 'Patidar AC & Fridge Care', 'ac-fridge-repair', 'ac-repair', '9826011105', 'indore', 'Palasia', '452001', 0.010, 0.006, 'AC gas filling, service, fridge & washing machine repair. All brands.', ['AC service', 'Gas filling', 'Fridge'], '₹350 service', 4.5, 52, 'admin', 'verified'], ),
    P(['Rafiq Khan', 'Khan Dry Cleaners', 'dry-cleaner', 'dry-clean', '9826011106', 'indore', 'New Market, Bhawarkua', '452001', -0.006, -0.010, 'Dry clean, laundry, steam press — suiting, sherwani, saree specialist. Home pickup available.', ['Dry clean', 'Laundry', 'Sherwani'], '₹40/kg laundry', 4.3, 27, 'admin', 'verified']),
    P(['Bhagwan Das', 'Das Safai Sewa', 'safai-karamchari', 'deep-clean', '9826011107', 'indore', 'Mhow Naka', '452001', -0.018, 0.012, 'Ghar, office, tank ki safai. Deep cleaning team — festival season advance booking.', ['Deep cleaning', 'Water tank', 'Office cleaning'], '₹1200/day team', 4.2, 19, 'self', 'verified', 'u_bhagwan']),
    P(['Mahesh Chouhan', 'Chouhan Carpenter Works', 'carpenter', 'furniture', '9826011108', 'indore', 'Bicholi Mardana', '452016', 0.040, 0.015, 'Furniture, bed, almari, door-window — order se banaya jata hai.', ['Furniture', 'Modular kitchen', 'Doors'], 'Quote on visit', 4.7, 38, 'admin', 'verified'], ),
    P(['Ramesh Solanki', 'Solanki Paint House', 'painter', 'interior', '9826011109', 'indore', 'Nipania', '452016', 0.032, 0.041, 'Interior/exterior paint, putty, polish. Asian Paints dealer partner.', ['Interior paint', 'Putty', 'Polish'], '₹12/sqft onwards', 4.5, 45, 'admin', 'verified']),
    P(['Amit Tiwari', 'Tiwari Bhandara & Catering', 'bhandara-catering', 'bhandara', '9826011110', 'indore', 'Khajrana', '452016', 0.028, 0.038, 'Bhandara, langar, shadi, bhog — 50 se 5000 logon tak ka intezaam. Bartan aur sevak samet.', ['Bhandara', 'Wedding catering', 'Bhog'], '₹80/thali onwards', 4.8, 71, 'admin', 'verified']),
    P(['Sanjay Mehta', 'Mehta Electrical Engineer', 'engineer', 'estimation', '9826011111', 'indore', 'AB Road, Bhawarkua', '452001', -0.009, -0.015, 'BE Electrical — ghar/factory ka load calculation, estimation, drawing, supervision.', ['Load calculation', 'Estimation', 'Supervision'], '₹1500/visit consult', 4.6, 22, 'self', 'verified', 'u_sanjay']),
    P(['Golu Yadav', 'Golu Driver Seva', 'driver', 'personal-driver', '9826011112', 'indore', 'Snehlataganj', '452001', 0.005, -0.020, 'Personal driver, outstation, pickup-drop. 10 saal ka experience. Night drive ok.', ['Personal driver', 'Outstation', 'Airport drop'], '₹700/day', 4.4, 29, 'self', 'verified', 'u_golu', { open: '00:00', close: '23:59', offDays: [] }]),

    // ─── BHOPAL ────────────────────────────────────────────────────────────
    P(['Shakeel Ahmed', 'Ahmed Electric Works', 'electrician', 'fan-inverter', '9826021101', 'bhopal', 'Hamidia Road, Itkhedi', '462001', 0.008, -0.012, 'Pankha, cooler, inverter, ghar ki wiring. Same-day service.', ['Fan repair', 'Inverter', 'Wiring'], '₹200 visit', 4.5, 36, 'admin', 'verified']),
    P(['Kailash Vishwakarma', 'Vishwakarma Raj Mistri', 'raj-mistri', 'plaster', '9826021102', 'bhopal', 'Kolar Road', '462042', -0.022, 0.018, 'Plaster, deewar, makan ka pura kaam. 15 mazdooron ki team.', ['Plaster', 'Masonry', 'Flooring'], '₹500/day', 4.6, 44, 'admin', 'verified']),
    P(['Rekha Sahu', 'Sahu Boutique & Tailors', 'tailor', 'boutique', '9826021103', 'bhopal', 'MP Nagar Zone 2', '462011', 0.012, 0.004, 'Designer blouse, suit, lehenga. Ladies tailoring classes bhi.', ['Boutique', 'Lehenga', 'Classes'], '₹200 onwards', 4.8, 57, 'self', 'verified', 'u_rekha']),
    P(['Javed Iqbal', 'Iqbal Plumbers', 'plumber', 'fitting', '9826021104', 'bhopal', 'Arera Colony', '462016', 0.015, 0.010, 'Bathroom & kitchen fitting, CPVC, concealed leak detection.', ['CPVC', 'Fitting', 'Leak detection'], '₹250 visit', 4.3, 25, 'admin', 'verified']),
    P(['Ravi Malviya', 'Malviya Catering Services', 'bhandara-catering', 'catering', '9826021105', 'bhopal', 'Bairagarh', '462030', -0.030, -0.025, 'Shadi, mundan, bhandara — pura setup ke saath. Veg specialist.', ['Wedding', 'Bhandara', 'Full setup'], '₹150/plate', 4.7, 63, 'admin', 'verified']),
    P(['Suresh Prajapati', 'Prajapati Potteries & Pots', 'bhandara-catering', 'bhandara', '9826021106', 'bhopal', 'Idgah Hills', '462001', 0.006, 0.014, 'Bhandara ke liye bartan, handi, chulha kiraye par — safai samet.', ['Utensils on rent', 'Handi', 'Chulha'], '₹1500 setup', 4.1, 14, 'self', 'pending', 'u_suresh']),

    // ─── JAIPUR ────────────────────────────────────────────────────────────
    P(['Girdhari Lal Sharma', 'Sharma Mason Works', 'raj-mistri', 'tiles', '9826031101', 'jaipur', 'Bapu Bazaar', '302003', 0.005, -0.007, 'Tiles, flooring, marble — 25 saal ka tajurba. Hawa Mahal area me famous.', ['Tiles', 'Marble', 'Flooring'], '₹550/day', 4.7, 51, 'admin', 'verified']),
    P(['Mohammad Arif', 'Arif Tailor House', 'tailor', 'alteration', '9826031102', 'jaipur', 'Chandpole', '302001', 0.002, 0.003, 'Pant-shirt, salwar-suit alteration & stitching. 1 ghante me urgent alteration.', ['Alteration', 'Stitching', 'Urgent'], '₹30 alteration', 4.4, 73, 'admin', 'verified']),
    P(['Deepak Saini', 'Saini Electricals Jhotwara', 'electrician', 'electrical-repair', '9826031103', 'jaipur', 'Jhotwara', '302012', -0.018, -0.014, 'Factory & ghar electrical work, panel, motor winding.', ['Panel', 'Motor winding', 'Wiring'], '₹300 visit', 4.5, 30, 'self', 'verified', 'u_deepak']),
    P(['Lakhan Meena', 'Meena Paint & Polish', 'painter', 'exterior', '9826031104', 'jaipur', 'Mansarovar', '302020', -0.012, 0.020, 'Exterior paint jo Rajasthan ki garmi jhel le. Distemper, weather coat.', ['Exterior', 'Weather coat', 'Distemper'], '₹10/sqft', 4.2, 21, 'admin', 'verified']),
    P(['Bhanwar Singh', 'Singh Driver Service', 'driver', 'taxi', '9826031105', 'jaipur', 'Sindhi Camp', '302001', 0.001, 0.001, 'Jaipur darshan, outstation taxi — Innova, Dzire available. Hindi/English speaking.', ['Taxi', 'Jaipur tour', 'Outstation'], '₹1200/day', 4.6, 40, 'admin', 'verified']),

    // ─── PUNE ──────────────────────────────────────────────────────────────
    P(['Sachin Jadhav', 'Jadhav AC Care', 'ac-fridge-repair', 'ac-repair', '9826041101', 'pune', 'Kothrud', '411038', 0.006, -0.010, 'AC service ₹399, gas filling, installation. All brands. Waranty on work.', ['AC service', 'Installation', 'Gas filling'], '₹399 service', 4.7, 95, 'admin', 'verified']),
    P(['Farhan Shaikh', 'Shaikh Tailors Camp', 'tailor', 'blouse-suit', '9826041102', 'pune', 'Camp, MG Road', '411001', 0.003, 0.004, 'Pant-shirt, coat-suit, kurta. 30 saal purani dukaan.', ['Coat suit', 'Kurta', 'Shirts'], '₹250 shirt', 4.5, 60, 'admin', 'verified']),
    P(['Nitin Bhosale', 'Bhosale Plumbing Solutions', 'plumber', 'tank', '9826041103', 'pune', 'Hadapsar', '411028', -0.015, 0.022, 'Society tank cleaning, pipeline, motor — AMC available.', ['Tank cleaning', 'Pipeline', 'AMC'], '₹300 visit', 4.3, 26, 'self', 'verified', 'u_nitin']),
    P(['Anjali Pawar', 'Pawar Safe & Clean', 'safai-karamchari', 'office-cleaning', '9826041104', 'pune', 'Baner', '411045', 0.014, -0.018, 'Office & shop daily cleaning contracts. Verified staff, police verified.', ['Office cleaning', 'Contracts', 'Daily staff'], '₹8000/month', 4.6, 33, 'self', 'verified', 'u_anjali']),
    P(['Vikram Shinde', 'Shinde Furniture Works', 'carpenter', 'door-window', '9826041105', 'pune', 'Pimpri', '411017', 0.025, -0.005, 'Door, window, plywood work. Modular kitchen specialist.', ['Doors', 'Plywood', 'Modular kitchen'], 'Quote on visit', 4.8, 47, 'admin', 'verified']),

    // ─── LUCKNOW ───────────────────────────────────────────────────────────
    P(['Rajesh Kannaujia', 'Kannaujia Mistri Karyalaya', 'raj-mistri', 'brickwork', '9826051101', 'lucknow', 'Aliganj', '226024', 0.010, 0.008, 'Nakashi kaam, makan, deewar — Lucknow ke purane karigar.', ['Masonry', 'Nakashi', 'Construction'], '₹400/day', 4.6, 39, 'admin', 'verified']),
    P(['Zahid Ali', 'Ali Tailors Aminabad', 'tailor', 'blouse-suit', '9826051102', 'lucknow', 'Aminabad', '226018', 0.001, -0.002, 'Chikan work, salwar-kameez, sherwani. Lucknowi chikan specialist.', ['Chikan', 'Sherwani', 'Suits'], '₹300 onwards', 4.9, 82, 'admin', 'verified']),
    P(['Pooja Yadav', 'Yadav Electric Care', 'electrician', 'house-wiring', '9826051103', 'lucknow', 'Gomti Nagar', '226010', 0.016, 0.014, 'Ghar ki wiring aur repair — ladies electrician available on request.', ['Wiring', 'Repair', 'Doorbell/CCTV'], '₹220 visit', 4.5, 28, 'self', 'verified', 'u_pooja']),
    P(['Brijesh Tiwari', 'Tiwari Bhandara Seva', 'bhandara-catering', 'bhandara', '9826051104', 'lucknow', 'Chowk', '226003', -0.003, -0.006, 'Bhandara, bhog, langar — 25 saal se seva me. Puri-sabzi, khichdi prasad.', ['Bhandara', 'Bhog', 'Prasad'], '₹60/thali', 4.8, 90, 'admin', 'verified', null, { open: '04:00', close: '23:00', offDays: [] }]),
    P(['Arun Kumar', 'Kumar Dry Wash', 'dry-cleaner', 'laundry', '9826051105', 'lucknow', 'Indira Nagar', '226016', 0.012, 0.018, 'Laundry ₹35/kg, dry clean, iron. 24 ghante delivery.', ['Laundry', 'Ironing', 'Delivery'], '₹35/kg', 4.2, 18, 'self', 'pending', 'u_arun']),

    // ─── PATNA ─────────────────────────────────────────────────────────────
    P(['Sanjay Prasad', 'Prasad Mason & Construction', 'raj-mistri', 'plaster', '9826061101', 'patna', 'Kankarbagh', '800020', 0.008, -0.005, 'Makan, boundary, plaster — Bihar me kai project kiye hain.', ['Masonry', 'Boundary', 'Plaster'], '₹380/day', 4.4, 31, 'admin', 'verified']),
    P(['Md. Sarfaraz', 'Sarfaraz Tailoring Hub', 'tailor', 'boutique', '9826061102', 'patna', 'Gandhi Maidan', '800001', 0.002, 0.001, 'Bridal, designer suit, kurti. Patna ka bharosamand tailor.', ['Bridal', 'Designer', 'Kurti'], '₹350 onwards', 4.6, 44, 'admin', 'verified']),
    P(['Ravi Ranjan', 'Ranjan Electricals Danapur', 'electrician', 'fan-inverter', '9826061103', 'patna', 'Danapur', '801503', -0.020, -0.028, 'Inverter, battery, pankha, wiring — ghar par service.', ['Inverter', 'Battery', 'Wiring'], '₹180 visit', 4.3, 22, 'self', 'verified', 'u_raviranjan']),
    P(['Kiran Devi', 'Kiran Safai Kendra', 'safai-karamchari', 'house-cleaning', '9826061104', 'patna', 'Boring Road', '800001', 0.004, 0.008, 'Ghar ki safai, jhadu-pocha staff, mahilaon ki team. Rozana/naptana.', ['Home cleaning', 'Staff placement', 'Daily'], '₹5000/month staff', 4.5, 35, 'self', 'verified', 'u_kiran']),
    P(['Gopal Sharma', 'Sharma Repair Center', 'ac-fridge-repair', 'fridge', '9826061105', 'patna', 'Rajendra Nagar', '800016', -0.006, 0.012, 'Freeze, washing machine, RO — ghar par repair. 90 din warranty.', ['Fridge', 'Washing machine', 'RO'], '₹300 visit', 4.1, 16, 'admin', 'verified']),

    // ─── NAGPUR ────────────────────────────────────────────────────────────
    P(['Ashok Meshram', 'Meshram Electrical Works', 'electrician', 'electrical-repair', '9826071101', 'nagpur', 'Sitabuldi', '440012', 0.003, -0.004, 'Industrial & home electrical. LT/HT work licensed.', ['Industrial', 'LT/HT', 'Repair'], '₹350 visit', 4.6, 40, 'admin', 'verified']),
    P(['Santosh Thakre', 'Thakre Furniture Gharana', 'carpenter', 'furniture', '9826071102', 'nagpur', 'Dharampeth', '440010', 0.006, 0.007, 'Sofa, bed, mandir — teak & plywood dono me kaam.', ['Sofa', 'Beds', 'Mandir'], 'Quote on visit', 4.7, 37, 'admin', 'verified']),
    P(['Rehan Khan', 'Khan Dry Clean Dharampeth', 'dry-cleaner', 'dry-clean', '9826071103', 'nagpur', 'Dharampeth', '440010', 0.008, 0.005, 'Dry clean & laundry. Wedding season special rates.', ['Dry clean', 'Wedding wear', 'Laundry'], '₹45/kg', 4.4, 23, 'admin', 'verified']),
    P(['Devendra Wankhede', 'Wankhede Catering & Bhandara', 'bhandara-catering', 'catering', '9826071104', 'nagpur', 'Manish Nagar', '440037', -0.024, 0.016, 'Orange city ke bharosamand caterers. 100–3000 guests.', ['Catering', 'Bhandara', 'Events'], '₹130/plate', 4.5, 48, 'admin', 'verified']),

    // ─── SURAT ─────────────────────────────────────────────────────────────
    P(['Bhavesh Patel', 'Patel Plumbing & Bath', 'plumber', 'fitting', '9826081101', 'surat', 'Adajan', '395009', 0.010, -0.008, 'Bathroom fitting, concealed plumbing, leak — society AMC.', ['Bathroom', 'Concealed', 'AMC'], '₹250 visit', 4.6, 55, 'admin', 'verified']),
    P(['Mukesh Rathod', 'Rathod Raj Mistri', 'raj-mistri', 'tiles', '9826081102', 'surat', 'Katargam', '395004', -0.008, 0.010, 'Tiles, granite, marble flooring. Textile area me famous.', ['Tiles', 'Granite', 'Marble'], '₹500/day', 4.5, 42, 'admin', 'verified']),
    P(['Yusuf Pathan', 'Pathan Tailors Ring Road', 'tailor', 'alteration', '9826081103', 'surat', 'Ring Road', '395002', 0.004, 0.002, 'Pant-shirt, salwar, blouse. Bulk orders for shops accepted.', ['Bulk orders', 'Stitching', 'Alteration'], '₹120 onwards', 4.3, 34, 'self', 'verified', 'u_yusuf']),
    P(['Hetal Ben', 'Shree Ganesh Safai Seva', 'safai-karamchari', 'deep-clean', '9826081104', 'surat', 'Vesu', '395007', 0.018, -0.015, 'Home & office deep cleaning, sofa shampoo, tank cleaning.', ['Deep clean', 'Sofa shampoo', 'Tank'], '₹1500 onwards', 4.7, 39, 'self', 'verified', 'u_hetal']),

    // ─── AHMEDABAD ─────────────────────────────────────────────────────────
    P(['Jignesh Shah', 'Shah Electricals Maninagar', 'electrician', 'house-wiring', '9826091101', 'ahmedabad', 'Maninagar', '380008', 0.007, 0.012, 'Home automation, wiring, MCB. Smart switch installation.', ['Smart home', 'Wiring', 'MCB'], '₹300 visit', 4.8, 66, 'admin', 'verified']),
    P(['Prakash Bhai', 'Patel Mason Works', 'raj-mistri', 'brickwork', '9826091102', 'ahmedabad', 'Naroda', '382330', 0.022, 0.006, 'Makan, pol house renovation — experienced mason team.', ['Renovation', 'Masonry', 'Pol houses'], '₹450/day', 4.4, 29, 'admin', 'verified']),
    P(['Alpesh Chauhan', 'Chauhan Paint Studio', 'painter', 'polish', '9826091103', 'ahmedabad', 'Satellite', '380015', -0.006, -0.010, 'Texture paint, wood polish, duco. Designer finishes.', ['Texture', 'Polish', 'Duco'], '₹18/sqft', 4.6, 41, 'self', 'verified', 'u_alpesh']),
    P(['Rameshbhai Patel', 'Patel Dry Clean Navrangpura', 'dry-cleaner', 'dry-clean', '9826091104', 'ahmedabad', 'Navrangpura', '380006', 0.002, -0.003, 'Dry clean, curtain dry clean, carpet wash. Home pickup.', ['Curtains', 'Carpets', 'Pickup'], '₹50/kg', 4.5, 47, 'admin', 'verified']),

    // ─── VARANASI ──────────────────────────────────────────────────────────
    P(['Umesh Dubey', 'Dubey Purohit & Bhandara Seva', 'bhandara-catering', 'bhandara', '9826101101', 'varanasi', 'Godowlia', '221001', 0.002, -0.003, 'Bhandara, terahvin, shraddh bhoj — pura pandit aur bhoj intezaam.', ['Shraddh', 'Bhandara', 'Purohit'], '₹70/thali', 4.9, 102, 'admin', 'verified']),
    P(['Shiv Kumar Prajapati', 'Prajapati Potter Bhojeshpur', 'raj-mistri', 'brickwork', '9826101102', 'varanasi', 'Lahartara', '221002', -0.012, 0.014, 'Deewar, makan, matka bhatti — paramparik karigar.', ['Masonry', 'Bhatti', 'Walls'], '₹350/day', 4.3, 20, 'self', 'verified', 'u_shiv']),
    P(['Ajeet Yadav', 'Yadav Driver Sewa', 'driver', 'goods', '9826101103', 'varanasi', 'Cantonment', '221002', 0.008, 0.002, 'Tempo, goods shifting, passenger auto — ghats tak service.', ['Tempo', 'Shifting', 'Local'], '₹600/day', 4.2, 25, 'admin', 'verified']),
    // ─── EXPANDED COVERAGE — new categories + more cities (appended; keeps review indices stable) ──
    // Mobile Repair
    P(['Salman Qureshi', 'Mobile Care Indore', 'mobile-repair', 'screen-battery', '9826011201', 'indore', 'Sarafa, Itwaria', '452002', 0.003, 0.005, 'Screen, battery, charging jack — sabhi brand ki mobile repair. 30 minute me screen change.', ['Screen change', 'Battery', 'Charging'], '₹250 onwards', 4.6, 58, 'admin', 'verified']),
    P(['Deepak Vishwakarma', 'Vishwakarma Mobile Point', 'mobile-repair', 'software', '9826021201', 'bhopal', 'MP Nagar Zone 1', '462011', 0.010, 0.002, 'Software, hang, update, data recovery — Android & iPhone.', ['Software', 'Data recovery', 'Update'], '₹200 visit', 4.4, 41, 'self', 'verified', 'u_deepakm']),
    P(['Anil Saini', 'Saini Mobile Gharana', 'mobile-repair', 'accessories', '9826031201', 'jaipur', 'Bapu Bazaar', '302003', 0.004, -0.005, 'Cover, glass, charger, earphone — mobile accessories ki dukaan. Repair bhi.', ['Accessories', 'Glass', 'Charger'], '₹100 onwards', 4.3, 35, 'admin', 'verified']),
    P(['Prasad Jadhav', 'Jadhav Mobile Solutions', 'mobile-repair', 'screen-battery', '9826041201', 'pune', 'FC Road', '411004', 0.004, -0.006, 'iPhone & Android screen, battery original. 6 mahine warranty.', ['iPhone', 'Screen', 'Battery'], '₹400 onwards', 4.7, 73, 'admin', 'verified']),
    P(['Amit Gupta', 'Gupta Mobile Repair', 'mobile-repair', 'software', '9826051201', 'lucknow', 'Hazratganj', '226001', 0.002, 0.003, 'Mobile software, hang, update — genuine repair with bill.', ['Software', 'Repair', 'Update'], '₹250 visit', 4.2, 26, 'self', 'verified', 'u_amitg']),
    P(['Firoz Khan', 'Khan Mobile Care', 'mobile-repair', 'screen-battery', '9826071201', 'nagpur', 'Sitabuldi', '440012', 0.002, -0.003, 'All brand mobile repair — screen, battery, speaker, mic.', ['Screen', 'Speaker', 'Mic'], '₹200 onwards', 4.5, 44, 'admin', 'verified']),
    // Beautician at Home
    P(['Priya Sharma', 'Priya Beauty Parlour at Home', 'beautician', 'salon-home', '9826011202', 'indore', 'Vijay Nagar', '452010', 0.019, 0.028, 'Facial, waxing, threading, pedicure — ghar par service. Ladies only.', ['Facial', 'Waxing', 'Pedicure'], '₹500 onwards', 4.8, 67, 'self', 'verified', 'u_priyab']),
    P(['Sunita Rathore', 'Rathore Bridal Studio', 'beautician', 'bridal', '9826031202', 'jaipur', 'Vaishali Nagar', '302021', -0.010, 0.015, 'Bridal makeup, HD makeup, saree draping. Jaipur ki famous bridal artist.', ['Bridal', 'HD makeup', 'Saree draping'], '₹8000/bridal', 4.9, 84, 'admin', 'verified']),
    P(['Nazia Sheikh', 'Nazia Mehndi & Beauty', 'beautician', 'mehndi', '9826041202', 'pune', 'Kondhwa', '411048', -0.012, 0.010, 'Bridal mehndi, engagement, party makeup. Arabic & Rajasthani design.', ['Mehndi', 'Makeup', 'Arabic design'], '₹1500/hand', 4.7, 52, 'self', 'verified', 'u_nazia']),
    P(['Rekha Pandey', 'Pandey Beauty Point', 'beautician', 'salon-home', '9826051202', 'lucknow', 'Gomti Nagar', '226010', 0.014, 0.012, 'Ghar par parlour — facial, cleanup, hair spa. Budget friendly.', ['Facial', 'Hair spa', 'Cleanup'], '₹300 onwards', 4.4, 38, 'admin', 'verified']),
    P(['Hetal Patel', 'Hetal Makeover Studio', 'beautician', 'bridal', '9826081202', 'surat', 'Athwalines', '395007', 0.006, -0.006, 'Bridal & reception makeup, nail art. Surat brides ka bharosa.', ['Bridal', 'Nail art', 'Reception'], '₹6000/bridal', 4.8, 61, 'admin', 'verified']),
    // Cook / Rasoiya
    P(['Shyamlal Yadav', 'Yadav Rasoiya Seva', 'cook', 'home-cook', '9826011203', 'indore', 'Rajwada', '452002', 0.001, -0.002, 'Ghar ka swadisht khana — lunch/dinner cook. Shudh shakahari.', ['Home cook', 'Veg', 'Lunch/Dinner'], '₹8000/month', 4.7, 45, 'self', 'verified', 'u_shyamlal']),
    P(['Munni Devi', 'Munni Devi Tiffin Seva', 'cook', 'tiffin', '9826021203', 'bhopal', 'Kolar Road', '462042', -0.020, 0.016, 'Tiffin service — ghar jaisa khana. Roz 2 time tiffin, monthly plan.', ['Tiffin', 'Monthly', 'Home food'], '₹2200/month', 4.6, 58, 'admin', 'verified']),
    P(['Ramesh Kushwaha', 'Kushwaha Party Rasoi', 'cook', 'party-cook', '9826051203', 'lucknow', 'Chowk', '226003', -0.002, -0.004, 'Party, shaadi, pooja ke liye cook. 50 se 500 logon ka khana.', ['Party cook', 'Wedding', 'Pooja bhoj'], '₹150/plate', 4.5, 39, 'admin', 'verified']),
    P(['Sunita Kumari', 'Sunita Kitchen Seva', 'cook', 'home-cook', '9826061203', 'patna', 'Boring Road', '800001', 0.005, 0.007, 'Bihari & north Indian khana — ghar par cook. Non-veg bhi.', ['Home cook', 'Bihari', 'Non-veg'], '₹7000/month', 4.3, 24, 'self', 'pending', 'u_sunitak']),
    P(['Hasmukh Bhai', 'Patel Rasoi & Tiffin', 'cook', 'tiffin', '9826091203', 'ahmedabad', 'Navrangpura', '380006', 0.001, -0.002, 'Gujarati tiffin — rotli, dal-bhaat, shaak. Students & office ke liye.', ['Tiffin', 'Gujarati', 'Veg'], '₹1800/month', 4.6, 51, 'admin', 'verified']),
    // Mali / Gardener
    P(['Gopal Mali', 'Gopal Bagiya Sewa', 'mali', 'garden-care', '9826011204', 'indore', 'Palasia', '452001', 0.009, 0.004, 'Bagicha ki dekhbhal — paudhe, paani, khad. Monthly service available.', ['Garden care', 'Khad', 'Pruning'], '₹1500/month', 4.5, 31, 'self', 'verified', 'u_gopalm']),
    P(['Santosh Gawde', 'Gawde Nursery & Mali', 'mali', 'plants', '9826041204', 'pune', 'Baner', '411045', 0.012, -0.016, 'Indoor plants, pots, vertical garden. Plant supply + maintenance.', ['Indoor plants', 'Pots', 'Vertical garden'], '₹500 onwards', 4.7, 42, 'admin', 'verified']),
    P(['Raju Thakur', 'Thakur Lawn Care', 'mali', 'lawn', '9826071204', 'nagpur', 'Dharampeth', '440010', 0.007, 0.006, 'Lawn cutting, tree trimming, society garden contract.', ['Lawn', 'Tree trim', 'Society contract'], '₹2000/month', 4.4, 27, 'admin', 'verified']),
    P(['Shiv Bahadur', 'Shiv Vatika Sewa', 'mali', 'garden-care', '9826101204', 'varanasi', 'Lanka', '221005', -0.005, -0.008, 'Ghar ke bagiche ka pura kaam — paudhe, ghass, ped. Kashi me 20 saal.', ['Garden', 'Plants', 'Trees'], '₹1200/month', 4.3, 19, 'self', 'verified', 'u_shivb']),
    // More coverage — existing categories
    P(['Sanjay Dangi', 'Dangi Civil Engineers', 'engineer', 'civil', '9826011205', 'indore', 'Bhawarkua', '452001', -0.008, -0.012, 'Civil engineer — naksha, estimation, site supervision. 12 saal ka experience.', ['Civil', 'Naksha', 'Supervision'], '₹2000/consult', 4.6, 29, 'admin', 'verified']),
    P(['Ramesh Patel', 'Patel Safai Kendra', 'safai-karamchari', 'house-cleaning', '9826011206', 'indore', 'Sudama Nagar', '452009', -0.032, -0.025, 'Ghar ki safai, tanki safai, sofa cleaning. Mahilaon ki team available.', ['House cleaning', 'Tank', 'Sofa'], '₹1000/day', 4.4, 33, 'self', 'verified', 'u_rameshp']),
    P(['Iqbal Ahmed', 'Ahmed Paint Works', 'painter', 'interior', '9826021205', 'bhopal', 'Hamidia Road', '462001', 0.007, -0.010, 'Interior paint, putty, texture. Berger & Asian Paints approved.', ['Interior', 'Putty', 'Texture'], '₹11/sqft', 4.4, 28, 'admin', 'verified']),
    P(['Manoj Yadav', 'Yadav Driver Service', 'driver', 'personal-driver', '9826021206', 'bhopal', 'Arera Colony', '462016', 0.013, 0.008, 'Personal driver, office drop, outstation. Bhopal ka local expert.', ['Driver', 'Outstation', 'Office drop'], '₹650/day', 4.5, 31, 'self', 'verified', 'u_manojy']),
    P(['Sohan Lal', 'Lal Plumbing Works', 'plumber', 'tap-leak', '9826031205', 'jaipur', 'Malviya Nagar', '302017', -0.008, 0.012, 'Nal, leak, motor, overhead tank — 24x7 emergency service.', ['Leak', 'Motor', 'Tank'], '₹220 visit', 4.3, 27, 'admin', 'verified']),
    P(['Kailash Sharma', 'Sharma Bhandara Bhoj', 'bhandara-catering', 'bhandara', '9826031206', 'jaipur', 'Sanganer', '302029', -0.015, -0.010, 'Bhandara, terahvin, bhoj — pura intezaam bartan samet.', ['Bhandara', 'Bhoj', 'Teraahvin'], '₹65/thali', 4.6, 47, 'admin', 'verified']),
    P(['Ganesh Shinde', 'Shinde Electricals', 'electrician', 'electrical-repair', '9826041205', 'pune', 'Wakad', '411057', 0.015, -0.012, 'Ghar ki electrical repair, MCB, fan, inverter. Same day visit.', ['Repair', 'MCB', 'Inverter'], '₹250 visit', 4.5, 37, 'admin', 'verified']),
    P(['Sadanand More', 'More Raj Mistri Works', 'raj-mistri', 'plaster', '9826041206', 'pune', 'Hadapsar', '411028', -0.013, 0.020, 'Plaster, deewar, makan kaam — 20 mazdooron ki team.', ['Plaster', 'Masonry', 'Construction'], '₹480/day', 4.4, 30, 'self', 'verified', 'u_sadanand']),
    P(['Vinod Kumar', 'Kumar Paint House', 'painter', 'exterior', '9826051205', 'lucknow', 'Aliganj', '226024', 0.011, 0.007, 'Exterior & interior paint, distemper, weather coat. Lucknow me 15 saal.', ['Exterior', 'Distemper', 'Weather coat'], '₹9/sqft', 4.3, 25, 'admin', 'verified']),
    P(['Sarvesh Mishra', 'Mishra AC & Home Care', 'ac-fridge-repair', 'washing-machine', '9826051206', 'lucknow', 'Indira Nagar', '226016', 0.013, 0.017, 'AC, fridge, washing machine — sab kuch ek jagah. 90 din warranty.', ['AC', 'Fridge', 'Washing machine'], '₹350 service', 4.6, 44, 'admin', 'verified']),
    P(['Rajkishore Sinha', 'Sinha Plumbing & Sanitary', 'plumber', 'fitting', '9826061205', 'patna', 'Kankarbagh', '800020', 0.007, -0.004, 'Bathroom fitting, sanitary, concealed plumbing. New house special.', ['Fitting', 'Sanitary', 'Concealed'], '₹250 visit', 4.4, 28, 'admin', 'verified']),
    P(['Pappu Yadav', 'Yadav Furniture & Wood Work', 'carpenter', 'furniture', '9826061206', 'patna', 'Rajendra Nagar', '800016', -0.008, -0.010, 'Beds, almari, sofa, mandir — teak & plywood. Order par banaya jata hai.', ['Furniture', 'Beds', 'Sofa'], 'Quote on visit', 4.3, 22, 'self', 'verified', 'u_pappuy']),
    P(['Ashok Wankhede', 'Wankhede Plumbing Care', 'plumber', 'tap-leak', '9826071205', 'nagpur', 'Manish Nagar', '440037', -0.022, 0.014, 'Nal, leak, motor, bathroom fitting. Emergency service 24x7.', ['Leak', 'Motor', 'Fitting'], '₹200 visit', 4.4, 32, 'admin', 'verified']),
    P(['Jitendra Sonkar', 'Sonkar Paint & Polish', 'painter', 'polish', '9826071206', 'nagpur', 'Sadar', '440001', 0.004, -0.002, 'Wood polish, duco, texture paint. Furniture polish specialist.', ['Polish', 'Duco', 'Texture'], '₹15/sqft', 4.5, 26, 'self', 'verified', 'u_jitendra']),
    P(['Kishore Solanki', 'Solanki Electric Works', 'electrician', 'house-wiring', '9826081205', 'surat', 'Katargam', '395004', -0.007, 0.009, 'Ghar ki wiring, inverter, MCB. Society AMC available.', ['Wiring', 'Inverter', 'MCB'], '₹250 visit', 4.5, 36, 'admin', 'verified']),
    P(['Bharat Patel', 'Patel Bhandara & Catering', 'bhandara-catering', 'catering', '9826081206', 'surat', 'Adajan', '395009', 0.011, -0.009, 'Bhandara, party catering, sweets. Surat ka famous veg caterer.', ['Catering', 'Bhandara', 'Sweets'], '₹120/plate', 4.7, 54, 'admin', 'verified']),
    P(['Bhavesh Rathod', 'Rathod Tailor Studio', 'tailor', 'blouse-suit', '9826091205', 'ahmedabad', 'Maninagar', '380008', 0.006, 0.011, 'Blouse, suit, kurti, patola blouse. Ladies tailoring specialist.', ['Blouse', 'Suit', 'Kurti'], '₹180 onwards', 4.5, 38, 'admin', 'verified']),
    P(['Naresh Solanki', 'Solanki Driver Seva', 'driver', 'taxi', '9826091206', 'ahmedabad', 'Satellite', '380015', -0.005, -0.009, 'Ahmedabad local & outstation taxi. Airport drop ₹500.', ['Taxi', 'Airport', 'Outstation'], '₹700/day', 4.4, 33, 'self', 'verified', 'u_nareshs']),
    P(['Ravi Shankar', 'Shankar Tailor & Boutique', 'tailor', 'boutique', '9826101205', 'varanasi', 'Godowlia', '221001', 0.003, -0.002, 'Banarasi saree blouse, kurta, suit. Ghat area me 25 saal se.', ['Blouse', 'Kurta', 'Banarasi'], '₹200 onwards', 4.6, 41, 'admin', 'verified']),
    P(['Dinesh Prajapati', 'Prajapati Electricals Lanka', 'electrician', 'fan-inverter', '9826101206', 'varanasi', 'Lanka', '221005', -0.006, -0.007, 'Pankha, inverter, cooler, wiring — Lanka BHU area service.', ['Fan', 'Inverter', 'Wiring'], '₹180 visit', 4.3, 24, 'self', 'pending', 'u_dineshp']),
  ];
  // ensure stable ids even when business names collide across cities
  const seen = new Map();
  return list.map((p, i) => {
    if (seen.has(p.id)) p.id = p.id + '_' + i;
    seen.set(p.id, true);
    return p;
  });
}

const REVIEWS = [
  // [providerIndex (0-based into buildProviders()), userName, rating, text, daysAgo]
  [0, 'Sunita G.', 5, 'Deewar aur plaster ka kaam bahut badhiya. Time par aaye aur saaf kaam kiya.', 40],
  [0, 'Rakesh P.', 5, 'Best mason in Rajwada area. Rates bhi theek.', 25],
  [0, 'Anwar S.', 4, 'Kaam achha hai, thoda late aaye.', 10],
  [1, 'Meena J.', 5, 'Wiring clean ki, ab tak koi problem nahi.', 18],
  [1, 'Arun T.', 4, 'Inverter fitting theek-thaak.', 6],
  [2, 'Farida B.', 5, 'Blouse fitting perfect! 24 ghante me delivery mil gaya.', 33],
  [2, 'Neha K.', 5, 'Bridal blouse bahut sundar bana. Highly recommended.', 14],
  [3, 'Pankaj S.', 4, 'Leak theek kar diya jaldi. Price reasonable.', 12],
  [4, 'Sanjay M.', 5, 'AC gas filling ke baad ekdum chill. 90 din me dobara free service.', 22],
  [4, 'Ritu D.', 4, 'Fridge repair kiya, thoda mehnga laga par kaam achha.', 8],
  [6, 'Kamla B.', 4, 'Deep cleaning ki team ne ghar chamka diya.', 9],
  [9, 'Shyam L.', 5, 'Bhandara me 800 logon ka khana — sab set. Sevak bhi mile.', 30],
  [9, 'Dinesh A.', 5, 'Shadi me catering kiya, khana lazeez tha.', 12],
  [12, 'Anil V.', 5, 'Cooler/inverter dono theek. Same day service.', 15],
  [14, 'Kavita R.', 5, 'Designer blouse banwaya, bahut pasand aaya.', 20],
  [13, 'Imran H.', 4, 'Plaster ka kaam majboot hai.', 11],
  [29, 'Pooja N.', 5, 'Chikan suit perfect stitching. Aminabad ka best.', 26],
  [23, 'Vikas G.', 5, 'AC service ₹399 me ekdum clean. Punctual team.', 17],
  [27, 'Sushil K.', 4, 'Furniture ka kaam badhiya, halka mehnga.', 7],
  [36, 'Amit A.', 5, 'Boring Road wali safai team — mahilaon ki team, bharosamand.', 13],
  [46, 'Nishant P.', 5, 'Smart switch installation perfect. Gujarat ke best!', 19],
  [50, 'Ganesh R.', 5, 'Terahvin bhoj ka pura intezaam. Bahut dhanyavad.', 28],
  [50, 'Sarita S.', 5, 'Pandit ji ke saath bhoj bhi — ek hi jagah sab.', 15],
  [51, 'Ramesh D.', 4, 'Paramparik karigar, kaam bharosamand.', 5],
  [53, 'Vikas R.', 5, 'Mobile ka screen 30 minute me change. Rate bhi theek.', 9],
  [56, 'Sneha P.', 5, 'iPhone battery original lagi, 6 mahine warranty mila.', 12],
  [59, 'Aarti S.', 5, 'Ghar par facial karwaya — parlour jaisa result. Very polite.', 7],
  [60, 'Deepa M.', 5, 'Bridal makeup perfect! Photos me ekdum glowing.', 21],
  [61, 'Farah N.', 4, 'Mehndi design bahut sundar. Thoda late aayi.', 6],
  [64, 'Sushma G.', 5, 'Roz ka khana ghar jaisa — pure shakahari, saaf-suthra.', 15],
  [65, 'Ankit J.', 4, 'Tiffin time par milta hai. Dal-roti achhi.', 8],
  [69, 'Meera T.', 5, 'Bagiche ke paudhe ab khil rahe hain. Monthly service le li.', 11],
  [70, 'Rohit K.', 5, 'Indoor plants ke liye best — office me lagwaye, sab tareef karte hain.', 14],
  [73, 'Pankaj D.', 5, 'Naksha aur estimation dono perfect. Ghar ka kaam smooth chala.', 18],
  [79, 'Nilesh B.', 4, 'Wiring ka kaam jaldi kiya. Rate reasonable.', 5],
  [82, 'Shruti L.', 5, 'Washing machine aur AC dono theek kiye. Ek hi visit me!', 10],
  [87, 'Dhaval P.', 5, 'Society ka pura wiring kaam — licensed electrician.', 16],
  [88, 'Kiran B.', 5, 'Bhandara me 300 log — khana lazeez, safai bhi.', 13],
  [91, 'Anupama S.', 5, 'Banarasi blouse ka fitting ekdum perfect.', 4],
];

function buildSeed() {
  const providers = buildProviders();
  const users = [
    { id: 'u_admin', phone: '9000000001', name: 'Platform Admin', role: 'admin', cityId: 'indore', createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'u_demo', phone: '9000000002', name: 'Amit Sharma', role: 'user', cityId: 'indore', createdAt: '2026-08-10T09:00:00.000Z' },
  ];
  // one user record per linked provider account
  providers.filter((p) => p.userId).forEach((p) => {
    if (!users.find((u) => u.id === p.userId)) {
      users.push({ id: p.userId, phone: p.phone, name: p.name, role: 'provider', cityId: p.address.cityId, createdAt: '2026-08-05T09:00:00.000Z' });
    }
  });

  const reviews = REVIEWS.map((r, i) => ({
    id: 'rev_' + (i + 1),
    providerId: (providers[r[0]] || providers[0]).id,
    userId: 'u_demo',
    userName: r[1],
    rating: r[2],
    text: r[3],
    createdAt: new Date(Date.now() - r[4] * 86400000).toISOString(),
  }));

  return {
    users,
    sessions: [],
    otps: [],
    categories: CATEGORIES,
    cities: CITIES,
    providers,
    reviews,
    favorites: [{ userId: 'u_demo', providerId: providers[0].id, createdAt: new Date().toISOString() }],
    leads: [],
    reports: [],
    searches: [
      { id: 'srch_1', q: 'electrician near me', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 3600e3).toISOString() },
      { id: 'srch_2', q: 'raj mistri', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 7200e3).toISOString() },
      { id: 'srch_3', q: 'tailor', cityId: 'pune', userId: null, createdAt: new Date(Date.now() - 86400e3).toISOString() },
      { id: 'srch_4', q: 'bhandara', cityId: 'lucknow', userId: null, createdAt: new Date(Date.now() - 90000e3).toISOString() },
      { id: 'srch_5', q: 'dry cleaner', cityId: 'jaipur', userId: null, createdAt: new Date(Date.now() - 92000e3).toISOString() },
      { id: 'srch_6', q: 'mobile repair', cityId: 'indore', userId: null, createdAt: new Date(Date.now() - 3600e3 * 3).toISOString() },
      { id: 'srch_7', q: 'beautician', cityId: 'jaipur', userId: null, createdAt: new Date(Date.now() - 3600e3 * 5).toISOString() },
      { id: 'srch_8', q: 'cook tiffin', cityId: 'lucknow', userId: null, createdAt: new Date(Date.now() - 3600e3 * 7).toISOString() },
    ],
    meta: { seededAt: new Date().toISOString(), version: 2 },
  };
}

module.exports = { buildSeed };
````

## 📄 `backend/src/routes/public.js`

````javascript
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
````

## 📄 `backend/src/routes/auth.js`

````javascript
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
````

## 📄 `backend/src/routes/user.js`

````javascript
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
````

## 📄 `backend/src/routes/admin.js`

````javascript
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
````

## 📄 `web/index.html`

````html
<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F97316">
  <meta property="og:title" content="Labors Near Me — लेबर्स नियर मी">
  <meta property="og:description" content="Find trusted workers near you — electricians, tailors, masons, plumbers. Call / WhatsApp in one tap.">
  <meta property="og:image" content="/icons/icon-512.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large">
  <meta name="description" content="Labors Near Me — अपने पास के भरोसेमंद कामगार खोजें. Find electricians, tailors, raj mistris, plumbers and more near you.">
  <title>Labors Near Me — Find trusted workers near you</title>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="icon" href="/icons/icon-192.png">
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>

<!-- ══════════ SVG ICON SPRITE (offline, zero-download icon system) ══════════ -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <!-- service categories -->
  <symbol id="i-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></symbol>
  <symbol id="i-helmet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 15a7.5 7.5 0 0 1 15 0"/><path d="M2.5 15h19"/><path d="M3 18.5V15h18v3.5"/><path d="M12 7.5V4.5"/></symbol>
  <symbol id="i-scissors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9"/><path d="M14.5 14.5 20 20"/><path d="M8.1 8.1 12 12"/></symbol>
  <symbol id="i-hanger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5a2 2 0 1 1 2 2c-1 0-2 .8-2 1.8V11"/><path d="M12 11 4.5 16.2c-1 .7-.5 2.3.7 2.3h13.6c1.2 0 1.7-1.6.7-2.3L12 11z"/></symbol>
  <symbol id="i-brick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="8" height="5.5" rx="0.5"/><rect x="13" y="4.5" width="8" height="5.5" rx="0.5"/><rect x="3" y="13" width="8" height="5.5" rx="0.5"/><rect x="13" y="13" width="8" height="5.5" rx="0.5"/></symbol>
  <symbol id="i-pot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5z"/><path d="M2 12h2M20 12h2"/><path d="M9.5 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/></symbol>
  <symbol id="i-wrench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol>
  <symbol id="i-hammer" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(-45 12 12)"><rect x="8.5" y="2.5" width="7" height="5" rx="1"/><path d="M12 7.5V20"/></g></symbol>
  <symbol id="i-brush" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="13" height="5" rx="1.5"/><path d="M16 6h3a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19 12h-9"/><rect x="7.5" y="12" width="6" height="8" rx="1.5"/></symbol>
  <symbol id="i-broom" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 3 11.5 11.5"/><path d="M8 15 3.5 20c2 2 5.5 2.5 8.5 0.5L8 15z"/><path d="M8.5 17.5 6 21M11 15.5 10 19.5M13.5 13 13.5 17"/></symbol>
  <symbol id="i-snow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="7" rx="2"/><path d="M7 9.5h10"/><path d="M7 12.5v3M12 12.5v4M17 12.5v3"/></symbol>
  <symbol id="i-wheel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M5.6 16.5l5.2-3M18.4 16.5l-5.2-3"/></symbol>
  <symbol id="i-mobile" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></symbol>
  <symbol id="i-comb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="18" height="6" rx="1.5"/><path d="M7 9.5v11M11 9.5v11M15 9.5v11M18 9.5v11"/></symbol>
  <symbol id="i-chef" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17h12v3H6z"/><path d="M7 17a4 4 0 0 1-1-7.9A4 4 0 0 1 12 5a4 4 0 0 1 6 4.1A4 4 0 0 1 17 17"/></symbol>
  <symbol id="i-leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 9 12 4 20 4c0 8-5 15-15 15z"/><path d="M5 19c3-5 7-8 11-10"/></symbol>
  <!-- ui -->
  <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></symbol>
  <symbol id="i-whatsapp" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15L2 22.5 5.6 24a10 10 0 1 0 6.4-22zm0 2a8 8 0 1 1-4.2 14.8l-.5-.3-2.5.7.7-2.4-.3-.5A8 8 0 0 1 12 4zm-2.2 4c-.2 0-.5 0-.7.4-.3.4-.9 1-.9 2.2s.9 2.4 1 2.6c.2.2 1.9 3 4.7 4 2.3.9 2.8.7 3.3.6.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.1-1.4l-.7-.4c-.4-.2-1.7-.8-2-.9-.2-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.1-.2 0-.4.1-.5l.5-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5l-.8-1.8c-.1-.3-.3-.3-.5-.3z"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3 6.5 7 .8-5.2 4.7 1.4 6.9L12 17.5 5.8 20.9 7.2 14 2 9.3l7-.8z"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21S3 14.5 3 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9 2.8C21 14.5 12 21 12 21z"/></symbol>
  <symbol id="i-nav" viewBox="0 0 24 24"><path fill="currentColor" d="M3 11 21 3l-8 18-2.5-7.5z"/></symbol>
  <symbol id="i-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></symbol>
  <symbol id="i-map" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="M9 12l2 2 4-4"/></symbol>
  <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
  <symbol id="i-logo" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 4.5 5.4 10.2 6.4 11.3.3.4.9.4 1.2 0C13.6 19.2 19 13.5 19 9a7 7 0 0 0-7-7zm0 4.5A2.5 2.5 0 1 1 12 11a2.5 2.5 0 0 1 0-5z"/></symbol>
</svg>

<!-- ══════════ APP SHELL ══════════ -->
<div class="app-frame" id="app-frame">
  <header id="topbar">
    <a class="logo" href="#/" aria-label="Labors Near Me home">
      <span class="logo-badge"><img src="/icons/icon-192.png" alt="Labors Near Me" width="30" height="30"></span>
      <span class="logo-text">Labors <em>Near Me</em></span>
    </a>
    <div class="topbar-actions">
      <button class="city-btn" id="city-btn" type="button">
        <svg class="ic"><use href="#i-pin"></use></svg><span id="city-label">…</span>
      </button>
      <button class="lang-btn" id="lang-btn" type="button" title="English / हिंदी">EN</button>
    </div>
  </header>

  <div id="offline-banner" hidden>⚠️ <span id="offline-text"></span></div>

  <main id="view" tabindex="-1"><!-- routed screens render here --></main>

  <nav id="bottomnav" aria-label="Main">
    <a class="nav-item" href="#/" data-nav="home"><svg class="ic"><use href="#i-home"></use></svg><span data-i18n="nav_home"></span></a>
    <a class="nav-item" href="#/search" data-nav="search"><svg class="ic"><use href="#i-search"></use></svg><span data-i18n="nav_search"></span></a>
    <a class="nav-item" href="#/favorites" data-nav="fav"><svg class="ic"><use href="#i-heart"></use></svg><span data-i18n="nav_fav"></span></a>
    <a class="nav-item" href="#/account" data-nav="account"><svg class="ic"><use href="#i-user"></use></svg><span data-i18n="nav_account"></span></a>
  </nav>
</div>

<div id="modal-root"></div>
<div id="toast-root" aria-live="polite"></div>

<script src="/vendor/leaflet/leaflet.js"></script>
<script src="/js/i18n.js"></script>
<script src="/js/api.js"></script>
<script src="/js/app.js"></script>
</body>
</html>
````

## 📄 `web/css/app.css`

````css
/* ═══════════════════════════════════════════════════════════════════════════
   Labors Near Me — mobile-first stylesheet
   UX constraints honoured: BIG touch targets (≥48px), high contrast,
   icon-driven, system fonts (incl. Devanagari), zero webfont downloads.
   ═══════════════════════════════════════════════════════════════════════════ */
:root {
  --amber: #F59E0B; --amber-dark: #B45309; --amber-soft: #FEF3C7;
  --green: #059669; --green-soft: #D1FAE5;
  --red: #DC2626; --red-soft: #FEE2E2;
  --ink: #1C1917; --ink-2: #57534E; --ink-3: #A8A29E;
  --bg: #FAFAF9; --card: #FFFFFF; --line: #E7E5E4;
  --wa: #25D366;
  --radius: 14px; --shadow: 0 1px 3px rgba(28, 25, 23, .08), 0 4px 14px rgba(28, 25, 23, .06);
  --nav-h: 62px;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html { font-size: 16px; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans Devanagari', 'Nirmala UI', sans-serif;
  overscroll-behavior-y: none;
}
button, input, select, textarea { font: inherit; color: inherit; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; }

.app-frame {
  max-width: 560px; margin: 0 auto; min-height: 100vh;
  background: var(--bg); position: relative;
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
}
body.wide .app-frame { max-width: 1080px; }
@media (min-width: 720px) {
  .app-frame { box-shadow: 0 0 40px rgba(0,0,0,.08); }
}

/* ── Top bar ─────────────────────────────────────────────────────────── */
#topbar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px calc(10px);
  background: linear-gradient(135deg, #FB923C 0%, #F97316 55%, #EA580C 100%);
  color: #fff;
}
.logo { display: flex; align-items: center; gap: 8px; min-width: 0; }
.logo-badge { display: grid; place-items: center; width: 36px; height: 36px; background: rgba(255,255,255,.22); border-radius: 10px; flex: none; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
.logo-badge img { display: block; border-radius: 9px; }
.logo-text { font-weight: 800; font-size: 1.05rem; letter-spacing: .2px; white-space: nowrap; }
.logo-text em { font-style: normal; font-weight: 500; opacity: .95; }
.topbar-actions { display: flex; gap: 8px; align-items: center; }
.city-btn {
  display: flex; align-items: center; gap: 4px; max-width: 140px;
  background: rgba(255,255,255,.2); border: 0; color: #fff; font-weight: 600;
  border-radius: 999px; padding: 9px 12px; min-height: 40px; cursor: pointer;
}
.city-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lang-btn {
  min-width: 46px; min-height: 40px; border: 2px solid rgba(255,255,255,.65);
  background: transparent; color: #fff; font-weight: 800; border-radius: 999px; cursor: pointer;
}

#offline-banner {
  background: #7C2D12; color: #FED7AA; text-align: center;
  font-size: .85rem; padding: 6px 12px;
}

/* ── Bottom nav (big thumbs targets) ─────────────────────────────────── */
#bottomnav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 560px; z-index: 50;
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: var(--card); border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
body.wide #bottomnav { max-width: 1080px; }
.nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-height: var(--nav-h); font-size: .72rem; font-weight: 600; color: var(--ink-2);
}
.nav-item .ic { width: 24px; height: 24px; }
.nav-item.active { color: var(--amber-dark); }
.nav-item.active .ic { stroke-width: 2.4; }

/* ── Generic bits ───────────────────────────────────────────────────── */
#view { padding: 14px 14px 24px; outline: none; }
.section-title { font-size: 1.02rem; font-weight: 800; margin: 18px 2px 10px; display: flex; align-items: center; justify-content: space-between; }
.section-title .link { font-size: .85rem; color: var(--amber-dark); font-weight: 700; cursor: pointer; }
.muted { color: var(--ink-2); font-size: .88rem; }
.tiny { font-size: .75rem; color: var(--ink-3); }
.stars { color: var(--amber-dark); font-size: .88rem; white-space: nowrap; }
.stars b { color: var(--ink); font-size: .88rem; }
.stars i { color: var(--ink-3); font-style: normal; font-weight: 400; font-size: .78rem; }
.ic { width: 20px; height: 20px; flex: none; }
.ic-lg { width: 26px; height: 26px; }

.badge {
  display: inline-flex; align-items: center; gap: 3px; font-size: .72rem; font-weight: 700;
  padding: 3px 8px; border-radius: 999px; white-space: nowrap;
}
.badge .ic { width: 13px; height: 13px; }
.badge-open { background: var(--green-soft); color: var(--green); }
.badge-closed { background: var(--line); color: var(--ink-2); }
.badge-verified { background: var(--amber-soft); color: var(--amber-dark); }
.badge-pending { background: #FEF9C3; color: #854D0E; }
.badge-rejected { background: var(--red-soft); color: var(--red); }
.dist-badge { background: var(--amber-soft); color: var(--amber-dark); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 48px; padding: 10px 16px; border-radius: 12px; border: 0;
  font-weight: 700; font-size: .95rem; cursor: pointer; transition: transform .05s;
}
.btn:active { transform: scale(.97); }
.btn-primary { background: var(--amber); color: #fff; }
.btn-dark { background: var(--ink); color: #fff; }
.btn-ghost { background: var(--card); border: 1.5px solid var(--line); color: var(--ink); }
.btn-call { background: var(--amber); color: #fff; }
.btn-wa { background: var(--wa); color: #fff; }
.btn-dir { background: var(--ink); color: #fff; }
.btn-danger { background: var(--red-soft); color: var(--red); }
.btn-block { width: 100%; }
.btn-sm { min-height: 38px; padding: 6px 12px; font-size: .84rem; border-radius: 10px; }
.btn[disabled] { opacity: .55; }

/* ── Home ───────────────────────────────────────────────────────────── */
.hero {
  background: linear-gradient(160deg, #FFFBEB, var(--amber-soft));
  border: 1px solid #FDE68A; border-radius: var(--radius);
  padding: 16px 14px; margin-bottom: 4px;
}
.hero h1 { margin: 0 0 4px; font-size: 1.25rem; }
.hero .muted { margin-bottom: 12px; }
.search-row { display: flex; gap: 8px; }
.search-input-wrap {
  flex: 1; display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 2px solid var(--line); border-radius: 12px; padding: 0 12px;
}
.search-input-wrap:focus-within { border-color: var(--amber); }
.search-input-wrap input { flex: 1; border: 0; outline: none; min-height: 48px; background: transparent; font-size: 1rem; }
.search-go { min-width: 52px; min-height: 48px; background: var(--ink); color: #fff; border: 0; border-radius: 12px; cursor: pointer; }

.chip-row { display: flex; gap: 8px; overflow-x: auto; padding: 10px 2px 4px; scrollbar-width: none; }
.chip-row::-webkit-scrollbar { display: none; }
.chip {
  flex: none; display: inline-flex; align-items: center; gap: 5px;
  background: var(--card); border: 1.5px solid var(--line); border-radius: 999px;
  padding: 8px 14px; min-height: 40px; font-size: .86rem; font-weight: 600; cursor: pointer; color: var(--ink-2);
}
.chip.active { background: var(--ink); border-color: var(--ink); color: #fff; }
.chip .ic { width: 15px; height: 15px; }

.cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (min-width: 420px) { .cat-grid { grid-template-columns: repeat(4, 1fr); } }
.cat-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 12px 4px 10px; cursor: pointer; text-align: center; min-height: 92px;
}
.cat-item:active { background: var(--amber-soft); }
.cat-ico {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #fff;
}
.cat-ico .ic { width: 24px; height: 24px; }
.cat-name { font-size: .72rem; font-weight: 700; line-height: 1.15; color: var(--ink); }

.h-scroll { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 8px; scrollbar-width: none; }
.h-scroll::-webkit-scrollbar { display: none; }
.mini-card {
  flex: none; width: 200px; background: var(--card); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 12px; cursor: pointer;
}
.mini-card .row { display: flex; gap: 10px; align-items: center; }

.cta-card {
  display: flex; align-items: center; gap: 12px; background: var(--card);
  border: 1.5px dashed var(--amber); border-radius: var(--radius); padding: 14px;
  margin-top: 14px; cursor: pointer;
}
.cta-card.wa { border-color: var(--wa); }

/* ── Result cards ───────────────────────────────────────────────────── */
.card {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 12px; margin-bottom: 12px; box-shadow: var(--shadow); cursor: pointer;
}
.card-top { display: flex; gap: 12px; }
.avatar, .avatar-img {
  width: 64px; height: 64px; border-radius: 14px; object-fit: cover; flex: none; background: var(--bg);
}
.card-info { flex: 1; min-width: 0; }
.card-info h3 { margin: 0 0 2px; font-size: 1.02rem; line-height: 1.25; }
.card-sub { font-size: .8rem; color: var(--ink-2); margin-bottom: 4px; }
.card-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.card-addr { display: flex; gap: 5px; font-size: .8rem; color: var(--ink-2); margin-top: 8px; }
.card-addr .ic { width: 15px; height: 15px; margin-top: 2px; flex: none; }
.actions-row { display: flex; gap: 8px; margin-top: 12px; }
.actions-row .btn { flex: 1; padding: 10px 6px; font-size: .88rem; }
.fav-btn {
  position: absolute; top: 10px; right: 10px; width: 40px; height: 40px;
  border-radius: 50%; border: 0; background: var(--card); box-shadow: var(--shadow);
  display: grid; place-items: center; cursor: pointer; color: var(--ink-3);
}
.fav-btn.on { color: var(--red); }
.fav-btn.on .ic { fill: currentColor; }
.card-wrap { position: relative; }

.result-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.view-toggle { display: flex; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; overflow: hidden; }
.view-toggle button {
  border: 0; background: transparent; min-height: 42px; padding: 8px 14px; font-weight: 700;
  display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--ink-2);
}
.view-toggle button.active { background: var(--ink); color: #fff; }

/* ── Map ───────────────────────────────────────────────────────────── */
.map-box {
  height: calc(100vh - 220px); min-height: 320px; border-radius: var(--radius);
  overflow: hidden; border: 1px solid var(--line); z-index: 1;
}
.map-box.sm { height: 220px; min-height: 220px; }
.pin-dot {
  width: 34px; height: 34px; border-radius: 50% 50% 50% 4px; transform: rotate(45deg);
  display: grid; place-items: center; box-shadow: 0 2px 6px rgba(0,0,0,.3); border: 2px solid #fff;
}
.pin-dot .ic { transform: rotate(-45deg); width: 16px; height: 16px; color: #fff; }
.map-sheet {
  position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 1000;
  background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 12px; cursor: pointer;
}

/* ── Detail ─────────────────────────────────────────────────────────── */
.detail-hero { display: flex; gap: 14px; align-items: flex-start; }
.detail-hero .avatar, .detail-hero .avatar-img { width: 84px; height: 84px; }
.detail-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
.detail-actions .btn { flex-direction: column; gap: 3px; font-size: .72rem; padding: 10px 4px; min-height: 62px; }
.detail-actions .btn .ic { width: 22px; height: 22px; }
.panel {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 14px; margin-bottom: 12px;
}
.panel h4 { margin: 0 0 8px; font-size: .95rem; }
.kv { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: .9rem; }
.kv:last-child { border-bottom: 0; }
.kv .k { width: 92px; flex: none; color: var(--ink-2); font-weight: 600; }
.skill-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.skill-chips .chip { min-height: 32px; padding: 5px 12px; font-size: .78rem; cursor: default; }

.review { padding: 10px 0; border-bottom: 1px solid var(--line); }
.review:last-child { border-bottom: 0; }
.review-head { display: flex; justify-content: space-between; gap: 8px; font-size: .85rem; }
.review-head b { font-size: .9rem; }

/* ── Forms ──────────────────────────────────────────────────────────── */
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-weight: 700; font-size: .88rem; }
.input, .textarea, .select {
  width: 100%; min-height: 50px; border: 2px solid var(--line); border-radius: 12px;
  padding: 12px; background: var(--card); font-size: 1rem; outline: none;
}
.input:focus, .textarea:focus, .select:focus { border-color: var(--amber); }
.textarea { min-height: 90px; resize: vertical; }
.hint { font-size: .78rem; color: var(--ink-3); }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.steps { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; }
.step-dot {
  flex: 1; height: 6px; border-radius: 999px; background: var(--line);
}
.step-dot.on { background: var(--amber); }
.step-label { font-size: .8rem; font-weight: 700; color: var(--ink-2); margin-bottom: 12px; }

.star-input { display: flex; gap: 4px; }
.star-btn {
  border: 0; background: transparent; font-size: 2rem; color: var(--ink-3); cursor: pointer; padding: 0 4px;
}
.star-btn.on { color: var(--amber); }

.switch-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px;
}
.switch {
  position: relative; width: 58px; height: 32px; border-radius: 999px; border: 0;
  background: var(--line); cursor: pointer; transition: background .15s; flex: none;
}
.switch::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 26px; height: 26px;
  background: #fff; border-radius: 50%; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,.3);
}
.switch.on { background: var(--green); }
.switch.on::after { left: 29px; }

.photo-drop {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  border: 2px dashed var(--line); border-radius: var(--radius); padding: 22px; cursor: pointer;
  color: var(--ink-2); text-align: center;
}

/* ── Auth ───────────────────────────────────────────────────────────── */
.auth-box { max-width: 400px; margin: 24px auto; }
.otp-note { background: var(--amber-soft); border: 1px solid #FDE68A; padding: 10px 12px; border-radius: 10px; font-size: .82rem; }

/* ── Dashboard / Admin ──────────────────────────────────────────────── */
.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 720px) { body.wide .stat-grid { grid-template-columns: repeat(4, 1fr); } }
.stat-tile {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px;
}
.stat-tile b { display: block; font-size: 1.6rem; line-height: 1.1; }
.stat-tile span { font-size: .78rem; color: var(--ink-2); font-weight: 600; }

.admin-tabs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 14px; padding-bottom: 2px; }
.admin-row {
  display: flex; align-items: center; gap: 10px; background: var(--card);
  border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 8px; flex-wrap: wrap;
}
.admin-row .grow { flex: 1; min-width: 160px; }
.admin-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: .82rem; }
.bar-row .bar { height: 10px; background: var(--amber); border-radius: 999px; min-width: 4px; }
.bar-row .lab { width: 110px; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.lead-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--line); font-size: .88rem; }
.lead-row:last-child { border-bottom: 0; }

/* ── Modal / Toast ──────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(28,25,23,.5); z-index: 100;
  display: flex; align-items: flex-end; justify-content: center;
}
@media (min-width: 560px) { .modal-backdrop { align-items: center; } }
.modal {
  background: var(--card); width: 100%; max-width: 560px; max-height: 82vh; overflow-y: auto;
  border-radius: 20px 20px 0 0; padding: 18px 16px calc(18px + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 560px) { .modal { border-radius: 20px; margin: 16px; } }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.modal-head h3 { margin: 0; }
.city-list { display: flex; flex-direction: column; gap: 6px; }
.city-item {
  display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 10px 12px;
  background: var(--bg); border: 1px solid var(--line); border-radius: 12px; cursor: pointer; font-weight: 600;
}

#toast-root { position: fixed; bottom: calc(var(--nav-h) + 14px); left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 200; pointer-events: none; }
.toast {
  background: var(--ink); color: #fff; padding: 11px 18px; border-radius: 999px;
  font-size: .88rem; font-weight: 600; box-shadow: var(--shadow); max-width: 90%;
  animation: toast-in .2s ease-out;
}
@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } }

.empty-state { text-align: center; padding: 40px 20px; color: var(--ink-2); }
.empty-state .ic { width: 48px; height: 48px; color: var(--ink-3); margin-bottom: 10px; }

.skeleton { background: linear-gradient(90deg, var(--line) 25%, #f5f5f4 50%, var(--line) 75%); background-size: 200% 100%; animation: sk 1.2s infinite; border-radius: var(--radius); }
@keyframes sk { to { background-position: -200% 0; } }
.sk-card { height: 128px; margin-bottom: 12px; }
````

## 📄 `web/js/i18n.js`

````javascript
/**
 * i18n.js — Bilingual UI dictionary (English + हिंदी).
 * Every user-facing string in the app comes from here. t(key) falls back to English.
 */
const I18N = {
  en: {
    // nav & shell
    nav_home: 'Home', nav_search: 'Search', nav_fav: 'Saved', nav_account: 'Account',
    tagline: 'Find trusted workers near you',
    search_ph: 'Try "electrician near me"…', popular: 'Popular searches', recent: 'Recent searches',
    clear: 'Clear', categories: 'All categories', top_rated: 'Top rated near you', see_all: 'See all',
    change: 'Change', use_gps: 'Use my GPS location', share_app: 'Share this app', install_app: 'Install App',
    // common actions
    call: 'Call', whatsapp: 'WhatsApp', directions: 'Directions', share: 'Share', save: 'Save', saved: 'Saved',
    open_now: 'Open now', closed_now: 'Closed', verified: 'Verified', reviews: 'reviews', review: 'Review',
    about: 'About', skills: 'Services', price_hint: 'Charges', address_l: 'Address', hours: 'Working hours',
    distance: 'away', loading: 'Loading…', retry: 'Try again', offline_banner: 'You are offline — showing saved data',
    login: 'Login', logout: 'Logout', phone: 'Mobile number', name_l: 'Your name', city: 'City',
    select_city: 'Select your city', my_location: 'My current location', error_gen: 'Something went wrong',
    write_review: 'Write a review', report: 'Report this listing', report_sent: 'Report sent. Thank you.',
    submit: 'Submit', next: 'Next', back: 'Back', edit: 'Edit', delete: 'Delete', done: 'Done',
    // search
    results_for: 'Results', sort_by: 'Sort', s_dist: 'Nearest', s_best: 'Best match', s_rating: 'Top rated', s_reviews: 'Most reviewed',
    filters: 'Filters', f_open: 'Open now', f_rating: '4★ & above', no_results: 'No providers found here yet',
    no_results_hint: 'Widen the radius, change city, or invite workers to join — this app grows with its community.',
    map_view: 'Map', list_view: 'List', results_count: 'workers found',
    // auth
    login_title: 'Login / Sign up', login_sub: 'One OTP — no password to remember',
    phone_ph: '10-digit mobile number', name_ph: 'Name (optional)', otp_ph: 'Enter OTP',
    otp_sent: 'OTP sent (demo: 123456)', verify: 'Verify & Login', google_login: 'Continue with Google (demo)',
    demo_note: 'Demo mode: no real SMS is sent. Use OTP 123456.',
    // provider registration
    reg_title: 'List your services — FREE', reg_sub: 'Get customers from your area. Takes 3 minutes.',
    step: 'Step', r1_t: 'Your details', r2_t: 'Address & location', r3_t: 'Photos & ID proof',
    business_name: 'Business / shop name (optional)', category: 'Service category', subcategory: 'Specialisation',
    whatsapp_l: 'WhatsApp number', address_l2: 'Shop / work address', area: 'Area / locality', pincode: 'PIN code',
    pick_map: 'Pin location on map', use_my_loc: 'Use my GPS', photo_l: 'Profile / shop photo',
    photo_hint: 'A clear photo builds trust (optional)', about_ph: 'Tell customers about your work and experience…',
    skills_ph: 'Services you offer (comma separated)', price_ph: 'e.g. ₹250 visit charge',
    kyc_name: 'Name on ID proof (Aadhaar/Voter ID)', kyc_hint: 'ID card photo is verified by admin — your number is shown to customers, ID is not.',
    open_time: 'Opens at', close_time: 'Closes at', submit_reg: 'Submit for verification',
    reg_success: 'Application submitted! ✅', reg_success_hint: 'Admin verification usually takes 24–48 hours. You will get a push/SMS when your listing goes live.',
    go_dash: 'Go to my dashboard',
    // provider dashboard
    dash_title: 'My dashboard', status: 'Listing status', pending_msg: 'Waiting for admin verification',
    verified_msg: 'Your listing is LIVE in search results', rejected_msg: 'Rejected — please edit and resubmit',
    toggle_open: 'I am OPEN for work now', toggle_closed: 'I am CLOSED right now',
    leads_title: 'Customer contacts (leads)', no_leads: 'No leads yet — share your listing to get calls!',
    lead_call: 'Phone call', lead_wa: 'WhatsApp', lead_dir: 'Asked directions', edit_profile: 'Edit profile',
    // admin
    admin_title: 'Admin panel', a_overview: 'Overview', a_providers: 'Providers', a_categories: 'Categories', a_reports: 'Reports',
    st_providers: 'Total providers', st_pending: 'Pending approval', st_users: 'Users', st_searches: 'Searches',
    st_leads: 'Leads', st_reviews: 'Reviews', st_today: 'searches today', by_city: 'Providers by city', by_cat: 'By category',
    add_provider: '+ Add provider (manual)', bulk_csv: 'Bulk upload CSV', bulk_hint: 'CSV columns: name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about',
    approve: 'Approve', reject: 'Reject', p_pending: 'Pending', p_verified: 'Verified', p_rejected: 'Rejected', p_all: 'All',
    search_prov: 'Search name/phone/city…', name_en: 'Name (English)', name_hi: 'Name (Hindi)', icon_l: 'Icon',
    add_cat: '+ Add category', active_l: 'Active', resolve: 'Mark resolved', no_reports: 'No open reports',
    recent_searches_admin: 'Recent searches', manual_added: 'Manual add — instantly live', confirm_del: 'Delete this listing?',
    // account
    fav_empty: 'No saved providers yet', fav_empty_hint: 'Tap the heart on any provider to save them here.',
    become_provider: 'Are you a worker? List your services', provider_dash: 'Provider dashboard', admin_panel: 'Admin panel',
    login_first: 'Login first', my_account: 'My account',
    // rating
    rate_prompt: 'How was the service?', your_review: 'Your experience (Hindi/English)…', thanks_review: 'Review submitted — shukriya!',
    save_changes: 'Save changes', saved_ok: 'Saved ✓', remove_photo: 'Remove photo', edit_title: 'Edit my listing',
    dl_template: 'Download CSV template', export_csv: 'Export CSV',
    rate_after_lead: 'You contacted recently — how was it? Share your experience ⭐',
  },
  hi: {
    nav_home: 'होम', nav_search: 'खोजें', nav_fav: 'सेव', nav_account: 'खाता',
    tagline: 'अपने पास के भरोसेमंद कामगार खोजें',
    search_ph: '"पास में इलेक्ट्रीशियन" खोजें…', popular: 'लोकप्रिय खोज', recent: 'हाल की खोज',
    clear: 'हटाएं', categories: 'सभी श्रेणियाँ', top_rated: 'आपके पास टॉप रेटेड', see_all: 'सभी देखें',
    change: 'बदलें', use_gps: 'मेरी लोकेशन उपयोग करें', share_app: 'ऐप शेयर करें', install_app: 'ऐप इंस्टॉल करें',
    call: 'कॉल', whatsapp: 'व्हाट्सएप', directions: 'रास्ता', share: 'शेयर', save: 'सेव', saved: 'सेव किया',
    open_now: 'अभी खुला', closed_now: 'अभी बंद', verified: 'सत्यापित', reviews: 'समीक्षाएं', review: 'समीक्षा',
    about: 'परिचय', skills: 'सेवाएं', price_hint: 'शुल्क', address_l: 'पता', hours: 'काम के समय',
    distance: 'दूर', loading: 'लोड हो रहा है…', retry: 'फिर कोशिश करें', offline_banner: 'आप ऑफलाइन हैं — पुराना डेटा दिख रहा है',
    login: 'लॉगिन', logout: 'लॉगआउट', phone: 'मोबाइल नंबर', name_l: 'आपका नाम', city: 'शहर',
    select_city: 'अपना शहर चुनें', my_location: 'मेरी वर्तमान लोकेशन', error_gen: 'कुछ गड़बड़ हुई',
    write_review: 'समीक्षा लिखें', report: 'इस लिस्टिंग की रिपोर्ट करें', report_sent: 'रिपोर्ट भेज दी गई। धन्यवाद।',
    submit: 'जमा करें', next: 'आगे', back: 'पीछे', edit: 'बदलें', delete: 'हटाएं', done: 'हो गया',
    results_for: 'नतीजे', sort_by: 'क्रम', s_dist: 'सबसे पास', s_best: 'सर्वोत्तम', s_rating: 'टॉप रेटेड', s_reviews: 'ज्यादा समीक्षा',
    filters: 'फिल्टर', f_open: 'अभी खुला', f_rating: '4★ और ऊपर', no_results: 'यहाँ अभी कोई कामगार नहीं मिला',
    no_results_hint: 'दायरा बढ़ाएं, शहर बदलें, या कामगारों को जुड़ने के लिए कहें — यह ऐप समुदाय के साथ बढ़ता है।',
    map_view: 'नक्शा', list_view: 'सूची', results_count: 'कामगार मिले',
    login_title: 'लॉगिन / साइन अप', login_sub: 'सिर्फ OTP — पासवर्ड याद रखने की जरूरत नहीं',
    phone_ph: '10 अंकों का मोबाइल नंबर', name_ph: 'नाम (वैकल्पिक)', otp_ph: 'OTP डालें',
    otp_sent: 'OTP भेजा (डेमो: 123456)', verify: 'जाँचें और लॉगिन करें', google_login: 'Google से जारी रखें (डेमो)',
    demo_note: 'डेमो मोड: असली SMS नहीं जाता। OTP 123456 उपयोग करें।',
    reg_title: 'अपनी सेवा लिस्ट करें — मुफ्त', reg_sub: 'अपने इलाके से ग्राहक पाएं। सिर्फ 3 मिनट।',
    step: 'चरण', r1_t: 'आपकी जानकारी', r2_t: 'पता और लोकेशन', r3_t: 'फोटो और ID प्रमाण',
    business_name: 'दुकान / व्यवसाय का नाम (वैकल्पिक)', category: 'सेवा श्रेणी', subcategory: 'विशेषज्ञता',
    whatsapp_l: 'व्हाट्सएप नंबर', address_l2: 'दुकान / काम का पता', area: 'इलाका / मोहल्ला', pincode: 'पिन कोड',
    pick_map: 'नक्शे पर जगह चुनें', use_my_loc: 'GPS उपयोग करें', photo_l: 'प्रोफाइल / दुकान की फोटो',
    photo_hint: 'साफ फोटो से भरोसा बढ़ता है (वैकल्पिक)', about_ph: 'अपने काम और अनुभव के बारे में बताएं…',
    skills_ph: 'आपकी सेवाएं (कॉमा से अलग करें)', price_ph: 'जैसे ₹250 विजिट शुल्क',
    kyc_name: 'ID प्रमाण पर नाम (आधार/वोटर ID)', kyc_hint: 'ID कार्ड एडमिन जाँचता है — ग्राहकों को आपका नंबर दिखता है, ID नहीं।',
    open_time: 'खुलने का समय', close_time: 'बंद होने का समय', submit_reg: 'सत्यापन के लिए भेजें',
    reg_success: 'आवेदन जमा हो गया! ✅', reg_success_hint: 'एडमिन सत्यापन में आमतौर पर 24–48 घंटे लगते हैं। लिस्टिंग लाइव होते ही आपको सूचना मिलेगी।',
    go_dash: 'मेरा डैशबोर्ड',
    dash_title: 'मेरा डैशबोर्ड', status: 'लिस्टिंग स्थिति', pending_msg: 'एडमिन सत्यापन की प्रतीक्षा है',
    verified_msg: 'आपकी लिस्टिंग खोज में LIVE है', rejected_msg: 'अस्वीकृत — बदलकर फिर भेजें',
    toggle_open: 'मैं अभी काम के लिए खुला हूँ', toggle_closed: 'मैं अभी बंद हूँ',
    leads_title: 'ग्राहक संपर्क (लीड्स)', no_leads: 'अभी कोई लीड नहीं — लिस्टिंग शेयर करें!',
    lead_call: 'फोन कॉल', lead_wa: 'व्हाट्सएप', lead_dir: 'रास्ता पूछा', edit_profile: 'प्रोफाइल बदलें',
    admin_title: 'एडमिन पैनल', a_overview: 'सारांश', a_providers: 'कामगार', a_categories: 'श्रेणियां', a_reports: 'रिपोर्ट',
    st_providers: 'कुल कामगार', st_pending: 'स्वीकृति बाकी', st_users: 'उपयोगकर्ता', st_searches: 'खोज',
    st_leads: 'लीड्स', st_reviews: 'समीक्षाएं', st_today: 'आज की खोज', by_city: 'शहर के अनुसार', by_cat: 'श्रेणी के अनुसार',
    add_provider: '+ कामगार जोड़ें (मैनुअल)', bulk_csv: 'बल्क CSV अपलोड', bulk_hint: 'CSV कॉलम: name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about',
    approve: 'स्वीकार', reject: 'अस्वीकार', p_pending: 'बाकी', p_verified: 'सत्यापित', p_rejected: 'अस्वीकृत', p_all: 'सभी',
    search_prov: 'नाम/नंबर/शहर खोजें…', name_en: 'नाम (अंग्रेज़ी)', name_hi: 'नाम (हिंदी)', icon_l: 'आइकन',
    add_cat: '+ श्रेणी जोड़ें', active_l: 'सक्रिय', resolve: 'हल किया', no_reports: 'कोई खुली रिपोर्ट नहीं',
    recent_searches_admin: 'हाल की खोज', manual_added: 'मैनुअल — तुरंत लाइव', confirm_del: 'यह लिस्टिंग हटाएं?',
    fav_empty: 'अभी कोई सेव किया कामगार नहीं', fav_empty_hint: 'किसी भी कामगार पर ❤️ दबाकर यहाँ सेव करें।',
    become_provider: 'क्या आप कामगार हैं? अपनी सेवा लिस्ट करें', provider_dash: 'कामगार डैशबोर्ड', admin_panel: 'एडमिन पैनल',
    login_first: 'पहले लॉगिन करें', my_account: 'मेरा खाता',
    rate_prompt: 'सेवा कैसी रही?', your_review: 'आपका अनुभव (हिंदी/अंग्रेज़ी)…', thanks_review: 'समीक्षा जमा हुई — शुक्रिया!',
    save_changes: 'बदलाव सेव करें', saved_ok: 'सेव हो गया ✓', remove_photo: 'फोटो हटाएं', edit_title: 'मेरी लिस्टिंग बदलें',
    dl_template: 'CSV टेम्पलेट डाउनलोड', export_csv: 'CSV एक्सपोर्ट',
    rate_after_lead: 'आपने हाल में संपर्क किया — कैसा रहा? अनुभव साझा करें ⭐',
  },
};

let LANG = localStorage.getItem('lnm_lang') || 'en';

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

function setLang(l) {
  LANG = l;
  localStorage.setItem('lnm_lang', l);
  document.documentElement.lang = l === 'hi' ? 'hi-IN' : 'en-IN';
}

/** Localised label from a {name_en, name_hi} style object or two fields. */
function locName(en, hi) {
  return LANG === 'hi' && hi ? hi : en;
}
````

## 📄 `web/js/api.js`

````javascript
/**
 * api.js — Tiny REST client + shared UI utilities (avatar, stars, tel/WhatsApp helpers).
 * All URLs are RELATIVE — the same host serves API and app (proxy/preview-safe).
 */
const API = {
  get token() { return localStorage.getItem('lnm_token') || ''; },
  set token(v) { v ? localStorage.setItem('lnm_token', v) : localStorage.removeItem('lnm_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('lnm_user') || 'null'); } catch { return null; }
  },
  set user(v) { v ? localStorage.setItem('lnm_user', JSON.stringify(v)) : localStorage.removeItem('lnm_user'); },

  async req(method, path, body) {
    const res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { this.token = ''; this.user = null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { data, status: res.status });
    return data;
  },
  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b); },
  put(p, b) { return this.req('PUT', p, b); },
  del(p) { return this.req('DELETE', p); },
};

/* ─────────────────────── UI utilities ─────────────────────── */

/** Low-bandwidth avatar: SVG monogram with category colour (no image download). */
const CAT_COLORS = {
  electrician: '#F59E0B', engineer: '#0EA5E9', tailor: '#EC4899', 'dry-cleaner': '#8B5CF6',
  'raj-mistri': '#B45309', 'bhandara-catering': '#DC2626', plumber: '#2563EB', carpenter: '#92400E',
  painter: '#7C3AED', 'safai-karamchari': '#059669', 'ac-fridge-repair': '#0891B2', driver: '#4F46E5',
  'mobile-repair': '#E11D48', beautician: '#DB2777', cook: '#EA580C', mali: '#16A34A',
};

function avatarSvg(name, categoryId, photo) {
  if (photo) return `<img class="avatar-img" src="${photo}" alt="" loading="lazy">`;
  const color = CAT_COLORS[categoryId] || '#F59E0B';
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="16" fill="${color}22"/><rect width="96" height="96" rx="16" fill="${color}" opacity="0.14"/><text x="48" y="58" font-family="system-ui,sans-serif" font-size="34" font-weight="700" fill="${color}" text-anchor="middle">${initials}</text></svg>`;
  return `<img class="avatar-img" src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" alt="">`;
}

function stars(avg, count) {
  const full = Math.round(avg || 0);
  const s = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  return `<span class="stars" title="${avg}">★<b>${(avg || 0).toFixed(1)}</b> <i>(${count || 0} ${t('reviews')})</i></span>`;
}

function icon(name, cls = 'ic') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Contact helpers — always log a lead, then open the native app. */
function contactLink(provider, type, origin) {
  const text = encodeURIComponent(`Namaste! I found you on Labors Near Me (${provider.businessName || provider.name}).`);
  if (type === 'call') return `tel:+91${provider.phone}`;
  if (type === 'whatsapp') return `https://wa.me/91${provider.whatsapp || provider.phone}?text=${text}`;
  if (type === 'directions') {
    const { lat, lng } = provider.location || {};
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return '#';
}

function logLead(providerId, type) {
  if (API.user) {
    API.post('/leads', { providerId, type }).catch(() => {});
    try { // remember contact for the "rate after lead" prompt (local, private)
      const led = JSON.parse(localStorage.getItem('lnm_ledger') || '{}');
      led[providerId] = Date.now();
      localStorage.setItem('lnm_ledger', JSON.stringify(led));
    } catch (e) {}
  }
}

/** Star-rating input row (used in review + admin forms). */
function starInput(name = 'rating') {
  return `<div class="star-input" data-star-input="${name}">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-btn" data-val="${n}">★</button>`).join('')}
  </div>`;
}

/** Format relative time for leads/reviews. */
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return Math.max(1, Math.round(d / 60)) + 'm';
  if (d < 86400) return Math.round(d / 3600) + 'h';
  return Math.round(d / 86400) + 'd';
}
````

## 📄 `web/js/localapi.js`

````javascript
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
````

## 📄 `web/js/app.js`

````javascript
/**
 * app.js — Labors Near Me SPA (vanilla JS, no build step — tiny payload for 2G/3G).
 * Hash router + views: Home, Search (list/map), Provider Detail, Auth, Favorites,
 * Account, Provider Registration (3 steps), Provider Dashboard, Admin Panel.
 */
'use strict';

/* ═══════════════ STATE ═══════════════ */
const S = {
  cats: [], cities: [],
  cityId: localStorage.getItem('lnm_city') || 'indore',
  origin: null,                 // {lat, lng, label}
  gps: false,
  favorites: new Set(),
  recent: JSON.parse(localStorage.getItem('lnm_recent') || '[]'),
  search: { q: '', category: '', openNow: false, minRating: 0, sort: 'distance', view: 'list' },
  lastResults: [],
  regDraft: {},
  regStep: 1,
  adminTab: 'overview',
  deferredInstall: null,
  map: null, mapSheetProvider: null,
};

/* ═══════════════ BOOT ═══════════════ */
(async function boot() {
  setLang(localStorage.getItem('lnm_lang') || 'en');
  applyStaticI18n();
  bindShell();
  try {
    const [cats, cities] = await Promise.all([API.get('/categories'), API.get('/cities')]);
    S.cats = cats; S.cities = cities;
  } catch (e) { console.error('meta load failed', e); }
  if (API.user) refreshFavorites();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.deferredInstall = e; });
  window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
  updateOnline();
})();

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.getElementById('lang-btn').textContent = LANG === 'hi' ? 'EN' : 'हि';
  document.getElementById('offline-text').textContent = t('offline_banner');
  updateCityLabel();
}

function bindShell() {
  document.getElementById('lang-btn').onclick = () => {
    setLang(LANG === 'hi' ? 'en' : 'hi');
    applyStaticI18n(); route(true);
  };
  document.getElementById('city-btn').onclick = openCityModal;
  document.addEventListener('click', onGlobalClick);
}

function updateCityLabel() {
  const c = S.cities.find((x) => x.id === S.cityId);
  document.getElementById('city-label').textContent = S.gps ? '📍 ' + t('my_location')
    : c ? locName(c.name_en, c.name_hi) : S.cityId;
}

function updateOnline() {
  document.getElementById('offline-banner').hidden = navigator.onLine;
}

/* ═══════════════ HELPERS ═══════════════ */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function modal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal">${html}</div></div>`;
  root.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', (e) => {
    if (e.target === b) closeModal();
  }));
  root.querySelectorAll('[data-close-x]').forEach((b) => b.addEventListener('click', closeModal));
  return root;
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

async function refreshFavorites() {
  if (!API.user) { S.favorites = new Set(); return; }
  try {
    const favs = await API.get('/favorites');
    S.favorites = new Set(favs.map((f) => f.id));
  } catch (e) { /* offline */ }
}

function needLogin(then) {
  if (API.user) { then && then(); return true; }
  toast(t('login_first'));
  location.hash = '#/login';
  return false;
}

/** Current search origin — GPS when granted, else city centre. */
function currentOrigin() {
  if (S.gps && S.origin) return S.origin;
  const c = S.cities.find((x) => x.id === S.cityId) || { lat: 22.72, lng: 75.86 };
  return { lat: c.lat, lng: c.lng, label: 'city' };
}
function originQS() {
  const o = currentOrigin();
  return `lat=${o.lat}&lng=${o.lng}&cityId=${S.cityId}`;
}

function useGpsLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        S.gps = true;
        S.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'gps' };
        // snap city label to nearest seeded city for locality context
        let best = null, bd = 1e12;
        S.cities.forEach((c) => {
          const d = (c.lat - S.origin.lat) ** 2 + (c.lng - S.origin.lng) ** 2;
          if (d < bd) { bd = d; best = c; }
        });
        if (best && bd < 0.5) { S.cityId = best.id; localStorage.setItem('lnm_city', best.id); }
        updateCityLabel();
        resolve(true);
      },
      () => { toast(t('select_city')); resolve(false); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

function openCityModal() {
  const rows = S.cities.map((c) => `
    <button class="city-item" data-city="${c.id}">
      ${icon('pin')} ${esc(locName(c.name_en, c.name_hi))} <span class="tiny">${esc(c.state)}</span>
    </button>`).join('');
  modal(`
    <div class="modal-head"><h3>${t('select_city')}</h3><button class="btn btn-ghost btn-sm" data-close-x>${icon('x')}</button></div>
    <div class="form" style="margin-bottom:12px">
      <button class="btn btn-dark btn-block" id="modal-gps">${icon('nav')} ${t('use_gps')}</button>
    </div>
    <div class="city-list">${rows}</div>
  `);
  document.getElementById('modal-gps').onclick = async () => {
    closeModal();
    const ok = await useGpsLocation();
    if (ok) { toast('📍 GPS ✓'); route(true); }
  };
  document.querySelectorAll('[data-city]').forEach((b) => b.addEventListener('click', () => {
    S.cityId = b.dataset.city; S.gps = false;
    localStorage.setItem('lnm_city', S.cityId);
    updateCityLabel(); closeModal(); route(true);
  }));
}

/** Global delegated actions (call/whatsapp/directions/fav/share). */
function onGlobalClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const pid = el.dataset.pid;
  const prov = S.lastResults.find((p) => p.id === pid) || (S.detailCache && S.detailCache.id === pid ? S.detailCache : null);

  if (['call', 'whatsapp', 'directions'].includes(act)) {
    e.preventDefault(); e.stopPropagation();
    if (!prov) return;
    logLead(pid, act);
    window.open(contactLink(prov, act), act === 'directions' ? '_blank' : '_self');
    return;
  }
  if (act === 'fav') {
    e.preventDefault(); e.stopPropagation();
    if (!needLogin()) return;
    const on = S.favorites.has(pid);
    (on ? API.del('/favorites/' + pid) : API.post('/favorites/' + pid))
      .then(() => {
        on ? S.favorites.delete(pid) : S.favorites.add(pid);
        el.classList.toggle('on', !on);
        toast(!on ? t('saved') : '❤️ –');
      }).catch(() => toast(t('error_gen')));
    return;
  }
  if (act === 'share') {
    e.preventDefault();
    shareAppOrProvider(prov);
    return;
  }
  if (act === 'report') {
    e.preventDefault();
    if (!needLogin()) return;
    API.post('/reports', { providerId: pid, reason: 'User report from app' })
      .then(() => toast(t('report_sent'))).catch(() => toast(t('error_gen')));
  }
}

function shareAppOrProvider(prov) {
  const url = prov ? location.origin + '/#/p/' + prov.id : location.origin;
  const text = prov
    ? `${prov.businessName || prov.name} — ${prov.categoryNameEn || ''}. Labors Near Me par dekhein: ${url}`
    : `Labors Near Me — apne nazdeeki mazdoor/karigar dhoondein! Electrician, tailor, raj mistri, plumber... sab ek app me. ${url}`;
  if (navigator.share) {
    navigator.share({ title: 'Labors Near Me', text, url }).catch(() => {});
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
}

/** Big result card used in search + favorites. */
function resultCard(p) {
  const fav = S.favorites.has(p.id);
  const dist = p.distanceText ? `<span class="badge dist-badge">${icon('nav')}${esc(p.distanceText)}</span>` : '';
  return `
  <div class="card-wrap">
    <div class="card" onclick="location.hash='#/p/${p.id}'">
      <div class="card-top">
        ${avatarSvg(p.businessName || p.name, p.categoryId, p.photo)}
        <div class="card-info">
          <h3>${esc(p.businessName || p.name)}</h3>
          <div class="card-sub">${esc(locName(p.categoryNameEn || p.categoryId, p.categoryNameHi))} · ${esc(p.name)}</div>
          ${stars(p.ratingAvg, p.ratingCount)}
          <div class="card-badges">
            <span class="badge ${p.isOpenNow ? 'badge-open' : 'badge-closed'}">${p.isOpenNow ? '● ' + t('open_now') : '● ' + t('closed_now')}</span>
            ${p.verified === 'verified' ? `<span class="badge badge-verified">${icon('shield')}${t('verified')}</span>` : ''}
            ${dist}
          </div>
        </div>
      </div>
      <div class="card-addr">${icon('pin')}<span>${esc(p.address.line1 || (p.address.area + ', ' + p.address.city))}</span></div>
      <div class="actions-row">
        <a class="btn btn-call" href="#" data-act="call" data-pid="${p.id}">${icon('phone')}${t('call')}</a>
        <a class="btn btn-wa" href="#" data-act="whatsapp" data-pid="${p.id}">${icon('whatsapp')}${t('whatsapp')}</a>
      </div>
    </div>
    <button class="fav-btn ${fav ? 'on' : ''}" data-act="fav" data-pid="${p.id}" aria-label="save">${icon('heart')}</button>
  </div>`;
}

function skeletons(n = 3) {
  return Array.from({ length: n }, () => '<div class="skeleton sk-card"></div>').join('');
}

/* ═══════════════ ROUTER ═══════════════ */
function route(soft) {
  const hash = location.hash || '#/';
  const [path, qs] = hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  const query = new URLSearchParams(qs || '');
  document.body.classList.toggle('wide', parts[0] === 'admin');
  destroyMap();

  const view = document.getElementById('view');
  const navMap = { '': 'home', search: 'search', favorites: 'fav', account: 'account' };
  document.querySelectorAll('.nav-item').forEach((a) =>
    a.classList.toggle('active', a.dataset.nav === (navMap[parts[0] || ''] || (parts[0] === 'p' ? 'search' : ''))));

  if (!parts.length) return viewHome(view);
  switch (parts[0]) {
    case 'search': return viewSearch(view, query);
    case 'p': return viewDetail(view, parts[1], query);
    case 'edit': return viewEdit(view, parts[1]);
    case 'login': return viewLogin(view);
    case 'favorites': return viewFavorites(view);
    case 'account': return viewAccount(view);
    case 'register': return viewRegister(view);
    case 'dashboard': return viewDashboard(view);
    case 'admin': return viewAdmin(view, parts[1]);
    default: return viewHome(view);
  }
  if (!soft) window.scrollTo(0, 0);
}

function destroyMap() {
  if (S.map) { try { S.map.remove(); } catch (e) {} S.map = null; }
}

/* ═══════════════ HOME ═══════════════ */
async function viewHome(view) {
  const catGrid = S.cats.map((c) => `
    <a class="cat-item" href="#/search?cat=${c.id}">
      <span class="cat-ico" style="background:${CAT_COLORS[c.id] || '#F59E0B'}">${icon(c.icon || 'wrench')}</span>
      <span class="cat-name">${esc(locName(c.name_en, c.name_hi))}</span>
    </a>`).join('');

  const recentChips = S.recent.slice(0, 6).map((q) => `<button class="chip" data-q="${esc(q)}">${icon('clock')}${esc(q)}</button>`).join('');

  view.innerHTML = `
    <div class="hero">
      <h1>${t('tagline')} 👷</h1>
      <div class="muted">⚡ ${esc(locName('Electricians · Tailors · Masons · Plumbers & more', 'इलेक्ट्रीशियन · दर्जी · मिस्त्री · प्लंबर और अन्य'))}</div>
      <form class="search-row" id="home-search">
        <div class="search-input-wrap">${icon('search')}
          <input id="home-q" placeholder="${t('search_ph')}" autocomplete="off" enterkeyhint="search" list="h-sugs">
        </div>
        <button class="search-go" type="submit" aria-label="search">${icon('search')}</button>
      </form>
      <datalist id="h-sugs">${S.cats.map((c) => `<option value="${esc(locName(c.name_en, c.name_hi))}">`).join('')}</datalist>
      ${S.recent.length ? `<div class="section-title" style="margin:12px 2px 0;font-size:.85rem">${t('recent')} <span class="link" id="clear-recent">${t('clear')}</span></div><div class="chip-row">${recentChips}</div>` : ''}
      <div class="chip-row" id="popular-row"></div>
    </div>

    <div class="section-title">${t('categories')}</div>
    <div class="cat-grid">${catGrid}</div>

    <div class="section-title">${t('top_rated')} <a class="link" href="#/search">${t('see_all')}</a></div>
    <div class="h-scroll" id="top-rated">${skeletons(1)}</div>

    <a class="cta-card" href="#/register">
      <span class="cat-ico" style="background:var(--amber);width:44px;height:44px">${icon('plus')}</span>
      <div><b>${t('become_provider')}</b><div class="tiny">${t('reg_sub')}</div></div>
      ${icon('chevron')}
    </a>
    <div class="cta-card wa" id="share-cta">
      <span class="cat-ico" style="background:var(--wa);width:44px;height:44px">${icon('whatsapp')}</span>
      <div><b>${t('share_app')}</b><div class="tiny">WhatsApp/Facebook par bhejein — bilkul free</div></div>
      ${icon('share')}
    </div>
    ${S.deferredInstall ? `<button class="btn btn-dark btn-block" id="install-cta" style="margin-top:12px">${t('install_app')} 📲</button>` : ''}
  `;

  // popular chips
  API.get('/searches/popular').then((qs) => {
    const row = document.getElementById('popular-row');
    if (row) row.innerHTML = qs.map((q) => `<button class="chip" data-q="${esc(q)}">${icon('search')}${esc(q)}</button>`).join('');
  }).catch(() => {});

  // top rated strip
  API.get(`/providers/nearby?sort=rating&limit=6&${originQS()}`).then((d) => {
    const strip = document.getElementById('top-rated');
    if (!strip) return;
    S.lastResults = d.results.concat(S.lastResults);
    strip.innerHTML = d.results.map((p) => `
      <div class="mini-card" onclick="location.hash='#/p/${p.id}'">
        <div class="row">${avatarSvg(p.businessName, p.categoryId, p.photo)}
          <div style="min-width:0">
            <b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.businessName)}</b>
            <span class="tiny">${esc(locName(p.categoryNameEn, p.categoryNameHi))}</span><br>
            ${stars(p.ratingAvg, p.ratingCount)}
          </div>
        </div>
        <div class="card-badges">${p.distanceText ? `<span class="badge dist-badge">${p.distanceText}</span>` : ''}
        <span class="badge ${p.isOpenNow ? 'badge-open' : 'badge-closed'}">${p.isOpenNow ? t('open_now') : t('closed_now')}</span></div>
      </div>`).join('') || `<div class="muted">${t('no_results')}</div>`;
  }).catch(() => {});

  document.getElementById('home-search').onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('home-q').value.trim();
    pushRecent(q);
    location.hash = '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
  };
  view.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    pushRecent(b.dataset.q);
    location.hash = '#/search?q=' + encodeURIComponent(b.dataset.q);
  }));
  const clr = document.getElementById('clear-recent');
  if (clr) clr.onclick = () => { S.recent = []; localStorage.setItem('lnm_recent', '[]'); route(true); };
  const shareCta = document.getElementById('share-cta');
  if (shareCta) shareCta.onclick = () => shareAppOrProvider(null);
  const inst = document.getElementById('install-cta');
  if (inst) inst.onclick = () => { S.deferredInstall.prompt(); };
  window.scrollTo(0, 0);
}

function pushRecent(q) {
  if (!q) return;
  S.recent = [q, ...S.recent.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 10);
  localStorage.setItem('lnm_recent', JSON.stringify(S.recent));
  API.post('/searches', { q, cityId: S.cityId, userId: API.user ? API.user.id : null }).catch(() => {});
}

/* ═══════════════ SEARCH (list + map) ═══════════════ */
async function viewSearch(view, query) {
  if (query.get('q') != null) S.search.q = query.get('q') || '';
  if (query.get('cat')) S.search.category = query.get('cat');
  const s = S.search;

  const catOpts = S.cats.map((c) =>
    `<option value="${c.id}" ${s.category === c.id ? 'selected' : ''}>${esc(locName(c.name_en, c.name_hi))}</option>`).join('');

  view.innerHTML = `
    <form class="search-row" id="s-form" style="margin-bottom:10px">
      <div class="search-input-wrap">${icon('search')}
        <input id="s-q" value="${esc(s.q)}" placeholder="${t('search_ph')}" autocomplete="off" enterkeyhint="search" list="s-sugs">
      </div>
      <button class="search-go" type="submit">${icon('search')}</button>
    </form>
    <datalist id="s-sugs">${S.cats.map((c) => `<option value="${esc(locName(c.name_en, c.name_hi))}">`).join('')}${S.recent.slice(0, 5).map((q) => `<option value="${esc(q)}">`).join('')}</datalist>
    <div class="chip-row" style="padding-top:0">
      <select class="chip" id="f-cat" style="appearance:auto"><option value="">${t('categories')}</option>${catOpts}</select>
      <button class="chip ${s.openNow ? 'active' : ''}" id="f-open">● ${t('f_open')}</button>
      <button class="chip ${s.minRating ? 'active' : ''}" id="f-rate">${t('f_rating')}</button>
      <select class="chip" id="f-sort" style="appearance:auto">
        <option value="distance" ${s.sort === 'distance' ? 'selected' : ''}>${t('s_dist')}</option>
        <option value="relevance" ${s.sort === 'relevance' ? 'selected' : ''}>${t('s_best')}</option>
        <option value="rating" ${s.sort === 'rating' ? 'selected' : ''}>${t('s_rating')}</option>
        <option value="reviews" ${s.sort === 'reviews' ? 'selected' : ''}>${t('s_reviews')}</option>
      </select>
    </div>
    <div class="result-head">
      <b id="res-count">${t('loading')}</b>
      <div class="view-toggle">
        <button id="v-list" class="${s.view === 'list' ? 'active' : ''}">${icon('list')}${t('list_view')}</button>
        <button id="v-map" class="${s.view === 'map' ? 'active' : ''}">${icon('map')}${t('map_view')}</button>
      </div>
    </div>
    <div id="results">${skeletons(3)}</div>
  `;

  document.getElementById('s-form').onsubmit = (e) => {
    e.preventDefault(); s.q = document.getElementById('s-q').value.trim();
    pushRecent(s.q); runSearch();
  };
  document.getElementById('f-cat').onchange = (e) => { s.category = e.target.value; runSearch(); };
  document.getElementById('f-sort').onchange = (e) => { s.sort = e.target.value; runSearch(); };
  document.getElementById('f-open').onclick = (e) => { s.openNow = !s.openNow; e.currentTarget.classList.toggle('active', s.openNow); runSearch(); };
  document.getElementById('f-rate').onclick = (e) => { s.minRating = s.minRating ? 0 : 4; e.currentTarget.classList.toggle('active', !!s.minRating); runSearch(); };
  document.getElementById('v-list').onclick = () => { s.view = 'list'; route(true); };
  document.getElementById('v-map').onclick = () => { s.view = 'map'; route(true); };

  runSearch();
  window.scrollTo(0, 0);
}

async function runSearch() {
  const s = S.search;
  const box = document.getElementById('results');
  const counter = document.getElementById('res-count');
  if (!box) return;
  const params = new URLSearchParams({ sort: s.sort, limit: '50', ...Object.fromEntries(new URLSearchParams(originQS())) });
  if (s.q) params.set('q', s.q);
  if (s.category) params.set('category', s.category);
  if (s.openNow) params.set('openNow', '1');
  if (s.minRating) params.set('minRating', String(s.minRating));

  try {
    const d = await API.get('/providers/nearby?' + params.toString());
    S.lastResults = d.results;
    counter.textContent = `${d.total} ${t('results_count')}`;
    if (!d.results.length) {
      box.innerHTML = `<div class="empty-state">${icon('search')}<h3>${t('no_results')}</h3><p>${t('no_results_hint')}</p>
        <a class="btn btn-primary" href="#/register">${t('become_provider')}</a></div>`;
      return;
    }
    if (s.view === 'map') renderMapView(box, d.results);
    else box.innerHTML = d.results.map(resultCard).join('');
  } catch (e) {
    box.innerHTML = `<div class="empty-state">${icon('x')}<p>${t('error_gen')}</p><button class="btn btn-ghost" onclick="route(true)">${t('retry')}</button></div>`;
  }
}

function renderMapView(box, results) {
  box.innerHTML = `<div class="map-box" id="map"></div>`;
  const o = currentOrigin();
  const map = L.map('map', { zoomControl: true }).setView([o.lat, o.lng], 12);
  S.map = map;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map);

  const bounds = [[o.lat, o.lng]];
  results.forEach((p) => {
    const color = CAT_COLORS[p.categoryId] || '#F59E0B';
    const pin = L.divIcon({
      className: '',
      html: `<div class="pin-dot" style="background:${color}">${icon(p.categoryIcon || 'wrench')}</div>`,
      iconSize: [34, 34], iconAnchor: [17, 30],
    });
    L.marker([p.location.lat, p.location.lng], { icon: pin }).addTo(map)
      .on('click', () => showMapSheet(p));
    bounds.push([p.location.lat, p.location.lng]);
  });
  map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
}

function showMapSheet(p) {
  const sheet = document.createElement('div');
  sheet.className = 'map-sheet';
  sheet.innerHTML = `
    <div class="card-top" style="align-items:center">
      ${avatarSvg(p.businessName, p.categoryId, p.photo)}
      <div class="card-info">
        <h3 style="margin:0">${esc(p.businessName)}</h3>
        <div class="card-sub">${esc(locName(p.categoryNameEn, p.categoryNameHi))} ${p.distanceText ? '· ' + p.distanceText : ''}</div>
        ${stars(p.ratingAvg, p.ratingCount)}
      </div>
      <button class="btn btn-ghost btn-sm" id="sheet-close">${icon('x')}</button>
    </div>
    <div class="actions-row">
      <a class="btn btn-call" href="#" data-act="call" data-pid="${p.id}">${icon('phone')}${t('call')}</a>
      <a class="btn btn-wa" href="#" data-act="whatsapp" data-pid="${p.id}">${icon('whatsapp')}${t('whatsapp')}</a>
      <button class="btn btn-dark" onclick="location.hash='#/p/${p.id}'">${t('see_all')}</button>
    </div>`;
  document.querySelectorAll('.map-sheet').forEach((x) => x.remove());
  document.getElementById('map').parentElement.appendChild(sheet);
  sheet.querySelector('#sheet-close').onclick = (e) => { e.stopPropagation(); sheet.remove(); };
}

/* ═══════════════ PROVIDER DETAIL ═══════════════ */
async function viewDetail(view, id, query) {
  view.innerHTML = skeletons(3);
  let p;
  const preview = query && query.get('preview') ? '&preview=1' : '';
  try {
    p = await API.get(`/providers/${id}?${originQS()}${preview}`);
  } catch (e) {
    view.innerHTML = `<div class="empty-state">${icon('x')}<p>${t('error_gen')}</p></div>`; return;
  }
  S.detailCache = p;
  S.lastResults = [p, ...S.lastResults.filter((x) => x.id !== p.id)];
  const fav = S.favorites.has(p.id);
  const hours = p.availability && p.availability.hours ? `${p.availability.hours.open} – ${p.availability.hours.close}` : '—';

  view.innerHTML = `
    <div class="panel">
      <div class="detail-hero">
        ${avatarSvg(p.businessName, p.categoryId, p.photo)}
        <div class="card-info">
          <h2 style="margin:0 0 2px;font-size:1.2rem">${esc(p.businessName)}</h2>
          <div class="card-sub">${esc(locName(p.categoryNameEn, p.categoryNameHi))} · ${esc(locName(p.subcategoryNameEn, p.subcategoryNameHi))}</div>
          ${stars(p.ratingAvg, p.ratingCount)}
          <div class="card-badges">
            <span class="badge ${p.isOpenNow ? 'badge-open' : 'badge-closed'}">${p.isOpenNow ? '● ' + t('open_now') : '● ' + t('closed_now')}</span>
            ${p.verified === 'verified' ? `<span class="badge badge-verified">${icon('shield')}${t('verified')}</span>` : ''}
            ${p.distanceText ? `<span class="badge dist-badge">${icon('nav')}${p.distanceText} ${t('distance')}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="detail-actions">
        <a class="btn btn-call" href="#" data-act="call" data-pid="${p.id}">${icon('phone')}${t('call')}</a>
        <a class="btn btn-wa" href="#" data-act="whatsapp" data-pid="${p.id}">${icon('whatsapp')}${t('whatsapp')}</a>
        <a class="btn btn-dir" href="#" data-act="directions" data-pid="${p.id}">${icon('nav')}${t('directions')}</a>
        <button class="btn btn-ghost" data-act="share" data-pid="${p.id}">${icon('share')}${t('share')}</button>
      </div>
      <button class="btn btn-ghost btn-block ${fav ? 'fav-on' : ''}" data-act="fav" data-pid="${p.id}" style="${fav ? 'color:var(--red)' : ''}">
        ${icon('heart')} ${fav ? t('saved') : t('save')}
      </button>
    </div>

    ${p.about ? `<div class="panel"><h4>${t('about')}</h4><div class="muted">${esc(p.about)}</div></div>` : ''}
    ${p.skills && p.skills.length ? `<div class="panel"><h4>${t('skills')}</h4><div class="skill-chips">${p.skills.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>
      ${p.priceHint ? `<div class="kv"><span class="k">${t('price_hint')}</span><span>${esc(p.priceHint)}</span></div>` : ''}</div>` : ''}

    <div class="panel">
      <h4>${t('address_l')}</h4>
      <div class="kv"><span class="k">${icon('pin')}</span><span>${esc(p.address.line1 || '')}${p.address.pincode ? ', ' + esc(p.address.pincode) : ''}</span></div>
      <div class="kv"><span class="k">${icon('phone')}</span><span>+91 ${esc(p.phone)}</span></div>
      <div class="kv"><span class="k">${icon('clock')}</span><span>${t('hours')}: ${hours} ${p.availability.offDays && p.availability.offDays.length ? `(off: ${p.availability.offDays.map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')})` : ''}</span></div>
      <div class="map-box sm" id="detail-map" style="margin-top:10px"></div>
    </div>

    <div class="panel">
      <h4>${t('review')} (${p.ratingCount || 0})</h4>
      <div id="reviews">${t('loading')}</div>
      <div id="review-form"></div>
    </div>

    <button class="btn btn-ghost btn-block btn-sm" data-act="report" data-pid="${p.id}" style="color:var(--ink-3)">${t('report')}</button>
  `;

  // mini map
  try {
    const map = L.map('detail-map', { zoomControl: false, dragging: true })
      .setView([p.location.lat, p.location.lng], 15);
    S.map = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', maxZoom: 19 }).addTo(map);
    const color = CAT_COLORS[p.categoryId] || '#F59E0B';
    L.marker([p.location.lat, p.location.lng], {
      icon: L.divIcon({ className: '', html: `<div class="pin-dot" style="background:${color}">${icon(p.categoryIcon || 'wrench')}</div>`, iconSize: [34, 34], iconAnchor: [17, 30] }),
    }).addTo(map);
    map.on('click', () => window.open(contactLink(p, 'directions'), '_blank'));
  } catch (e) {}

  // reviews
  API.get(`/providers/${p.id}/reviews`).then((rs) => {
    const box = document.getElementById('reviews');
    if (!box) return;
    box.innerHTML = rs.length ? rs.map((r) => `
      <div class="review">
        <div class="review-head"><b>${esc(r.userName)}</b><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></div>
        <div class="tiny">${timeAgo(r.createdAt)} ago</div>
        <div class="muted">${esc(r.text)}</div>
      </div>`).join('') : `<div class="muted">—</div>`;

    const formBox = document.getElementById('review-form');
    if (API.user) {
      let ledger = {};
      try { ledger = JSON.parse(localStorage.getItem('lnm_ledger') || '{}'); } catch (e) {}
      const contacted = !!ledger[p.id]; // rate-after-lead nudge (private, local)
      formBox.innerHTML = `
        <div style="margin-top:12px;border-top:1px dashed var(--line);padding-top:12px">
          ${contacted ? `<div class="otp-note" style="margin-bottom:10px">${t('rate_after_lead')}</div>` : ''}
          <b style="font-size:.9rem">${t('rate_prompt')}</b>
          ${starInput()}
          <textarea class="textarea" id="rev-text" placeholder="${t('your_review')}" style="margin:8px 0"></textarea>
          <button class="btn btn-primary btn-block" id="rev-submit">${t('submit')}</button>
        </div>`;
      bindStarInput(formBox);
      document.getElementById('rev-submit').onclick = () => {
        const rating = Number(formBox.querySelector('[data-star-input]')?.dataset.val || 5);
        API.post(`/providers/${p.id}/reviews`, { rating, text: document.getElementById('rev-text').value })
          .then(() => { toast(t('thanks_review')); viewDetail(view, id, query); })
          .catch((e) => toast(e.data && e.data.error === 'already_reviewed' ? '✓ ' + t('done') : t('error_gen')));
      };
    } else {
      formBox.innerHTML = `<button class="btn btn-ghost btn-block btn-sm" style="margin-top:10px" onclick="location.hash='#/login'">${t('login')} → ${t('write_review')}</button>`;
    }
  }).catch(() => {});
  window.scrollTo(0, 0);
}

function bindStarInput(root) {
  const wrap = root.querySelector('[data-star-input]');
  if (!wrap) return;
  wrap.dataset.val = '5'; // default rating selection
  wrap.querySelectorAll('.star-btn').forEach((btn) => {
    btn.onclick = () => {
      const val = Number(btn.dataset.val);
      wrap.dataset.val = String(val); // remember the chosen rating
      wrap.querySelectorAll('.star-btn').forEach((b) =>
        b.classList.toggle('on', Number(b.dataset.val) <= val));
    };
  });
  wrap.querySelectorAll('.star-btn').forEach((b) => b.classList.add('on'));
}

/* ═══════════════ AUTH ═══════════════ */
function viewLogin(view) {
  view.innerHTML = `
    <div class="auth-box">
      <div class="panel">
        <h2 style="margin:0 0 4px">${t('login_title')}</h2>
        <p class="muted" style="margin:0 0 16px">${t('login_sub')}</p>
        <div class="form">
          <div class="field">
            <label class="label">${t('phone')}</label>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="btn btn-ghost" style="min-height:50px;pointer-events:none">+91</span>
              <input class="input" id="login-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="${t('phone_ph')}">
            </div>
          </div>
          <div id="login-step2" style="display:none">
            <div class="otp-note">🔐 ${t('otp_sent')} · ${t('demo_note')}</div>
            <div class="field" style="margin-top:12px">
              <label class="label">${t('name_l')}</label>
              <input class="input" id="login-name" placeholder="${t('name_ph')}">
            </div>
            <div class="field" style="margin-top:12px">
              <label class="label">OTP</label>
              <input class="input" id="login-otp" inputmode="numeric" maxlength="6" placeholder="${t('otp_ph')}" style="letter-spacing:.4em;font-size:1.3rem;text-align:center">
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="login-go">${t('verify')}</button>
          <button class="btn btn-ghost btn-block" id="google-go">${t('google_login')}</button>
        </div>
      </div>
    </div>`;
  let step = 1;
  document.getElementById('login-go').onclick = async () => {
    const phone = document.getElementById('login-phone').value.replace(/\D/g, '').slice(-10);
    if (step === 1) {
      try {
        await API.post('/auth/request-otp', { phone });
        step = 2;
        document.getElementById('login-step2').style.display = 'block';
        document.getElementById('login-go').textContent = t('verify');
        document.getElementById('login-otp').value = '123456';
        toast(t('otp_sent'));
      } catch (e) { toast(e.data?.hint || t('error_gen')); }
    } else {
      try {
        const r = await API.post('/auth/verify-otp', {
          phone, code: document.getElementById('login-otp').value,
          name: document.getElementById('login-name').value, cityId: S.cityId,
        });
        API.token = r.token; API.user = r.user;
        toast('✓ ' + r.user.name);
        await refreshFavorites();
        history.back();
      } catch (e) { toast(t('error_gen')); }
    }
  };
  document.getElementById('google-go').onclick = async () => {
    try {
      const r = await API.post('/auth/google', { name: 'Google User', email: 'demo.user@gmail.com' });
      API.token = r.token; API.user = r.user;
      toast('✓ ' + r.user.name);
      await refreshFavorites();
      history.back();
    } catch (e) { toast(t('error_gen')); }
  };
  window.scrollTo(0, 0);
}

/* ═══════════════ FAVOURITES ═══════════════ */
async function viewFavorites(view) {
  if (!API.user) {
    view.innerHTML = `<div class="empty-state">${icon('heart')}<h3>${t('login_first')}</h3>
      <a class="btn btn-primary" href="#/login">${t('login')}</a></div>`;
    return;
  }
  view.innerHTML = `<div class="section-title">${t('nav_fav')}</div><div id="fav-list">${skeletons(2)}</div>`;
  try {
    const favs = await API.get('/favorites');
    S.lastResults = favs;
    const box = document.getElementById('fav-list');
    box.innerHTML = favs.length ? favs.map((p) => resultCard({ ...p, categoryNameEn: (S.cats.find((c) => c.id === p.categoryId) || {}).name_en, categoryNameHi: (S.cats.find((c) => c.id === p.categoryId) || {}).name_hi, isOpenNow: true })).join('')
      : `<div class="empty-state">${icon('heart')}<h3>${t('fav_empty')}</h3><p>${t('fav_empty_hint')}</p></div>`;
  } catch (e) {
    document.getElementById('fav-list').innerHTML = `<div class="empty-state"><p>${t('error_gen')}</p></div>`;
  }
  window.scrollTo(0, 0);
}

/* ═══════════════ ACCOUNT ═══════════════ */
function viewAccount(view) {
  const u = API.user;
  view.innerHTML = `
    <div class="panel" style="text-align:center">
      <div style="width:72px;height:72px;margin:6px auto;border-radius:50%;background:var(--amber-soft);display:grid;place-items:center">
        ${icon('user', 'ic ic-lg')}
      </div>
      ${u ? `<h3 style="margin:6px 0 2px">${esc(u.name)}</h3><div class="muted">+91 ${esc(u.phone || '—')} · ${u.role}</div>`
          : `<h3 style="margin:6px 0">${t('my_account')}</h3><a class="btn btn-primary" href="#/login">${t('login')}</a>`}
    </div>
    <div class="panel">
      <a class="cta-card" href="#/register" style="margin:0 0 10px">
        <span class="cat-ico" style="background:var(--amber);width:44px;height:44px">${icon('plus')}</span>
        <div><b>${t('become_provider')}</b></div>${icon('chevron')}
      </a>
      ${u ? `<a class="cta-card" href="#/dashboard" style="margin:0 0 10px">
        <span class="cat-ico" style="background:var(--ink);width:44px;height:44px">${icon('wrench')}</span>
        <div><b>${t('provider_dash')}</b></div>${icon('chevron')}</a>` : ''}
      ${u && u.role === 'admin' ? `<a class="cta-card" href="#/admin">
        <span class="cat-ico" style="background:var(--red);width:44px;height:44px">${icon('shield')}</span>
        <div><b>${t('admin_panel')}</b></div>${icon('chevron')}</a>` : ''}
    </div>
    <div class="panel">
      <div class="kv"><span class="k">${icon('globe')}</span><span>${t('select_city')}: <b>${esc(locName((S.cities.find((c) => c.id === S.cityId) || {}).name_en || S.cityId, (S.cities.find((c) => c.id === S.cityId) || {}).name_hi))}</b> <button class="btn btn-ghost btn-sm" id="acc-city">${t('change')}</button></span></div>
    </div>
    ${u ? `<button class="btn btn-danger btn-block" id="logout">${t('logout')}</button>` : ''}
    <p class="tiny" style="text-align:center;margin-top:18px">Labors Near Me · Made for India 🇮🇳<br>Demo build — admin login: phone 9000000001, OTP 123456</p>
  `;
  document.getElementById('acc-city').onclick = openCityModal;
  const lo = document.getElementById('logout');
  if (lo) lo.onclick = async () => {
    try { await API.post('/auth/logout'); } catch (e) {}
    API.token = ''; API.user = null; S.favorites = new Set();
    toast('✓'); route(true);
  };
  window.scrollTo(0, 0);
}

/* ═══════════════ PROVIDER REGISTRATION (3-step wizard) ═══════════════ */
function viewRegister(view) {
  if (!API.user) {
    view.innerHTML = `<div class="empty-state">${icon('user')}<h3>${t('login_first')}</h3>
      <p class="muted">${t('login_sub')}</p><a class="btn btn-primary" href="#/login">${t('login')}</a></div>`;
    return;
  }
  const d = S.regDraft;
  const step = S.regStep;

  if (step === 4) {
    view.innerHTML = `
      <div class="auth-box" style="text-align:center">
        <div class="panel">
          <div style="font-size:3rem">✅</div>
          <h2>${t('reg_success')}</h2>
          <p class="muted">${t('reg_success_hint')}</p>
          <a class="btn btn-primary btn-block" href="#/dashboard">${t('go_dash')}</a>
        </div>
      </div>`;
    return;
  }

  const catOpts = S.cats.map((c) => `<option value="${c.id}" ${d.categoryId === c.id ? 'selected' : ''}>${esc(locName(c.name_en, c.name_hi))}</option>`).join('');
  const subCat = (S.cats.find((c) => c.id === d.categoryId) || {}).subcategories || [];
  const subOpts = subCat.map((sc) => `<option value="${sc.id}" ${d.subcategory === sc.id ? 'selected' : ''}>${esc(locName(sc.name_en, sc.name_hi))}</option>`).join('');
  const cityOpts = S.cities.map((c) => `<option value="${c.id}" ${d.cityId === c.id ? 'selected' : ''}>${esc(locName(c.name_en, c.name_hi))}</option>`).join('');

  let formHtml = '';
  if (step === 1) {
    formHtml = `
      <div class="field"><label class="label">${t('name_l')} *</label>
        <input class="input" id="r-name" value="${esc(d.name || '')}" placeholder="${t('name_l')}"></div>
      <div class="field"><label class="label">${t('business_name')}</label>
        <input class="input" id="r-biz" value="${esc(d.businessName || '')}"></div>
      <div class="field"><label class="label">${t('category')} *</label>
        <select class="select" id="r-cat">${catOpts}</select></div>
      <div class="field"><label class="label">${t('subcategory')}</label>
        <select class="select" id="r-sub">${subOpts}</select></div>
      <div class="row-2">
        <div class="field"><label class="label">${t('phone')} *</label>
          <input class="input" id="r-phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(d.phone || '')}"></div>
        <div class="field"><label class="label">${t('whatsapp_l')}</label>
          <input class="input" id="r-wa" type="tel" inputmode="numeric" maxlength="10" value="${esc(d.whatsapp || '')}"></div>
      </div>`;
  } else if (step === 2) {
    formHtml = `
      <div class="field"><label class="label">${t('city')}</label>
        <select class="select" id="r-city">${cityOpts}</select></div>
      <div class="field"><label class="label">${t('address_l2')} *</label>
        <textarea class="textarea" id="r-addr">${esc(d.address || '')}</textarea></div>
      <div class="row-2">
        <div class="field"><label class="label">${t('area')}</label>
          <input class="input" id="r-area" value="${esc(d.area || '')}"></div>
        <div class="field"><label class="label">${t('pincode')}</label>
          <input class="input" id="r-pin" inputmode="numeric" maxlength="6" value="${esc(d.pincode || '')}"></div>
      </div>
      <div class="field"><label class="label">${t('pick_map')}</label>
        <div class="map-box sm" id="reg-map"></div>
        <button class="btn btn-ghost btn-sm" id="r-gps" type="button">${icon('nav')} ${t('use_my_loc')}</button>
        <div class="hint" id="pin-hint">${d.lat ? `📌 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : t('pick_map')}</div>
      </div>`;
  } else {
    formHtml = `
      <div class="field"><label class="label">${t('photo_l')}</label>
        <label class="photo-drop" for="r-photo">${icon('upload', 'ic ic-lg')}
          <b>${t('photo_hint')}</b><span class="hint">JPG/PNG · phone se click karein</span></label>
        <input type="file" id="r-photo" accept="image/*" capture="environment" hidden>
        <div id="photo-prev"></div>
      </div>
      <div class="field"><label class="label">${t('about')}</label>
        <textarea class="textarea" id="r-about" placeholder="${t('about_ph')}">${esc(d.about || '')}</textarea></div>
      <div class="field"><label class="label">${t('skills')}</label>
        <input class="input" id="r-skills" placeholder="${t('skills_ph')}" value="${esc((d.skills || []).join(', '))}"></div>
      <div class="field"><label class="label">${t('price_hint')}</label>
        <input class="input" id="r-price" placeholder="${t('price_ph')}" value="${esc(d.priceHint || '')}"></div>
      <div class="row-2">
        <div class="field"><label class="label">${t('open_time')}</label><input class="input" id="r-open" type="time" value="${d.open || '09:00'}"></div>
        <div class="field"><label class="label">${t('close_time')}</label><input class="input" id="r-close" type="time" value="${d.close || '19:00'}"></div>
      </div>
      <div class="field"><label class="label">🪪 ${t('kyc_name')}</label>
        <input class="input" id="r-kyc" value="${esc(d.kycName || '')}">
        <div class="hint">${t('kyc_hint')}</div></div>`;
  }

  view.innerHTML = `
    <h2 style="margin:4px 0 2px">${t('reg_title')}</h2>
    <p class="muted" style="margin:0 0 14px">${t('reg_sub')}</p>
    <div class="steps">
      <div class="step-dot ${step >= 1 ? 'on' : ''}"></div>
      <div class="step-dot ${step >= 2 ? 'on' : ''}"></div>
      <div class="step-dot ${step >= 3 ? 'on' : ''}"></div>
    </div>
    <div class="step-label">${t('step')} ${step}/3 — ${t(step === 1 ? 'r1_t' : step === 2 ? 'r2_t' : 'r3_t')}</div>
    <div class="form">${formHtml}
      <div style="display:flex;gap:10px">
        ${step > 1 ? `<button class="btn btn-ghost" id="r-back" style="flex:1">${t('back')}</button>` : ''}
        <button class="btn btn-primary" id="r-next" style="flex:2">${step === 3 ? t('submit_reg') : t('next')}</button>
      </div>
    </div>`;

  // capture current fields into draft before navigating
  const capture = () => {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    if (step === 1) Object.assign(d, { name: g('r-name'), businessName: g('r-biz'), categoryId: g('r-cat'), subcategory: g('r-sub'), phone: g('r-phone'), whatsapp: g('r-wa') });
    if (step === 2) Object.assign(d, { cityId: g('r-city'), address: g('r-addr'), area: g('r-area'), pincode: g('r-pin') });
    if (step === 3) Object.assign(d, { about: g('r-about'), skills: (g('r-skills') || '').split(',').map((x) => x.trim()).filter(Boolean), priceHint: g('r-price'), open: g('r-open'), close: g('r-close'), kycName: g('r-kyc') });
  };

  if (step === 1) {
    document.getElementById('r-cat').onchange = (e) => { d.categoryId = e.target.value; delete d.subcategory; capture(); viewRegister(view); };
  }

  if (step === 2) {
    // pin picker map
    const city = S.cities.find((c) => c.id === (d.cityId || S.cityId)) || S.cities[0];
    const start = d.lat ? [d.lat, d.lng] : [city.lat, city.lng];
    const map = L.map('reg-map').setView(start, 13);
    S.map = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', maxZoom: 19 }).addTo(map);
    let marker = null;
    const drop = (latlng) => {
      d.lat = latlng.lat; d.lng = latlng.lng;
      if (marker) marker.setLatLng(latlng);
      else marker = L.marker(latlng).addTo(map);
      document.getElementById('pin-hint').textContent = `📌 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`;
    };
    if (d.lat) drop({ lat: d.lat, lng: d.lng });
    map.on('click', (e) => drop(e.latlng));
    document.getElementById('r-city').onchange = (e) => {
      d.cityId = e.target.value; capture();
      const c = S.cities.find((x) => x.id === d.cityId);
      map.setView([c.lat, c.lng], 13);
    };
    document.getElementById('r-gps').onclick = async () => {
      const ok = await useGpsLocation();
      if (ok && S.origin) { map.setView([S.origin.lat, S.origin.lng], 15); drop(S.origin); }
    };
  }

  if (step === 3) {
    document.getElementById('r-photo').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        d.photo = reader.result;
        document.getElementById('photo-prev').innerHTML = `<img src="${d.photo}" style="max-height:120px;border-radius:12px;margin-top:8px" alt="">`;
      };
      reader.readAsDataURL(file);
    };
    if (d.photo) document.getElementById('photo-prev').innerHTML = `<img src="${d.photo}" style="max-height:120px;border-radius:12px;margin-top:8px" alt="">`;
  }

  const back = document.getElementById('r-back');
  if (back) back.onclick = () => { capture(); S.regStep--; viewRegister(view); };

  document.getElementById('r-next').onclick = () => {
    capture();
    if (step === 1 && (!d.name || !d.phone || d.phone.length < 10)) return toast('⚠️ ' + t('phone') + ' / ' + t('name_l'));
    if (step === 2 && !d.address) return toast('⚠️ ' + t('address_l2'));
    if (step === 3) {
      return submitRegistration(view);
    }
    S.regStep++; viewRegister(view);
    window.scrollTo(0, 0);
  };
  window.scrollTo(0, 0);
}

async function submitRegistration(view) {
  const d = S.regDraft;
  try {
    await API.post('/providers/register', d);
    S.regStep = 4;
    S.regDraft = {};
    viewRegister(view);
  } catch (e) {
    toast(t('error_gen'));
  }
}

/* ═══════════════ PROVIDER DASHBOARD ═══════════════ */
async function viewDashboard(view) {
  if (!API.user) { location.hash = '#/login'; return; }
  view.innerHTML = `<h2 style="margin:4px 0 12px">${t('dash_title')}</h2>${skeletons(2)}`;
  try {
    const [mine, leads] = await Promise.all([API.get('/me/providers'), API.get('/me/leads')]);
    if (!mine.length) {
      view.innerHTML = `<div class="empty-state">${icon('wrench')}<h3>${t('reg_title')}</h3>
        <a class="btn btn-primary" href="#/register">${t('reg_sub')}</a></div>`;
      return;
    }
    view.innerHTML = `
      <h2 style="margin:4px 0 12px">${t('dash_title')}</h2>
      ${mine.map((p) => {
        const st = p.verified;
        const badge = st === 'verified' ? `<span class="badge badge-verified">${icon('shield')}${t('verified')}</span>`
          : st === 'pending' ? `<span class="badge badge-pending">⏳ ${t('p_pending')}</span>`
          : `<span class="badge badge-rejected">✕ ${t('p_rejected')}</span>`;
        const msg = st === 'verified' ? t('verified_msg') : st === 'pending' ? t('pending_msg') : t('rejected_msg');
        return `
        <div class="panel">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
            <div><b style="font-size:1.05rem">${esc(p.businessName)}</b><div class="muted">${msg}</div></div>${badge}
          </div>
          <div class="card-badges" style="margin-top:8px">
            ${stars(p.ratingAvg, p.ratingCount)}
            <span class="badge badge-open">${icon('phone')} ${p.leadCount} leads</span>
          </div>
          <div class="switch-row" style="margin-top:12px">
            <b>${p.isOpenNow ? t('toggle_open') : t('toggle_closed')}</b>
            <button class="switch ${p.isOpenNow ? 'on' : ''}" data-toggle="${p.id}"></button>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <a class="btn btn-ghost btn-sm" style="flex:1" href="#/edit/${p.id}">${icon('edit')} ${t('edit_profile')}</a>
            <a class="btn btn-ghost btn-sm" style="flex:1" href="#/p/${p.id}?preview=1">${t('see_all')} →</a>
            <button class="btn btn-ghost btn-sm" style="flex:1" data-share-p="${p.id}">${icon('share')} ${t('share')}</button>
          </div>
        </div>`;
      }).join('')}

      <div class="panel">
        <h4>${t('leads_title')}</h4>
        <div id="lead-list">
          ${leads.length ? leads.map((l) => `
            <div class="lead-row">
              ${icon(l.type === 'call' ? 'phone' : l.type === 'whatsapp' ? 'whatsapp' : 'nav')}
              <div class="grow" style="flex:1"><b>${esc(l.userName || 'User')}</b> — ${t(l.type === 'call' ? 'lead_call' : l.type === 'whatsapp' ? 'lead_wa' : 'lead_dir')}</div>
              <span class="tiny">${timeAgo(l.createdAt)}</span>
            </div>`).join('') : `<div class="muted">${t('no_leads')}</div>`}
        </div>
      </div>`;

    view.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.onclick = async () => {
        const on = btn.classList.contains('on');
        try {
          await API.post('/providers/' + btn.dataset.toggle + '/availability', { open: !on });
          route(true);
        } catch (e) { toast(t('error_gen')); }
      };
    });
    view.querySelectorAll('[data-share-p]').forEach((btn) => {
      btn.onclick = () => shareAppOrProvider(S.lastResults.find((p) => p.id === btn.dataset.shareP) || { id: btn.dataset.shareP, name: '', businessName: t('nav_home') });
    });
  } catch (e) {
    view.innerHTML = `<div class="empty-state"><p>${t('error_gen')}</p></div>`;
  }
  window.scrollTo(0, 0);
}

/* ═══════════════ EDIT OWN LISTING (provider) ═══════════════ */
async function viewEdit(view, id) {
  if (!API.user) { location.hash = '#/login'; return; }
  view.innerHTML = `<h2 style="margin:4px 0 12px">${t('edit_title')}</h2>${skeletons(2)}`;
  let p;
  try {
    p = await API.get(`/providers/${id}?preview=1`); // owner/admin only for unverified
  } catch (e) {
    view.innerHTML = `<div class="empty-state">${icon('x')}<p>${t('error_gen')}</p></div>`; return;
  }
  S.detailCache = p;
  const hours = (p.availability && p.availability.hours) || { open: '09:00', close: '19:00' };
  view.innerHTML = `
    <h2 style="margin:4px 0 12px">${t('edit_title')} ✏️</h2>
    <div class="form">
      <div class="panel">
        <div class="field"><label class="label">${t('name_l')} *</label>
          <input class="input" id="e-name" value="${esc(p.name)}"></div>
        <div class="field" style="margin-top:10px"><label class="label">${t('business_name')}</label>
          <input class="input" id="e-biz" value="${esc(p.businessName)}"></div>
        <div class="row-2" style="margin-top:10px">
          <div class="field"><label class="label">${t('phone')} *</label>
            <input class="input" id="e-phone" maxlength="10" value="${esc(p.phone)}"></div>
          <div class="field"><label class="label">${t('whatsapp_l')}</label>
            <input class="input" id="e-wa" maxlength="10" value="${esc(p.whatsapp || '')}"></div>
        </div>
      </div>
      <div class="panel">
        <div class="field"><label class="label">${t('address_l2')}</label>
          <textarea class="textarea" id="e-addr">${esc(p.address.line1 || '')}</textarea></div>
        <div class="row-2" style="margin-top:10px">
          <div class="field"><label class="label">${t('area')}</label>
            <input class="input" id="e-area" value="${esc(p.address.area || '')}"></div>
          <div class="field"><label class="label">${t('pincode')}</label>
            <input class="input" id="e-pin" maxlength="6" value="${esc(p.address.pincode || '')}"></div>
        </div>
        <div class="row-2" style="margin-top:10px">
          <div class="field"><label class="label">${t('open_time')}</label><input class="input" id="e-open" type="time" value="${hours.open}"></div>
          <div class="field"><label class="label">${t('close_time')}</label><input class="input" id="e-close" type="time" value="${hours.close}"></div>
        </div>
      </div>
      <div class="panel">
        <div class="field"><label class="label">${t('photo_l')}</label>
          <div id="e-photo-prev">${p.photo ? `<img src="${p.photo}" style="max-height:120px;border-radius:12px" alt="">` : ''}</div>
          <label class="photo-drop" for="e-photo">${icon('upload')}<b>${t('photo_hint')}</b></label>
          <input type="file" id="e-photo" accept="image/*" capture="environment" hidden>
          ${p.photo ? `<button class="btn btn-ghost btn-sm" id="e-photo-del">${t('remove_photo')}</button>` : ''}
        </div>
        <div class="field" style="margin-top:10px"><label class="label">${t('about')}</label>
          <textarea class="textarea" id="e-about" placeholder="${t('about_ph')}">${esc(p.about || '')}</textarea></div>
        <div class="field" style="margin-top:10px"><label class="label">${t('skills')}</label>
          <input class="input" id="e-skills" placeholder="${t('skills_ph')}" value="${esc((p.skills || []).join(', '))}"></div>
        <div class="field" style="margin-top:10px"><label class="label">${t('price_hint')}</label>
          <input class="input" id="e-price" placeholder="${t('price_ph')}" value="${esc(p.priceHint || '')}"></div>
      </div>
      <button class="btn btn-primary btn-block" id="e-save">${t('save_changes')}</button>
      <a class="btn btn-ghost btn-block" href="#/dashboard">${t('back')}</a>
    </div>`;

  let newPhoto; // undefined = unchanged, null = removed
  document.getElementById('e-photo').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      newPhoto = reader.result;
      document.getElementById('e-photo-prev').innerHTML = `<img src="${newPhoto}" style="max-height:120px;border-radius:12px" alt="">`;
    };
    reader.readAsDataURL(file);
  };
  const delBtn = document.getElementById('e-photo-del');
  if (delBtn) delBtn.onclick = () => {
    newPhoto = null;
    document.getElementById('e-photo-prev').innerHTML = '';
    toast('🗑');
  };

  document.getElementById('e-save').onclick = async () => {
    const body = {
      name: document.getElementById('e-name').value,
      businessName: document.getElementById('e-biz').value,
      phone: document.getElementById('e-phone').value,
      whatsapp: document.getElementById('e-wa').value,
      address: document.getElementById('e-addr').value,
      area: document.getElementById('e-area').value,
      pincode: document.getElementById('e-pin').value,
      open: document.getElementById('e-open').value,
      close: document.getElementById('e-close').value,
      about: document.getElementById('e-about').value,
      skills: document.getElementById('e-skills').value.split(',').map((x) => x.trim()).filter(Boolean),
      priceHint: document.getElementById('e-price').value,
    };
    if (newPhoto !== undefined) body.photo = newPhoto;
    try {
      await API.put('/providers/' + id, body);
      toast(t('saved_ok'));
      location.hash = '#/dashboard';
    } catch (e) { toast(t('error_gen')); }
  };
  window.scrollTo(0, 0);
}

/* ═══════════════ ADMIN PANEL ═══════════════ */
async function viewAdmin(view, tab) {
  const u = API.user;
  if (!u) { location.hash = '#/login'; return; }
  if (u.role !== 'admin') {
    view.innerHTML = `<div class="empty-state">${icon('shield')}<h3>${t('admin_title')}</h3><p class="muted">Admin login required — demo: 9000000001</p></div>`;
    return;
  }
  S.adminTab = tab || S.adminTab || 'overview';
  const tabs = ['overview', 'providers', 'categories', 'reports'];
  view.innerHTML = `
    <h2 style="margin:4px 0 12px">${t('admin_title')} 🛡️</h2>
    <div class="admin-tabs">
      ${tabs.map((x) => `<button class="chip ${S.adminTab === x ? 'active' : ''}" onclick="location.hash='#/admin/${x}'">${t(x === 'overview' ? 'a_overview' : x === 'providers' ? 'a_providers' : x === 'categories' ? 'a_categories' : 'a_reports')}</button>`).join('')}
    </div>
    <div id="admin-body">${skeletons(2)}</div>`;

  const body = document.getElementById('admin-body');
  try {
    if (S.adminTab === 'overview') await adminOverview(body);
    else if (S.adminTab === 'providers') await adminProviders(body);
    else if (S.adminTab === 'categories') await adminCategories(body);
    else await adminReports(body);
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><p>${t('error_gen')}</p></div>`;
  }
  window.scrollTo(0, 0);
}

async function adminOverview(body) {
  const s = await API.get('/admin/stats');
  const maxCity = Math.max(1, ...Object.values(s.byCity));
  const maxCat = Math.max(1, ...Object.values(s.byCategory));
  const cityName = (id) => { const c = S.cities.find((x) => x.id === id) || {}; return locName(c.name_en || id, c.name_hi); };
  const catName = (id) => { const c = S.cats.find((x) => x.id === id) || {}; return locName(c.name_en || id, c.name_hi); };
  body.innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile"><b>${s.totals.providers}</b><span>${t('st_providers')}</span></div>
      <div class="stat-tile"><b style="color:var(--amber-dark)">${s.totals.pending}</b><span>${t('st_pending')}</span></div>
      <div class="stat-tile"><b>${s.totals.users}</b><span>${t('st_users')}</span></div>
      <div class="stat-tile"><b>${s.totals.searches}</b><span>${t('st_searches')} · ${s.totals.searchesToday} ${t('st_today')}</span></div>
      <div class="stat-tile"><b>${s.totals.leads}</b><span>${t('st_leads')}</span></div>
      <div class="stat-tile"><b>${s.totals.reviews}</b><span>${t('st_reviews')}</span></div>
      <div class="stat-tile"><b style="color:var(--red)">${s.totals.openReports}</b><span>${t('a_reports')}</span></div>
    </div>
    <div class="panel" style="margin-top:12px"><h4>${t('by_city')}</h4>
      ${Object.entries(s.byCity).sort((a, b) => b[1] - a[1]).map(([id, n]) => `
        <div class="bar-row"><span class="lab">${esc(cityName(id))}</span><div class="bar" style="width:${(n / maxCity) * 70}%"></div><b>${n}</b></div>`).join('')}
    </div>
    <div class="panel"><h4>${t('by_cat')}</h4>
      ${Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]).map(([id, n]) => `
        <div class="bar-row"><span class="lab">${esc(catName(id))}</span><div class="bar" style="width:${(n / maxCat) * 70}%;background:var(--ink)"></div><b>${n}</b></div>`).join('')}
    </div>
    <div class="panel"><h4>${t('recent_searches_admin')}</h4>
      ${s.recentSearches.map((x) => `<div class="lead-row"><span style="flex:1">${esc(x.q || '—')}</span><span class="tiny">${esc(cityName(x.cityId))} · ${timeAgo(x.createdAt)}</span></div>`).join('')}
    </div>`;
}

async function adminProviders(body) {
  let status = 'pending';
  let lastRows = [];
  const render = async () => {
    const rows = await API.get(`/admin/providers?status=${status === 'all' ? '' : status}`);
    lastRows = rows;
    const catName = (id) => { const c = S.cats.find((x) => x.id === id) || {}; return locName(c.name_en || id, c.name_hi); };
    return `
      <div class="chip-row" style="padding-top:0">
        ${['pending', 'verified', 'rejected', 'all'].map((x) => `<button class="chip ${status === x ? 'active' : ''}" data-st="${x}">${t(x === 'all' ? 'p_all' : x === 'pending' ? 'p_pending' : x === 'verified' ? 'p_verified' : 'p_rejected')}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-dark btn-sm" id="a-add" style="flex:1">${t('add_provider')}</button>
        <button class="btn btn-ghost btn-sm" id="a-bulk" style="flex:1">${t('bulk_csv')}</button>
        <button class="btn btn-ghost btn-sm" id="a-export">${t('export_csv')}</button>
      </div>
      <div id="admin-form-box"></div>
      ${rows.map((p) => `
        <div class="admin-row">
          ${avatarSvg(p.businessName, p.categoryId, p.photo)}
          <div class="grow">
            <b>${esc(p.businessName)}</b> <span class="tiny">(${esc(p.name)} · ${esc(catName(p.categoryId))} · ${esc(p.address.city)})</span><br>
            <span class="tiny">+91 ${esc(p.phone)} ${p.source === 'csv' ? '· CSV' : p.source === 'admin' ? '· ' + t('manual_added') : '· self'}</span>
            <div class="card-badges">
              ${p.verified === 'verified' ? `<span class="badge badge-verified">${t('p_verified')}</span>` : p.verified === 'pending' ? `<span class="badge badge-pending">${t('p_pending')}</span>` : `<span class="badge badge-rejected">${t('p_rejected')}</span>`}
              ${stars(p.ratingAvg, p.ratingCount)}
            </div>
          </div>
          <div class="admin-actions">
            ${p.verified !== 'verified' ? `<button class="btn btn-primary btn-sm" data-ok="${p.id}">✓ ${t('approve')}</button>` : ''}
            ${p.verified === 'verified' ? `<button class="btn btn-ghost btn-sm" data-no="${p.id}">✕ ${t('reject')}</button>` : ''}
            <button class="btn btn-ghost btn-sm" data-edit="${p.id}">${icon('edit')}</button>
            <button class="btn btn-danger btn-sm" data-del="${p.id}">${icon('trash')}</button>
          </div>
        </div>`).join('') || `<div class="muted">—</div>`}`;
  };

  body.innerHTML = await render();

  const rerender = async () => { body.innerHTML = await render(); wire(); };
  const wire = () => {
    // Export current rows as CSV (client-side blob — ops convenience)
    const exportBtn = document.getElementById('a-export');
    if (exportBtn) exportBtn.onclick = () => {
      const head = 'name,businessName,category,phone,whatsapp,city,area,address,verified,ratingAvg,ratingCount';
      const lines = lastRows.map((p) => [p.name, p.businessName, p.categoryId, p.phone, p.whatsapp,
        p.address.cityId, p.address.area, (p.address.line1 || '').replace(/,/g, ' '), p.verified, p.ratingAvg, p.ratingCount].join(','));
      const blob = new Blob([head + '\n' + lines.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'labors-providers.csv';
      a.click();
    };
    // Inline edit form (same fields as manual add → PUT)
    body.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
      const p = lastRows.find((x) => x.id === b.dataset.edit);
      const box = document.getElementById('admin-form-box');
      const catOpts = S.cats.map((c) => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${esc(locName(c.name_en, c.name_hi))}</option>`).join('');
      const cityOpts = S.cities.map((c) => `<option value="${c.id}" ${p.address.cityId === c.id ? 'selected' : ''}>${esc(locName(c.name_en, c.name_hi))}</option>`).join('');
      box.innerHTML = `
        <div class="panel form">
          <b>${icon('edit')} ${p.businessName}</b>
          <div class="row-2">
            <input class="input" id="m-name" placeholder="${t('name_l')} *" value="${esc(p.name)}">
            <input class="input" id="m-biz" placeholder="${t('business_name')}" value="${esc(p.businessName)}">
          </div>
          <div class="row-2">
            <select class="select" id="m-cat">${catOpts}</select>
            <select class="select" id="m-city">${cityOpts}</select>
          </div>
          <div class="row-2">
            <input class="input" id="m-phone" placeholder="${t('phone')} *" maxlength="10" value="${esc(p.phone)}">
            <input class="input" id="m-area" placeholder="${t('area')}" value="${esc(p.address.area || '')}">
          </div>
          <input class="input" id="m-addr" placeholder="${t('address_l2')}" value="${esc(p.address.line1 || '')}">
          <button class="btn btn-primary btn-block" id="m-save">${t('save_changes')}</button>
        </div>`;
      document.getElementById('m-save').onclick = async () => {
        try {
          await API.put('/admin/providers/' + p.id, {
            name: document.getElementById('m-name').value,
            businessName: document.getElementById('m-biz').value,
            categoryId: document.getElementById('m-cat').value,
            cityId: document.getElementById('m-city').value,
            phone: document.getElementById('m-phone').value,
            area: document.getElementById('m-area').value,
            address: document.getElementById('m-addr').value,
          });
          toast(t('saved_ok'));
          rerender();
        } catch (e) { toast(t('error_gen')); }
      };
      box.scrollIntoView({ behavior: 'smooth' });
    });
    body.querySelectorAll('[data-st]').forEach((b) => b.onclick = () => { status = b.dataset.st; rerender(); });
    body.querySelectorAll('[data-ok]').forEach((b) => b.onclick = async () => { await API.post(`/admin/providers/${b.dataset.ok}/verify`); toast('✓'); rerender(); });
    body.querySelectorAll('[data-no]').forEach((b) => b.onclick = async () => { await API.post(`/admin/providers/${b.dataset.no}/reject`); rerender(); });
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (confirm(t('confirm_del'))) { await API.del(`/admin/providers/${b.dataset.del}`); rerender(); } });

    document.getElementById('a-add').onclick = () => {
      const box = document.getElementById('admin-form-box');
      const catOpts = S.cats.map((c) => `<option value="${c.id}">${esc(locName(c.name_en, c.name_hi))}</option>`).join('');
      const cityOpts = S.cities.map((c) => `<option value="${c.id}">${esc(locName(c.name_en, c.name_hi))}</option>`).join('');
      box.innerHTML = `
        <div class="panel form">
          <b>${t('add_provider')}</b>
          <div class="row-2">
            <input class="input" id="m-name" placeholder="${t('name_l')} *">
            <input class="input" id="m-biz" placeholder="${t('business_name')}">
          </div>
          <div class="row-2">
            <select class="select" id="m-cat">${catOpts}</select>
            <select class="select" id="m-city">${cityOpts}</select>
          </div>
          <div class="row-2">
            <input class="input" id="m-phone" placeholder="${t('phone')} *" maxlength="10">
            <input class="input" id="m-area" placeholder="${t('area')}">
          </div>
          <input class="input" id="m-addr" placeholder="${t('address_l2')}">
          <button class="btn btn-primary btn-block" id="m-save">${t('submit')}</button>
        </div>`;
      document.getElementById('m-save').onclick = async () => {
        try {
          await API.post('/admin/providers', {
            name: document.getElementById('m-name').value,
            businessName: document.getElementById('m-biz').value,
            categoryId: document.getElementById('m-cat').value,
            cityId: document.getElementById('m-city').value,
            phone: document.getElementById('m-phone').value,
            area: document.getElementById('m-area').value,
            address: document.getElementById('m-addr').value,
          });
          toast('✓ ' + t('manual_added'));
          rerender();
        } catch (e) { toast(t('error_gen')); }
      };
      box.scrollIntoView({ behavior: 'smooth' });
    };

    document.getElementById('a-bulk').onclick = () => {
      const box = document.getElementById('admin-form-box');
      box.innerHTML = `
        <div class="panel form">
          <b>${t('bulk_csv')}</b>
          <div class="hint">${t('bulk_hint')}</div>
          <textarea class="textarea" id="bulk-csv" style="min-height:140px;font-family:monospace;font-size:.75rem"></textarea>
          <input type="file" id="bulk-file" accept=".csv,.txt" class="input">
          <button class="btn btn-ghost btn-block btn-sm" id="bulk-tpl">${t('dl_template')}</button>
          <button class="btn btn-primary btn-block" id="bulk-go">${t('submit')}</button>
          <div class="hint">Example: Ramesh Kumar,Ramesh Tailors,tailor,alteration,9812345678,9812345678,"MG Road 12",Sarafa,indore,Madhya Pradesh,452002,22.72,75.85,"20 saal ka tajurba"</div>
        </div>`;
      document.getElementById('bulk-file').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader(); r.onload = () => { document.getElementById('bulk-csv').value = r.result; }; r.readAsText(f);
      };
      document.getElementById('bulk-tpl').onclick = () => {
        const csv = 'name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about\n' +
          'Ramesh Kumar,Ramesh Tailors,tailor,alteration,9812345678,9812345678,"MG Road 12",Sarafa,indore,Madhya Pradesh,452002,22.72,75.85,"20 saal ka tajurba"\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'labors-bulk-template.csv';
        a.click();
      };
      document.getElementById('bulk-go').onclick = async () => {
        try {
          const res = await API.post('/admin/providers/bulk', { csv: document.getElementById('bulk-csv').value });
          toast(`✓ ${res.added} added` + (res.skipped.length ? ` · ${res.skipped.length} skipped` : ''));
          rerender();
        } catch (e) { toast(t('error_gen')); }
      };
      box.scrollIntoView({ behavior: 'smooth' });
    };
  };
  wire();
}

async function adminCategories(body) {
  const rows = await API.get('/admin/categories');
  body.innerHTML = `
    <button class="btn btn-dark btn-block" id="c-add" style="margin-bottom:12px">${t('add_cat')}</button>
    <div id="c-form"></div>
    ${rows.map((c) => `
      <div class="admin-row">
        <span class="cat-ico" style="background:${CAT_COLORS[c.id] || '#F59E0B'};width:38px;height:38px">${icon(c.icon || 'wrench')}</span>
        <div class="grow"><b>${esc(c.name_en)}</b> · ${esc(c.name_hi)}<br>
          <span class="tiny">${(c.subcategories || []).map((s) => esc(s.name_en)).join(' · ')}</span></div>
        <div class="admin-actions">
          <button class="btn btn-ghost btn-sm" data-act-cat="toggle" data-id="${c.id}" data-val="${c.active !== false}">${c.active !== false ? t('active_l') : 'off'}</button>
          <button class="btn btn-danger btn-sm" data-act-cat="del" data-id="${c.id}">${icon('trash')}</button>
        </div>
      </div>`).join('')}`;

  const wire = () => {
    document.getElementById('c-add').onclick = () => {
      document.getElementById('c-form').innerHTML = `
        <div class="panel form">
          <div class="row-2">
            <input class="input" id="c-en" placeholder="${t('name_en')} *">
            <input class="input" id="c-hi" placeholder="${t('name_hi')} *">
          </div>
          <input class="input" id="c-icon" placeholder="${t('icon_l')} (bolt/helmet/scissors/hanger/brick/pot/wrench/hammer/brush/broom/snow/wheel/mobile/comb/chef/leaf)">
          <input class="input" id="c-sub" placeholder="Sub-categories (en1|hi1, en2|hi2)">
          <button class="btn btn-primary btn-block" id="c-save">${t('submit')}</button>
        </div>`;
      document.getElementById('c-save').onclick = async () => {
        const subs = (document.getElementById('c-sub').value || '').split(',').filter(Boolean).map((pair) => {
          const [en, hi] = pair.split('|');
          return { id: (en || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'), name_en: (en || '').trim(), name_hi: (hi || en || '').trim() };
        });
        try {
          await API.post('/admin/categories', {
            id: document.getElementById('c-en').value, name_en: document.getElementById('c-en').value,
            name_hi: document.getElementById('c-hi').value, icon: document.getElementById('c-icon').value || 'wrench',
            subcategories: subs,
          });
          toast('✓'); viewAdmin(document.getElementById('view'), 'categories');
        } catch (e) { toast(t('error_gen')); }
      };
    };
    body.querySelectorAll('[data-act-cat]').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.actCat === 'del') { if (!confirm('Delete?')) return; await API.del('/admin/categories/' + b.dataset.id); }
        else await API.put('/admin/categories/' + b.dataset.id, { active: b.dataset.val !== 'true' });
        viewAdmin(document.getElementById('view'), 'categories');
      };
    });
  };
  wire();
}

async function adminReports(body) {
  const rows = await API.get('/admin/reports');
  body.innerHTML = rows.length ? rows.map((r) => `
    <div class="admin-row">
      <div class="grow">
        <b>${esc(r.provider ? r.provider.businessName : r.providerId)}</b><br>
        <span class="tiny">${esc(r.reason)} · ${timeAgo(r.createdAt)} · ${r.status}</span>
      </div>
      ${r.status === 'open' ? `<button class="btn btn-primary btn-sm" data-res="${r.id}">${t('resolve')}</button>` : '<span class="badge badge-open">✓</span>'}
    </div>`).join('') : `<div class="empty-state">${icon('shield')}<p>${t('no_reports')}</p></div>`;
  body.querySelectorAll('[data-res]').forEach((b) => b.onclick = async () => {
    await API.post(`/admin/reports/${b.dataset.res}/resolve`);
    viewAdmin(document.getElementById('view'), 'reports');
  });
}
````

## 📄 `web/sw.js`

````javascript
/**
 * sw.js — Service worker tuned for LOW-BANDWIDTH Indian networks.
 *  - Precaches the app shell (tiny vanilla JS — no framework payload).
 *  - GET /api responses: network-first with cache fallback (stale listings still show).
 *  - Static assets: cache-first (instant repeat loads on 2G/3G).
 */
const CACHE = 'lnm-v2';
const SHELL = [
  '/', '/index.html', '/css/app.css',
  '/js/i18n.js', '/js/api.js', '/js/app.js',
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Map tiles & external links: straight to network, no caching (they're huge)
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // Network-first API: fresh data when online, cached fallback when not
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static: cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});
````

## 📄 `web/manifest.webmanifest`

````json
{
  "name": "Labors Near Me — लेबर्स नियर मी",
  "short_name": "Labors",
  "description": "Find trusted skilled & unskilled workers near you — electricians, tailors, masons, plumbers and more.",
  "lang": "en-IN",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAFAF9",
  "theme_color": "#F97316",
  "categories": ["business", "utilities", "lifestyle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Search workers", "url": "/#/search", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] },
    { "name": "List your services", "url": "/#/register", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] }
  ]
}
````

## 📄 `tools/build-standalone.js`

````javascript
/**
 * build-standalone.js — Builds LaborsNearMe.html: a SINGLE-FILE, fully offline
 * version of the app. Everything is inlined: CSS, Leaflet, i18n, the SPA,
 * an offline API engine (web/js/localapi.js) + the seed database.
 *
 *   node tools/build-standalone.js
 *
 * Output: ../LaborsNearMe.html (repo root) — copy it to any phone and open
 * in Chrome. No server, no internet needed (map tiles need internet).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const read = (p) => fs.readFileSync(p, 'utf8');

// 1 ── Seed database (same data the Express server boots with)
const { buildSeed } = require(path.join(ROOT, 'backend', 'src', 'seed'));
const seed = buildSeed();

// 2 ── Leaflet CSS with marker images inlined as data-URIs (offline markers)
let leafletCss = read(path.join(WEB, 'vendor', 'leaflet', 'leaflet.css'));
leafletCss = leafletCss.replace(/url\((["']?)images\/([\w.-]+)\1\)/g, (m, q, file) => {
  const imgPath = path.join(WEB, 'vendor', 'leaflet', 'images', file);
  if (!fs.existsSync(imgPath)) return m;
  return `url(data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')})`;
});

const appCss = read(path.join(WEB, 'css', 'app.css'));
const favicon = fs.readFileSync(path.join(WEB, 'icons', 'icon-192.png')).toString('base64');

// 3 ── JS in load order (storage shim → seed → leaflet → i18n → api → offline engine → SPA)
const storageShim = `/* storage shim — keeps the app alive on file:// and sandboxed previews */
(function(){try{localStorage.setItem('__t','1');localStorage.removeItem('__t');}catch(e){
var mem={};var shim={getItem:function(k){return k in mem?mem[k]:null;},
setItem:function(k,v){mem[k]=String(v);},removeItem:function(k){delete mem[k];},
clear:function(){mem={};},key:function(i){return Object.keys(mem)[i]||null;},
get length(){return Object.keys(mem).length;}};
try{Object.defineProperty(window,'localStorage',{value:shim,configurable:true});}catch(e2){}
}})();`;

const seedJson = 'window.LNM_SEED = ' + JSON.stringify(seed) + ';';
const leafletJs = read(path.join(WEB, 'vendor', 'leaflet', 'leaflet.js'));
const i18nJs = read(path.join(WEB, 'js', 'i18n.js'));
const apiJs = read(path.join(WEB, 'js', 'api.js'));
const localApiJs = read(path.join(WEB, 'js', 'localapi.js'));
const appJs = read(path.join(WEB, 'js', 'app.js'));

// 4 ── HTML shell: take web/index.html, strip external refs, inline everything
let html = read(path.join(WEB, 'index.html'));
html = html
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '')
  .replace(/<link rel="icon"[^>]*>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/g, '')
  .replace(/<script src="[^"]*"><\/script>\s*/g, '')
  .replace('<meta charset="utf-8">',
    `<meta charset="utf-8">\n  <link rel="icon" href="data:image/png;base64,${favicon}">`);
html = html.replace(/src="\/icons\/([\w.-]+)"/g, (m, file) => {
  const imgPath = path.join(WEB, "icons", file);
  if (!fs.existsSync(imgPath)) return m;
  return `src="data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}"`;
});

const styleBlock = `<style>\n${leafletCss}\n${appCss}\n</style>`;
const scriptBlock = [
  storageShim, seedJson, leafletJs, i18nJs, apiJs, localApiJs, appJs,
].map((s) => `<script>\n${s}\n</script>`).join('\n');

html = html.replace('</head>', `  ${styleBlock}\n</head>`);
html = html.replace('</body>', `${scriptBlock}\n</body>`);
html = html.replace('<html lang="en-IN">', '<html lang="en-IN">');

// 5 ── Write output (repo root + /home/user copy for easy download)
const out = path.join(ROOT, 'LaborsNearMe.html');
fs.writeFileSync(out, html);
const homeCopy = path.join(require('os').homedir(), 'LaborsNearMe.html');
fs.writeFileSync(homeCopy, html);
console.log('✅ Built', out, `(${Math.round(fs.statSync(out).size / 1024)} KB)`);
console.log('✅ Copy ', homeCopy);
````

## 📄 `tools/test-localapi.js`

````javascript
/* Smoke test for the offline engine (web/js/localapi.js) — run: node tools/test-localapi.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const { buildSeed } = require(path.join(ROOT, 'backend', 'src', 'seed'));

// Minimal browser-ish sandbox
const mem = {};
const sandbox = {
  window: {}, console,
  localStorage: {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
    clear: () => { for (const k in mem) delete mem[k]; },
  },
  URLSearchParams, Date, Math, JSON, Number, String, Array, Object, Error,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

sandbox.window.LNM_SEED = buildSeed();
sandbox.window.API = { token: '', user: null, req: null };

const localapi = fs.readFileSync(path.join(ROOT, 'web', 'js', 'localapi.js'), 'utf8');
vm.runInContext(localapi, sandbox);

const API = sandbox.window.API;
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra || ''); }
}

(async () => {
  const call = (m, p, b) => API.req.call(API, m, p, b);

  console.log('— public —');
  const cats = await call('GET', '/categories');
  check('categories = 16', cats.length === 16);
  const cities = await call('GET', '/cities');
  check('cities = 10', cities.length === 10);

  const near = await call('GET', '/providers/nearby?cityId=indore&q=tailor&sort=distance');
  check('nearby tailor search', near.results.length > 0, JSON.stringify(near).slice(0, 100));
  check('distanceText present', !!near.results[0].distanceText);
  const rel = await call('GET', '/providers/nearby?cityId=indore&sort=relevance');
  check('relevance sort', rel.results.length > 0 && rel.sort === 'relevance');
  const gps = await call('GET', '/providers/nearby?lat=22.72&lng=75.86&sort=distance&limit=3');
  check('gps origin query', gps.origin.label === 'gps' && gps.results.length === 3);

  const pid = near.results[0].id;
  const det = await call('GET', `/providers/${pid}?lat=22.72&lng=75.86`);
  check('provider detail + distance', det.id === pid && det.distance >= 0);
  const revs = await call('GET', `/providers/${pid}/reviews`);
  check('reviews list is array', Array.isArray(revs));
  const pop = await call('GET', '/searches/popular');
  check('popular searches', Array.isArray(pop) && pop.length > 0);

  console.log('— auth —');
  const otp = await call('POST', '/auth/request-otp', { phone: '9876543210' });
  check('request-otp demo', otp.devOtp === '123456');
  try { await call('POST', '/auth/request-otp', { phone: '12345' }); check('bad phone rejected', false); }
  catch (e) { check('bad phone rejected', e.status === 400); }
  const login = await call('POST', '/auth/verify-otp', { phone: '9876543210', code: '123456', name: 'Test User', cityId: 'indore' });
  check('verify-otp → token+user', !!login.token && login.user.name === 'Test User');
  API.token = login.token; API.user = login.user;
  const me = await call('GET', '/auth/me');
  check('/auth/me', me.user.id === login.user.id);

  console.log('— user —');
  await call('POST', `/favorites/${pid}`);
  const favs = await call('GET', '/favorites');
  check('favorite saved', favs.some((f) => f.id === pid));
  await call('DELETE', `/favorites/${pid}`);
  const favs2 = await call('GET', '/favorites');
  check('favorite removed', !favs2.some((f) => f.id === pid));
  const leadRes = await call('POST', '/leads', { providerId: pid, type: 'call' });
  check('lead accepted', leadRes.ok === true);
  const rev = await call('POST', `/providers/${pid}/reviews`, { rating: 5, text: 'Bahut badhiya!' });
  check('review posted + weighted avg', rev.ok === true && rev.ratingCount >= 1);
  try { await call('POST', `/providers/${pid}/reviews`, { rating: 4, text: 'dup' }); check('duplicate review blocked', false); }
  catch (e) { check('duplicate review blocked', e.data.error === 'already_reviewed'); }

  console.log('— provider register + dashboard —');
  const reg = await call('POST', '/providers/register', {
    name: 'Ramesh Kumar', businessName: 'Ramesh Electrical Works', categoryId: 'electrician',
    phone: '9812345670', cityId: 'indore', area: 'Vijay Nagar', address: 'Near Square, Vijay Nagar',
    about: 'Wiring expert', skills: ['Wiring'], kycName: 'Ramesh Kumar',
  });
  check('register → pending', reg.provider.verified === 'pending');
  const mine = await call('GET', '/me/providers');
  check('my listings', mine.length === 1 && mine[0].verified === 'pending');
  const preview = await call('GET', `/providers/${reg.provider.id}?preview=1`);
  check('owner preview of unverified', preview.id === reg.provider.id);
  await call('POST', `/providers/${reg.provider.id}/availability`, { open: false });
  const mine2 = await call('GET', '/me/providers');
  check('availability toggle', mine2[0].availability.manualOpen === false);
  await call('PUT', `/providers/${reg.provider.id}`, { about: 'Updated about', priceHint: '₹300' });
  const mine3 = await call('GET', '/me/providers');
  check('owner edit', mine3[0].id === reg.provider.id);
  // lead to OUR provider shows in our dashboard feed
  const login2 = { id: login.user.id };
  await call('POST', '/auth/request-otp', { phone: '9000000002' }); // another user logs in to send lead
  const other = await call('POST', '/auth/verify-otp', { phone: '9000000002', code: '123456' });
  const savedToken = API.token;
  API.token = other.token; API.user = other.user;
  await call('POST', '/leads', { providerId: reg.provider.id, type: 'whatsapp' });
  API.token = savedToken; API.user = login2;
  const myLeads = await call('GET', '/me/leads');
  check('lead feed in dashboard', myLeads.length === 1 && myLeads[0].type === 'whatsapp');

  console.log('— admin —');
  // login as seeded admin
  await call('POST', '/auth/logout', {});
  API.token = ''; API.user = null;
  await call('POST', '/auth/request-otp', { phone: '9000000001' });
  const admin = await call('POST', '/auth/verify-otp', { phone: '9000000001', code: '123456' });
  check('admin login', admin.user.role === 'admin');
  API.token = admin.token; API.user = admin.user;

  const stats = await call('GET', '/admin/stats');
  check('stats totals', stats.totals.providers > 80 && typeof stats.byCity === 'object');
  const pending = await call('GET', '/admin/providers?status=pending');
  check('pending queue', pending.length >= 1);
  const seedPendingId = pending.find((x) => x.id !== reg.provider.id).id; // a seeded unverified listing
  await call('POST', `/admin/providers/${reg.provider.id}/verify`);
  const det2 = await call('GET', `/providers/${reg.provider.id}`);
  check('verify → live', det2.verified === 'verified');
  const edited = await call('PUT', `/admin/providers/${reg.provider.id}`, { name: 'Ramesh K Edited', phone: '9812345671' });
  check('admin edit', edited.ok === true);
  const bulk = await call('POST', '/admin/providers/bulk', {
    csv: 'name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about\nTest Pandey,Test Services,plumber,tap-leak,9822211100,9822211100,Civil Lines, Civil Lines,bhopal,Madhya Pradesh,462001,,,Bulk import row\nBad Row,X,notacat,,1,,x,y,nowhere,,,,"',
  });
  check('bulk csv added 1', bulk.added === 1, JSON.stringify(bulk));
  check('bulk csv skipped bad row', bulk.skipped.length === 1);
  const catsAdmin = await call('GET', '/admin/categories');
  await call('POST', '/admin/categories', { id: 'Painter2', name_en: 'Painter2', name_hi: 'पेंटर2', icon: 'brush' });
  const catsAdmin2 = await call('GET', '/admin/categories');
  check('category add', catsAdmin2.length === catsAdmin.length + 1);
  await call('PUT', '/admin/categories/painter2', { active: false });
  const catsPub = await call('GET', '/categories');
  check('deactivated hidden from grid', !catsPub.find((c) => c.id === 'painter2'));
  await call('DELETE', '/admin/categories/painter2');
  await call('POST', '/reports', { providerId: pid, reason: 'Spam listing' });
  const reps = await call('GET', '/admin/reports');
  check('reports queue', reps.length === 1 && reps[0].provider);
  await call('POST', `/admin/reports/${reps[0].id}/resolve`);
  const reps2 = await call('GET', '/admin/reports');
  check('report resolved', reps2[0].status === 'resolved');

  console.log('— security —');
  API.token = 'bogus'; API.user = null;
  try { await call('GET', '/admin/stats'); check('bad token → 401', false); }
  catch (e) { check('bad token → 401', e.status === 401); }
  await call('POST', '/auth/request-otp', { phone: '9876543210' });
  const regUser = await call('POST', '/auth/verify-otp', { phone: '9876543210', code: '123456' });
  API.token = regUser.token; API.user = regUser.user;
  try { await call('GET', '/admin/stats'); check('non-admin → 403', false); }
  catch (e) { check('non-admin → 403', e.status === 403); }
  try { await call('GET', `/providers/${seedPendingId}?preview=1`); check('stranger preview → 403', false); }
  catch (e) { check('stranger preview → 403', e.status === 403); }
  try { await call('GET', `/providers/${seedPendingId}`); check('anon view of unverified → 404', false); }
  catch (e) { check('anon view of unverified → 404', e.status === 404); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
````

## 📄 `mobile/pubspec.yaml`

````yaml
name: labors_near_me
description: "Labors Near Me — लेबर्स नियर मी. Find trusted workers near you."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0                 # REST client (same contract as web/js/api.js)
  geolocator: ^12.0.0          # GPS "near me"
  url_launcher: ^6.3.0         # tel: · wa.me · google maps directions
  shared_preferences: ^2.2.0   # token / lang / city / favorites cache

dev_dependencies:
  flutter_lints: ^4.0.0
  flutter_launcher_icons: ^0.13.1

# App icon → launcher icons for Android + iOS (run: dart run flutter_launcher_icons)
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon.png"
  remove_alpha_ios: true

flutter:
  uses-material-design: true
  assets:
    - assets/icon.png
````

## 📄 `mobile/lib/main.dart`

````dart
// main.dart — Labors Near Me mobile app (Android / iOS).
// Bilingual (EN/हिंदी), orange brand, works against the same REST API as the web PWA.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/api_client.dart';
import 'core/i18n.dart';
import 'screens/home_screen.dart';

final ValueNotifier<String> cityNotifier = ValueNotifier<String>('indore');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  langNotifier.value = prefs.getString('lnm_lang') ?? 'en';
  cityNotifier.value = prefs.getString('lnm_city') ?? 'indore';
  ApiClient.token = prefs.getString('lnm_token');
  ApiClient.userName = prefs.getString('lnm_user_name');
  runApp(const LaborsApp());
}

class LaborsApp extends StatelessWidget {
  const LaborsApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Whole app rebuilds when the language changes.
    return ValueListenableBuilder<String>(
      valueListenable: langNotifier,
      builder: (context, _, __) => MaterialApp(
        title: 'Labors Near Me',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFFF97316),
            primary: const Color(0xFFF97316),
            secondary: const Color(0xFFF59E0B),
          ),
          scaffoldBackgroundColor: const Color(0xFFFAFAF9),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFFF97316),
            foregroundColor: Colors.white,
            elevation: 0,
            centerTitle: false,
          ),
          fontFamilyFallback: const ['Noto Sans Devanagari', 'Nirmala UI', 'sans-serif'],
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE7E5E4)),
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
````

## 📄 `mobile/lib/core/api_client.dart`

````dart
// api_client.dart — thin REST client. SAME endpoint contract as web/js/api.js
// (docs/ARCHITECTURE.md §6).
//
// ▶ HOW TO POINT THE APP AT YOUR SERVER (1 line!):
//   Replace the defaultValue below with your deployed API URL (e.g. Render),
//   OR pass --dart-define=API_BASE=https://your-api.onrender.com at build time.
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://YOUR-API-URL.onrender.com', // ← replace with your URL
  );
  static String? token;       // set after OTP login
  static String? userName;    // cached display name

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static Future<void> saveSession(String tok, String name) async {
    token = tok;
    userName = name;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lnm_token', tok);
    await prefs.setString('lnm_user_name', name);
  }

  static Future<void> clearSession() async {
    token = null;
    userName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('lnm_token');
    await prefs.remove('lnm_user_name');
  }

  static Future<dynamic> get(String path, [Map<String, String>? query]) async {
    final uri = Uri.parse('$apiBase/api$path').replace(queryParameters: query);
    final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .post(Uri.parse('$apiBase/api$path'), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    final res = await http
        .put(Uri.parse('$apiBase/api$path'), headers: _headers, body: jsonEncode(body ?? {}))
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http
        .delete(Uri.parse('$apiBase/api$path'), headers: _headers)
        .timeout(const Duration(seconds: 20));
    return _decode(res);
  }

  static dynamic _decode(http.Response res) {
    dynamic json;
    try {
      json = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      json = {};
    }
    if (res.statusCode >= 400) {
      if (res.statusCode == 401) clearSession();
      throw ApiException(json is Map ? (json['error'] ?? 'error') : 'error', res.statusCode,
          hint: json is Map ? json['hint'] : null);
    }
    return json;
  }
}

class ApiException implements Exception {
  ApiException(this.code, this.status, {this.hint});
  final String code;
  final int status;
  final String? hint;
  @override
  String toString() => 'ApiException($code)';
}
````

## 📄 `mobile/lib/core/i18n.dart`

````dart
// i18n.dart — bilingual strings (English / हिंदी). Same keys as web/js/i18n.js.
import 'package:flutter/foundation.dart';

/// Global language — rebuilds the whole app on change (watched in main.dart).
final ValueNotifier<String> langNotifier = ValueNotifier<String>('en');

String t(String key) => _dict[langNotifier.value]?[key] ?? _dict['en']?[key] ?? key;

String locName(String en, String hi) => langNotifier.value == 'hi' ? hi : en;

const Map<String, Map<String, String>> _dict = {
  'en': {
    'app_name': 'Labors Near Me',
    'search_hint': 'Search electrician, tailor, plumber…',
    'search_l': 'Search',
    'near_you': 'Workers near you',
    'categories': 'Categories',
    'top_rated': 'Top rated',
    'popular': 'Popular searches',
    'see_all': 'See all',
    'my_location': 'My location',
    'city_l': 'City',
    'login': 'Login',
    'logout': 'Logout',
    'phone': 'Mobile number',
    'otp': 'OTP',
    'otp_sent': 'OTP sent! Use 123456 (demo mode)',
    'verify': 'Verify & Login',
    'google_login': 'Continue with Google',
    'name_l': 'Name',
    'business_name': 'Business name',
    'favorites': 'Favorites',
    'no_fav': 'No favorites yet. Tap ♥ on any worker.',
    'account': 'Account',
    'dashboard': 'My Dashboard',
    'register_provider': 'List Your Services',
    'my_listings': 'My Listings',
    'leads': 'Leads (who contacted)',
    'open': 'Open',
    'closed': 'Closed',
    'open_now': 'Open now',
    'verified': 'Verified',
    'pending': 'Pending approval',
    'rejected': 'Rejected',
    'reviews': 'reviews',
    'write_review': 'Write a review',
    'your_rating': 'Your rating',
    'distance': 'Distance',
    'call': 'Call',
    'whatsapp': 'WhatsApp',
    'directions': 'Directions',
    'about_l': 'About',
    'skills_l': 'Skills',
    'price_l': 'Price hint',
    'address_l2': 'Address',
    'area': 'Area',
    'pincode': 'Pincode',
    'submit': 'Submit',
    'save_changes': 'Save changes',
    'saved_ok': 'Saved ✓',
    'error_gen': 'Something went wrong. Try again.',
    'offline_banner': 'You are offline — showing saved data',
    'sort_by': 'Sort by',
    'sort_distance': 'Nearest',
    'sort_rating': 'Best rating',
    'sort_relevance': 'Best match',
    'filter_l': 'Filters',
    'min_rating': 'Min rating',
    'apply': 'Apply',
    'reset': 'Reset',
    'availability': 'Availability',
    'reg_title': 'Register Your Services',
    'reg_note': 'Admin approve karte hi listing live hogi.',
    'back': 'Back',
    'next': 'Next',
    'done': 'Done',
    'no_results': 'No workers found. Try another search.',
    'loading': 'Loading…',
    'kyc_name': 'Full name (as on ID)',
    'skills_hint': 'Skills (comma separated)',
    'about_hint': 'About your work & experience',
    'price_hint': 'e.g. ₹250 visit',
    'whatsapp_l': 'WhatsApp number',
    'select_city': 'Select city',
    'select_category': 'Select category',
    'demo_note': 'Demo OTP mode: use 123456',
    'welcome': 'Welcome',
    'logged_in_as': 'Logged in as',
    'edit_profile': 'Edit profile',
    'lead_from': 'Lead from',
    'no_leads': 'No leads yet.',
    'no_listings': 'No listings yet. Register your services!',
  },
  'hi': {
    'app_name': 'लेबर्स नियर मी',
    'search_hint': 'इलेक्ट्रीशियन, दर्जी, प्लंबर खोजें…',
    'search_l': 'खोजें',
    'near_you': 'आपके पास के कामगार',
    'categories': 'श्रेणियाँ',
    'top_rated': 'टॉप रेटेड',
    'popular': 'लोकप्रिय खोजें',
    'see_all': 'सभी देखें',
    'my_location': 'मेरी लोकेशन',
    'city_l': 'शहर',
    'login': 'लॉगिन',
    'logout': 'लॉगआउट',
    'phone': 'मोबाइल नंबर',
    'otp': 'OTP',
    'otp_sent': 'OTP भेजा गया! 123456 डालें (demo mode)',
    'verify': 'सत्यापित करें',
    'google_login': 'Google से जारी रखें',
    'name_l': 'नाम',
    'business_name': 'दुकान/काम का नाम',
    'favorites': 'पसंदीदा',
    'no_fav': 'अभी कोई पसंदीदा नहीं — किसी पर ♥ दबाएँ।',
    'account': 'खाता',
    'dashboard': 'मेरा डैशबोर्ड',
    'register_provider': 'अपनी सेवा जोड़ें',
    'my_listings': 'मेरी लिस्टिंग',
    'leads': 'लीड्स (किसने संपर्क किया)',
    'open': 'खुला',
    'closed': 'बंद',
    'open_now': 'अभी खुला',
    'verified': 'सत्यापित',
    'pending': 'अनुमोदन बाकी',
    'rejected': 'अस्वीकृत',
    'reviews': 'समीक्षाएँ',
    'write_review': 'समीक्षा लिखें',
    'your_rating': 'आपकी रेटिंग',
    'distance': 'दूरी',
    'call': 'कॉल',
    'whatsapp': 'व्हाट्सएप',
    'directions': 'रास्ता',
    'about_l': 'परिचय',
    'skills_l': 'हुनर',
    'price_l': 'कीमत',
    'address_l2': 'पता',
    'area': 'इलाका',
    'pincode': 'पिनकोड',
    'submit': 'जमा करें',
    'save_changes': 'सेव करें',
    'saved_ok': 'सेव हो गया ✓',
    'error_gen': 'कुछ गड़बड़ हुई — फिर कोशिश करें।',
    'offline_banner': 'आप offline हैं — सेव डेटा दिख रहा है',
    'sort_by': 'क्रम',
    'sort_distance': 'सबसे नज़दीक',
    'sort_rating': 'बेस्ट रेटिंग',
    'sort_relevance': 'बेस्ट मैच',
    'filter_l': 'फ़िल्टर',
    'min_rating': 'न्यूनतम रेटिंग',
    'apply': 'लागू करें',
    'reset': 'रीसेट',
    'availability': 'उपलब्धता',
    'reg_title': 'अपनी सेवा रजिस्टर करें',
    'reg_note': 'Admin approve करते ही लिस्टिंग live हो जाएगी।',
    'back': 'पीछे',
    'next': 'आगे',
    'done': 'हो गया',
    'no_results': 'कोई कामगार नहीं मिला — दूसरी खोज करें।',
    'loading': 'लोड हो रहा है…',
    'kyc_name': 'पूरा नाम (ID जैसा)',
    'skills_hint': 'हुनर (कॉमा से अलग करें)',
    'about_hint': 'अपने काम और अनुभव के बारे में',
    'price_hint': 'जैसे ₹250 विज़िट',
    'whatsapp_l': 'व्हाट्सएप नंबर',
    'select_city': 'शहर चुनें',
    'select_category': 'श्रेणी चुनें',
    'demo_note': 'Demo OTP mode: 123456 इस्तेमाल करें',
    'welcome': 'स्वागत है',
    'logged_in_as': 'लॉगिन',
    'edit_profile': 'प्रोफ़ाइल बदलें',
    'lead_from': 'लीड',
    'no_leads': 'अभी कोई लीड नहीं।',
    'no_listings': 'अभी कोई लिस्टिंग नहीं — अपनी सेवा रजिस्टर करें!',
  },
};
````

## 📄 `mobile/lib/models.dart`

````dart
// models.dart — JSON models matching the REST API shapes (backend/src/routes/*).
class CategoryModel {
  CategoryModel(this.id, this.nameEn, this.nameHi, this.icon, this.subcategories);
  final String id, nameEn, nameHi, icon;
  final List<Subcategory> subcategories;

  factory CategoryModel.fromJson(Map<String, dynamic> j) => CategoryModel(
        j['id'] ?? '',
        j['name_en'] ?? '',
        j['name_hi'] ?? '',
        j['icon'] ?? 'wrench',
        ((j['subcategories'] ?? []) as List)
            .map((s) => Subcategory(s['id'] ?? '', s['name_en'] ?? '', s['name_hi'] ?? ''))
            .toList(),
      );
}

class Subcategory {
  Subcategory(this.id, this.nameEn, this.nameHi);
  final String id, nameEn, nameHi;
}

class CityModel {
  CityModel(this.id, this.nameEn, this.nameHi, this.state, this.lat, this.lng);
  final String id, nameEn, nameHi, state;
  final double lat, lng;

  factory CityModel.fromJson(Map<String, dynamic> j) => CityModel(
        j['id'] ?? '', j['name_en'] ?? '', j['name_hi'] ?? '', j['state'] ?? '',
        (j['lat'] ?? 0).toDouble(), (j['lng'] ?? 0).toDouble(),
      );
}

class ProviderModel {
  ProviderModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        name = j['name'] ?? '',
        businessName = j['businessName'] ?? '',
        categoryId = j['categoryId'] ?? '',
        categoryNameEn = j['categoryNameEn'] ?? '',
        categoryNameHi = j['categoryNameHi'] ?? '',
        categoryIcon = j['categoryIcon'] ?? 'wrench',
        phone = j['phone'] ?? '',
        whatsapp = j['whatsapp'] ?? j['phone'] ?? '',
        photo = j['photo'],
        about = j['about'] ?? '',
        skills = List<String>.from(j['skills'] ?? []),
        priceHint = j['priceHint'] ?? '',
        addressLine = (j['address'] ?? {})['line1'] ?? '',
        area = (j['address'] ?? {})['area'] ?? '',
        cityId = (j['address'] ?? {})['cityId'] ?? '',
        lat = ((j['location'] ?? {})['lat'] ?? 0).toDouble(),
        lng = ((j['location'] ?? {})['lng'] ?? 0).toDouble(),
        isOpenNow = j['isOpenNow'] ?? true,
        verified = j['verified'] ?? '',
        ratingAvg = (j['ratingAvg'] ?? 0).toDouble(),
        ratingCount = j['ratingCount'] ?? 0,
        distance = j['distance'],
        distanceText = j['distanceText'] ?? '';

  final String id, name, businessName, categoryId, categoryNameEn, categoryNameHi, categoryIcon;
  final String phone, whatsapp, about, priceHint, addressLine, area, cityId;
  final String? photo;
  final List<String> skills;
  final double lat, lng, ratingAvg;
  final bool isOpenNow;
  final String verified;
  final int ratingCount;
  final dynamic distance;
  final String distanceText;
}

class ReviewModel {
  ReviewModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        userName = j['userName'] ?? '',
        rating = (j['rating'] ?? 0).toDouble(),
        text = j['text'] ?? '',
        createdAt = j['createdAt'] ?? '';
  final String id, userName, text, createdAt;
  final double rating;
}

class LeadModel {
  LeadModel.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        userName = j['userName'] ?? '',
        type = j['type'] ?? 'call',
        createdAt = j['createdAt'] ?? '';
  final String id, userName, type, createdAt;
}

class MyListing {
  MyListing.fromJson(Map<String, dynamic> j)
      : id = j['id'] ?? '',
        name = j['name'] ?? '',
        businessName = j['businessName'] ?? '',
        categoryId = j['categoryId'] ?? '',
        verified = j['verified'] ?? '',
        ratingAvg = (j['ratingAvg'] ?? 0).toDouble(),
        ratingCount = j['ratingCount'] ?? 0,
        manualOpen = (j['availability'] ?? {})['manualOpen'] ?? true,
        leadCount = j['leadCount'] ?? 0,
        phone = j['phone'] ?? '';
  final String id, name, businessName, categoryId, verified, phone;
  final double ratingAvg;
  final int ratingCount, leadCount;
  bool manualOpen; // mutable — availability toggle updates it in-place
}
````

## 📄 `mobile/lib/screens/home_screen.dart`

````dart
// home_screen.dart — app shell: bottom navigation (Home · Search · Favorites · Account)
// + Home body: city picker, search box, category grid, top-rated, popular chips.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../main.dart';
import '../models.dart';
import 'account_screen.dart';
import 'detail_screen.dart';
import 'favorites_screen.dart';
import 'search_screen.dart';

/// Search tab input — Home taps a category / types a query → Search tab runs it.
final ValueNotifier<Map<String, String>> searchParams =
    ValueNotifier<Map<String, String>>(<String, String>{});

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          HomeBody(onOpenSearch: (params) {
            searchParams.value = params;
            setState(() => _tab = 1);
          }),
          const SearchBody(),
          const FavoritesBody(),
          const AccountBody(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFFB45309),
        unselectedItemColor: const Color(0xFF57534E),
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.home), label: t('app_name')),
          BottomNavigationBarItem(icon: const Icon(Icons.search), label: t('search_l')),
          BottomNavigationBarItem(icon: const Icon(Icons.favorite), label: t('favorites')),
          BottomNavigationBarItem(icon: const Icon(Icons.person), label: t('account')),
        ],
      ),
    );
  }
}

class HomeBody extends StatefulWidget {
  const HomeBody({super.key, required this.onOpenSearch});
  final void Function(Map<String, String>) onOpenSearch;
  @override
  State<HomeBody> createState() => _HomeBodyState();
}

class _HomeBodyState extends State<HomeBody> {
  List<CategoryModel> cats = [];
  List<CityModel> cities = [];
  List<ProviderModel> topRated = [];
  List<String> popular = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/categories'),
        ApiClient.get('/cities'),
        ApiClient.get('/providers/nearby', {'sort': 'rating', 'limit': '6'}),
        ApiClient.get('/searches/popular'),
      ]);
      cats = (results[0] as List).map((c) => CategoryModel.fromJson(c)).toList();
      cities = (results[1] as List).map((c) => CityModel.fromJson(c)).toList();
      topRated = ((results[2] as Map)['results'] as List)
          .map((p) => ProviderModel.fromJson(p))
          .toList();
      popular = List<String>.from(results[3] as List);
    } catch (_) {
      // offline / server down — keep empty lists, UI still renders
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _pickCity() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.7,
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(t('select_city'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ),
            Expanded(
              child: ListView(
                children: cities
                    .map((c) => ListTile(
                          leading: const Icon(Icons.location_city),
                          title: Text(locName(c.nameEn, c.nameHi)),
                          subtitle: Text(c.state, style: const TextStyle(fontSize: 12)),
                          onTap: () => Navigator.pop(ctx, c.id),
                        ))
                    .toList(),
              ),
            ),
          ]),
        ),
      ),
    );
    if (selected != null) {
      cityNotifier.value = selected;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('lnm_city', selected);
      if (mounted) setState(() {});
    }
  }

  void _toggleLang() {
    langNotifier.value = langNotifier.value == 'hi' ? 'en' : 'hi';
    SharedPreferences.getInstance()
        .then((p) => p.setString('lnm_lang', langNotifier.value));
  }

  String get _cityLabel {
    final c = cities.where((x) => x.id == cityNotifier.value).toList();
    return c.isEmpty ? cityNotifier.value : locName(c.first.nameEn, c.first.nameHi);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(children: [
        // ── Brand header ────────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
                colors: [Color(0xFFFB923C), Color(0xFFF97316), Color(0xFFEA580C)],
                begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset('assets/icon.png', width: 36, height: 36,
                    errorBuilder: (_, __, ___) =>
                        const Icon(Icons.location_pin, color: Colors.white, size: 32)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(t('app_name'),
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800, fontSize: 19)),
              ),
              // city chip
              ActionChip(
                onPressed: _pickCity,
                backgroundColor: Colors.white24,
                label: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.location_on, color: Colors.white, size: 16),
                  const SizedBox(width: 4),
                  Text(_cityLabel,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ]),
              ),
              const SizedBox(width: 6),
              // language toggle
              GestureDetector(
                onTap: _toggleLang,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                      border: Border.all(color: Colors.white70),
                      borderRadius: BorderRadius.circular(999)),
                  child: Text(langNotifier.value == 'hi' ? 'EN' : 'हि',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ),
              ),
            ]),
            const SizedBox(height: 14),
            // search box
            GestureDetector(
              onTap: () => widget.onOpenSearch(const {}),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  const Icon(Icons.search, color: Color(0xFF78716C)),
                  const SizedBox(width: 8),
                  Text(t('search_hint'), style: const TextStyle(color: Color(0xFF78716C))),
                ]),
              ),
            ),
          ]),
        ),
        // ── Body ────────────────────────────────────────────────────────
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(padding: const EdgeInsets.all(14), children: [
              Text(t('categories'),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              if (loading)
                const Center(
                    child: Padding(
                        padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
              GridView.count(
                crossAxisCount: 4,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                children: cats
                    .map((c) => GestureDetector(
                          onTap: () => widget
                              .onOpenSearch({'category': c.id, 'categoryName': locName(c.nameEn, c.nameHi)}),
                          child: Column(children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                  color: catColor(c.id).withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(14)),
                              child: Icon(catIcon(c.icon), color: catColor(c.id), size: 28),
                            ),
                            const SizedBox(height: 4),
                            Text(locName(c.nameEn, c.nameHi),
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                          ]),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 18),
              Row(children: [
                Expanded(
                    child: Text(t('top_rated'),
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
                TextButton(
                    onPressed: () => widget.onOpenSearch({'sort': 'rating'}),
                    child: Text(t('see_all'))),
              ]),
              ...topRated.map((p) => _workerCard(p)),
              const SizedBox(height: 10),
              if (popular.isNotEmpty) ...[
                Text(t('popular'),
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: popular
                      .map((q) => ActionChip(
                            label: Text(q),
                            onPressed: () => widget.onOpenSearch({'q': q}),
                          ))
                      .toList(),
                ),
              ],
              const SizedBox(height: 24),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _workerCard(ProviderModel p) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: monogramAvatar(p.name, p.categoryId, photo: p.photo),
          title: Text(p.businessName, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${locName(p.categoryNameEn, p.categoryNameHi)} · ${p.distanceText}',
                style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 2),
            starsRow(p.ratingAvg, p.ratingCount),
          ]),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.push(
              context, MaterialPageRoute(builder: (_) => DetailScreen(providerId: p.id))),
        ),
      );
}
````

## 📄 `mobile/lib/screens/search_screen.dart`

````dart
// search_screen.dart — search results with filters (open now, min rating) + sort.
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../main.dart';
import '../models.dart';
import 'detail_screen.dart';
import 'home_screen.dart';

class SearchBody extends StatefulWidget {
  const SearchBody({super.key});
  @override
  State<SearchBody> createState() => _SearchBodyState();
}

class _SearchBodyState extends State<SearchBody> {
  final _controller = TextEditingController();
  String category = '';
  String categoryName = '';
  String sort = 'distance';
  bool openNow = false;
  double minRating = 0;
  double? gpsLat, gpsLng;
  bool loading = false;
  List<ProviderModel> results = [];

  @override
  void initState() {
    super.initState();
    searchParams.addListener(_onParams);
    _onParams();
  }

  void _onParams() {
    final p = searchParams.value;
    if (p.containsKey('q')) _controller.text = p['q'] ?? '';
    category = p['category'] ?? category;
    categoryName = p['categoryName'] ?? categoryName;
    sort = p['sort'] ?? sort;
    _search();
  }

  @override
  void dispose() {
    searchParams.removeListener(_onParams);
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    setState(() => loading = true);
    try {
      final q = <String, String>{
        'sort': sort,
        'limit': '50',
        if (_controller.text.trim().isNotEmpty) 'q': _controller.text.trim(),
        if (category.isNotEmpty) 'category': category,
        if (openNow) 'openNow': '1',
        if (minRating > 0) 'minRating': minRating.toStringAsFixed(0),
        if (gpsLat != null) 'lat': gpsLat.toString(),
        if (gpsLng != null) 'lng': gpsLng.toString(),
        if (gpsLat == null) 'cityId': cityNotifier.value,
      };
      final d = await ApiClient.get('/providers/nearby', q);
      results = ((d as Map)['results'] as List).map((p) => ProviderModel.fromJson(p)).toList();
    } catch (_) {
      results = [];
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _useGps() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition();
      gpsLat = pos.latitude;
      gpsLng = pos.longitude;
      _search();
    } catch (_) {
      // GPS unavailable — fall back to city search silently
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _search(),
                decoration: InputDecoration(
                  hintText: t('search_hint'),
                  prefixIcon: const Icon(Icons.search),
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
                onPressed: _search,
                style: FilledButton.styleFrom(minimumSize: const Size(64, 46)),
                child: Text(t('search_l'))),
          ]),
        ),
        // filter row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(children: [
            if (categoryName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: InputChip(
                  label: Text(categoryName),
                  onDeleted: () => setState(() {
                    category = '';
                    categoryName = '';
                    _search();
                  }),
                ),
              ),
            FilterChip(
              label: Text(t('open_now')),
              selected: openNow,
              onSelected: (v) => setState(() { openNow = v; _search(); }),
            ),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: sort,
              underline: const SizedBox.shrink(),
              items: [
                DropdownMenuItem(value: 'distance', child: Text(t('sort_distance'))),
                DropdownMenuItem(value: 'rating', child: Text(t('sort_rating'))),
                DropdownMenuItem(value: 'relevance', child: Text(t('sort_relevance'))),
              ],
              onChanged: (v) => setState(() { sort = v ?? 'distance'; _search(); }),
            ),
            const SizedBox(width: 8),
            DropdownButton<double>(
              value: minRating,
              underline: const SizedBox.shrink(),
              items: [0.0, 3.0, 4.0, 4.5]
                  .map((r) => DropdownMenuItem(
                      value: r,
                      child: Text(r == 0.0 ? t('min_rating') : '★ ${r.toStringAsFixed(r == r.roundToDouble() ? 0 : 1)}+',
                          style: const TextStyle(fontSize: 13))))
                  .toList(),
              onChanged: (v) => setState(() { minRating = v ?? 0; _search(); }),
            ),
            const SizedBox(width: 8),
            ActionChip(
              avatar: const Icon(Icons.my_location, size: 18),
              label: Text(t('my_location')),
              onPressed: _useGps,
            ),
          ]),
        ),
        const SizedBox(height: 6),
        Expanded(
          child: loading
              ? const Center(child: CircularProgressIndicator())
              : results.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(t('no_results'),
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF78716C))),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      itemCount: results.length,
                      itemBuilder: (_, i) => _resultCard(results[i]),
                    ),
        ),
      ]),
    );
  }

  Widget _resultCard(ProviderModel p) => Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: monogramAvatar(p.name, p.categoryId, photo: p.photo),
          title: Row(children: [
            Expanded(
                child: Text(p.businessName,
                    style: const TextStyle(fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
            if (p.verified == 'verified')
              const Icon(Icons.verified, color: Color(0xFF059669), size: 16),
          ]),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${locName(p.categoryNameEn, p.categoryNameHi)} · ${p.area}',
                style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Row(children: [
              starsRow(p.ratingAvg, p.ratingCount),
              const Spacer(),
              openBadge(p.isOpenNow),
              const SizedBox(width: 6),
              Text(p.distanceText,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
            ]),
          ]),
          onTap: () => Navigator.push(
              context, MaterialPageRoute(builder: (_) => DetailScreen(providerId: p.id))),
        ),
      );
}
````

## 📄 `mobile/lib/screens/detail_screen.dart`

````dart
// detail_screen.dart — full provider profile: call / WhatsApp / directions,
// favourite, reviews list + review form (rate-after-lead flow from the web app).
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../models.dart';

class DetailScreen extends StatefulWidget {
  const DetailScreen({super.key, required this.providerId});
  final String providerId;
  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  ProviderModel? p;
  List<ReviewModel> reviews = [];
  bool fav = false;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await ApiClient.get('/providers/${widget.providerId}');
      p = ProviderModel.fromJson(d as Map<String, dynamic>);
      final rs = await ApiClient.get('/providers/${widget.providerId}/reviews');
      reviews = (rs as List).map((r) => ReviewModel.fromJson(r)).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _contact(String type) async {
    if (p == null) return;
    final provider = p!;
    // log the lead (fire & forget — provider dashboard feed)
    if (ApiClient.token != null) {
      ApiClient.post('/leads', {'providerId': provider.id, 'type': type}).catchError((_) => null);
    }
    Uri uri;
    final text = Uri.encodeComponent(
        'Namaste! I found you on Labors Near Me (${provider.businessName}).');
    switch (type) {
      case 'whatsapp':
        uri = Uri.parse('https://wa.me/91${provider.whatsapp}?text=$text');
        break;
      case 'directions':
        uri = Uri.parse(
            'https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}');
        break;
      default:
        uri = Uri.parse('tel:+91${provider.phone}');
    }
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
  }

  Future<void> _toggleFav() async {
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    try {
      if (fav) {
        await ApiClient.delete('/favorites/${widget.providerId}');
      } else {
        await ApiClient.post('/favorites/${widget.providerId}');
      }
      if (mounted) setState(() => fav = !fav);
    } catch (_) {}
  }

  Future<void> _writeReview() async {
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    double rating = 5;
    final textCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(t('write_review')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) => IconButton(
                    onPressed: () => setLocal(() => rating = (i + 1).toDouble()),
                    icon: Icon(Icons.star,
                        color: i < rating ? const Color(0xFFF59E0B) : const Color(0xFFE7E5E4),
                        size: 32),
                  )),
            ),
            TextField(
              controller: textCtrl,
              maxLines: 3,
              decoration: InputDecoration(hintText: t('write_review')),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('back'))),
            FilledButton(
              onPressed: () async {
                try {
                  await ApiClient.post('/providers/${widget.providerId}/reviews',
                      {'rating': rating, 'text': textCtrl.text});
                } catch (_) {}
                if (ctx.mounted) Navigator.pop(ctx);
                _load();
              },
              child: Text(t('submit')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading || p == null) {
      return Scaffold(
          appBar: AppBar(title: Text(t('app_name'))),
          body: const Center(child: CircularProgressIndicator()));
    }
    final w = p!;
    return Scaffold(
      appBar: AppBar(
        title: Text(w.businessName, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            onPressed: _toggleFav,
            icon: Icon(fav ? Icons.favorite : Icons.favorite_border),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // header card
        Row(children: [
          monogramAvatar(w.name, w.categoryId, photo: w.photo, size: 72),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(w.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Row(children: [
                if (w.verified == 'verified') ...[
                  const Icon(Icons.verified, color: Color(0xFF059669), size: 16),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(locName(w.categoryNameEn, w.categoryNameHi),
                      style: const TextStyle(color: Color(0xFF57534E))),
                ),
              ]),
              const SizedBox(height: 4),
              starsRow(w.ratingAvg, w.ratingCount),
            ]),
          ),
          openBadge(w.isOpenNow),
        ]),
        const SizedBox(height: 16),
        // contact buttons
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('call'),
              icon: const Icon(Icons.call),
              label: Text(t('call')),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('whatsapp'),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
              icon: const Icon(Icons.chat),
              label: Text(t('whatsapp')),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: () => _contact('directions'),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
              icon: const Icon(Icons.directions),
              label: Text(t('directions')),
            ),
          ),
        ]),
        const SizedBox(height: 16),
        // info tiles
        _infoTile(Icons.phone, w.phone),
        _infoTile(Icons.location_on, '${w.addressLine}${w.area.isNotEmpty ? ', ${w.area}' : ''}'),
        if (w.distanceText.isNotEmpty) _infoTile(Icons.near_me, w.distanceText),
        if (w.priceHint.isNotEmpty) _infoTile(Icons.currency_rupee, w.priceHint),
        if (w.about.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(t('about_l'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 4),
          Text(w.about, style: const TextStyle(color: Color(0xFF57534E))),
        ],
        if (w.skills.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: w.skills
                .map((s) => Chip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      backgroundColor: const Color(0xFFFEF3C7),
                    ))
                .toList(),
          ),
        ],
        const SizedBox(height: 20),
        // reviews
        Row(children: [
          Expanded(
              child: Text('${t('reviews')} (${reviews.length})',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
          TextButton.icon(
            onPressed: _writeReview,
            icon: const Icon(Icons.edit, size: 18),
            label: Text(t('write_review')),
          ),
        ]),
        ...reviews.map((r) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: monogramAvatar(r.userName, w.categoryId, size: 40),
                title: Row(children: [
                  Expanded(
                      child: Text(r.userName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14))),
                  Text('★' * r.rating.round(),
                      style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 13)),
                ]),
                subtitle: Text(r.text),
              ),
            )),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget _infoTile(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(children: [
          Icon(icon, size: 18, color: const Color(0xFFF97316)),
          const SizedBox(width: 10),
          Expanded(child: Text(text)),
        ]),
      );
}
````

## 📄 `mobile/lib/screens/login_screen.dart`

````dart
// login_screen.dart — phone OTP (demo OTP 123456 until MSG91 is configured on the API).
import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/i18n.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phone = TextEditingController();
  final otp = TextEditingController(text: '123456');
  final name = TextEditingController();
  bool step2 = false;

  Future<void> _go() async {
    try {
      if (!step2) {
        await ApiClient.post('/auth/request-otp', {'phone': phone.text});
        setState(() => step2 = true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP: 123456 (demo)')));
      } else {
        final r = await ApiClient.post('/auth/verify-otp', {
          'phone': phone.text, 'code': otp.text, 'name': name.text,
        });
        ApiClient.token = r['token'];
        Session.token = r['token'];
        Session.userName = r['user']?['name'];
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(I18n.t('login'))),
      body: ListView(padding: const EdgeInsets.all(18), children: [
        Text(I18n.t('demo_note'), style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        TextField(controller: phone, keyboardType: TextInputType.phone, maxLength: 10,
          decoration: InputDecoration(labelText: I18n.t('phone'), prefixText: '+91 ')),
        if (step2) ...[
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name / नाम')),
          const SizedBox(height: 12),
          TextField(controller: otp, keyboardType: TextInputType.number, maxLength: 6,
            decoration: InputDecoration(labelText: I18n.t('otp_ph'))),
        ],
        const SizedBox(height: 16),
        FilledButton(onPressed: _go, child: Text(step2 ? I18n.t('verify') : I18n.t('login'))),
      ]),
    );
  }
}
````

## 📄 `mobile/lib/screens/register_screen.dart`

````dart
// register_screen.dart — provider self-registration (goes to admin verification queue).
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../main.dart';
import '../models.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _business = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _area = TextEditingController();
  final _address = TextEditingController();
  final _pincode = TextEditingController();
  final _about = TextEditingController();
  final _skills = TextEditingController();
  final _price = TextEditingController();
  final _kyc = TextEditingController();

  List<CategoryModel> cats = [];
  List<CityModel> cities = [];
  String? categoryId;
  String? subcategory;
  String? cityId;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    cityId = cityNotifier.value;
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/categories'),
        ApiClient.get('/cities'),
      ]);
      cats = (results[0] as List).map((c) => CategoryModel.fromJson(c)).toList();
      cities = (results[1] as List).map((c) => CityModel.fromJson(c)).toList();
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (ApiClient.token == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(t('login'))));
      return;
    }
    setState(() => busy = true);
    try {
      final r = await ApiClient.post('/providers/register', {
        'name': _name.text.trim(),
        'businessName': _business.text.trim().isEmpty ? _name.text.trim() : _business.text.trim(),
        'categoryId': categoryId,
        'subcategory': subcategory,
        'phone': _phone.text.trim(),
        'whatsapp': _whatsapp.text.trim().isEmpty ? _phone.text.trim() : _whatsapp.text.trim(),
        'cityId': cityId,
        'area': _area.text.trim(),
        'address': _address.text.trim(),
        'pincode': _pincode.text.trim(),
        'about': _about.text.trim(),
        'skills': _skills.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
        'priceHint': _price.text.trim(),
        'kycName': _kyc.text.trim(),
      });
      if (mounted) {
        await showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('✓'),
            content: Text((r as Map)['message'] ?? t('reg_note')),
            actions: [
              FilledButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: Text(t('done')),
              ),
            ],
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(t('error_gen'))));
      }
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final subs = cats.where((c) => c.id == categoryId).toList();
    final subList = subs.isEmpty ? <Subcategory>[] : subs.first.subcategories;
    return Scaffold(
      appBar: AppBar(title: Text(t('reg_title'))),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text(t('reg_note'),
              style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          TextFormField(
            controller: _name,
            decoration: InputDecoration(labelText: '${t('name_l')} *'),
            validator: (v) => (v == null || v.trim().isEmpty) ? t('name_l') : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _business,
            decoration: InputDecoration(labelText: t('business_name')),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: categoryId,
            decoration: InputDecoration(labelText: '${t('select_category')} *'),
            items: cats
                .map((c) => DropdownMenuItem(
                    value: c.id,
                    child: Text(locName(c.nameEn, c.nameHi),
                        overflow: TextOverflow.ellipsis)))
                .toList(),
            onChanged: (v) => setState(() {
              categoryId = v;
              subcategory = null;
            }),
            validator: (v) => v == null ? t('select_category') : null,
          ),
          const SizedBox(height: 12),
          if (subList.isNotEmpty) ...[
            DropdownButtonFormField<String>(
              value: subcategory,
              decoration: InputDecoration(labelText: t('select_category')),
              items: subList
                  .map((s) => DropdownMenuItem(
                      value: s.id, child: Text(locName(s.nameEn, s.nameHi))))
                  .toList(),
              onChanged: (v) => setState(() => subcategory = v),
            ),
            const SizedBox(height: 12),
          ],
          Row(children: [
            Expanded(
              child: TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(labelText: '${t('phone')} *', counterText: ''),
                validator: (v) =>
                    (v == null || v.replaceAll(RegExp(r'\D'), '').length != 10) ? t('phone') : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _whatsapp,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(labelText: t('whatsapp_l'), counterText: ''),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: cityId,
            decoration: InputDecoration(labelText: '${t('select_city')} *'),
            items: cities
                .map((c) => DropdownMenuItem(
                    value: c.id, child: Text(locName(c.nameEn, c.nameHi))))
                .toList(),
            onChanged: (v) => setState(() => cityId = v),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _area,
            decoration: InputDecoration(labelText: t('area')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _address,
            decoration: InputDecoration(labelText: t('address_l2')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _pincode,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: t('pincode')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _about,
            maxLines: 3,
            decoration: InputDecoration(labelText: t('about_l'), hintText: t('about_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _skills,
            decoration: InputDecoration(labelText: t('skills_l'), hintText: t('skills_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _price,
            decoration: InputDecoration(labelText: t('price_l'), hintText: t('price_hint')),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _kyc,
            decoration: InputDecoration(labelText: t('kyc_name')),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: busy ? null : _submit,
            child: busy
                ? const SizedBox(
                    width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(t('submit')),
          ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }
}
````

## 📄 `mobile/lib/screens/dashboard_screen.dart`

````dart
// dashboard_screen.dart — provider dashboard: my listings (status, availability
// toggle, edit profile), leads feed (who called / WhatsApp'd me).
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/i18n.dart';
import '../core/widgets.dart';
import '../models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<MyListing> listings = [];
  List<LeadModel> leads = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/me/providers'),
        ApiClient.get('/me/leads'),
      ]);
      listings = (results[0] as List).map((j) => MyListing.fromJson(j)).toList();
      leads = (results[1] as List).map((j) => LeadModel.fromJson(j)).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _toggleOpen(MyListing l) async {
    try {
      final r = await ApiClient.post('/providers/${l.id}/availability', {'open': !l.manualOpen});
      setState(() => l.manualOpen = (r as Map)['manualOpen'] ?? !l.manualOpen);
    } catch (_) {}
  }

  Future<void> _edit(MyListing l) async {
    final name = TextEditingController(text: l.name);
    final business = TextEditingController(text: l.businessName);
    final phone = TextEditingController(text: l.phone);
    final price = TextEditingController();
    final about = TextEditingController();
    // fetch full profile for edit (PUT accepts partial body)
    try {
      final d = await ApiClient.get('/providers/${l.id}?preview=1') as Map<String, dynamic>;
      price.text = d['priceHint'] ?? '';
      about.text = d['about'] ?? '';
    } catch (_) {}
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(t('edit_profile')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: t('name_l'))),
            const SizedBox(height: 10),
            TextField(
                controller: business,
                decoration: InputDecoration(labelText: t('business_name'))),
            const SizedBox(height: 10),
            TextField(
                controller: phone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: t('phone'))),
            const SizedBox(height: 10),
            TextField(controller: price, decoration: InputDecoration(labelText: t('price_l'))),
            const SizedBox(height: 10),
            TextField(
                controller: about,
                maxLines: 2,
                decoration: InputDecoration(labelText: t('about_l'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('back'))),
          FilledButton(
            onPressed: () async {
              try {
                await ApiClient.put('/providers/${l.id}', {
                  'name': name.text.trim(),
                  'businessName': business.text.trim(),
                  'phone': phone.text.trim(),
                  'priceHint': price.text.trim(),
                  'about': about.text.trim(),
                });
              } catch (_) {}
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(SnackBar(content: Text(t('saved_ok'))));
              }
              _load();
            },
            child: Text(t('save_changes')),
          ),
        ],
      ),
    );
  }

  String _timeAgo(String iso) {
    try {
      final d = DateTime.now().difference(DateTime.parse(iso).toLocal());
      if (d.inMinutes < 60) return '${d.inMinutes}m';
      if (d.inHours < 24) return '${d.inHours}h';
      return '${d.inDays}d';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('dashboard')),
          bottom: TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: t('my_listings')),
              Tab(text: t('leads')),
            ],
          ),
        ),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(children: [
                // ── My listings ─────────────────────────────────────────
                listings.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(t('no_listings'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFF78716C))),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(14),
                          children: listings
                              .map((l) => Card(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14)),
                                    child: Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(children: [
                                            monogramAvatar(l.name, l.categoryId, size: 46),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(l.businessName,
                                                      style: const TextStyle(
                                                          fontWeight: FontWeight.w800)),
                                                  const SizedBox(height: 4),
                                                  Row(children: [
                                                    statusBadge(l.verified),
                                                    const SizedBox(width: 8),
                                                    starsRow(l.ratingAvg, l.ratingCount),
                                                  ]),
                                                ],
                                              ),
                                            ),
                                          ]),
                                          const SizedBox(height: 10),
                                          Row(children: [
                                            Icon(
                                                l.manualOpen
                                                    ? Icons.toggle_on
                                                    : Icons.toggle_off,
                                                color: l.manualOpen
                                                    ? const Color(0xFF059669)
                                                    : const Color(0xFFA8A29E),
                                                size: 30),
                                            Text(l.manualOpen ? t('open') : t('closed'),
                                                style:
                                                    const TextStyle(fontWeight: FontWeight.w700)),
                                            const Spacer(),
                                            Text('${t('leads')}: ${l.leadCount}',
                                                style: const TextStyle(
                                                    color: Color(0xFF57534E), fontSize: 13)),
                                          ]),
                                          const SizedBox(height: 6),
                                          Row(children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: () => _toggleOpen(l),
                                                icon: const Icon(Icons.schedule, size: 18),
                                                label: Text(l.manualOpen ? t('closed') : t('open')),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: FilledButton.icon(
                                                onPressed: () => _edit(l),
                                                icon: const Icon(Icons.edit, size: 18),
                                                label: Text(t('edit_profile')),
                                              ),
                                            ),
                                          ]),
                                        ],
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ),
                      ),
                // ── Leads feed ──────────────────────────────────────────
                leads.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(t('no_leads'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Color(0xFF78716C))),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(14),
                          itemCount: leads.length,
                          itemBuilder: (_, i) {
                            final l = leads[i];
                            final icon = l.type == 'whatsapp'
                                ? Icons.chat
                                : l.type == 'directions'
                                    ? Icons.directions
                                    : Icons.call;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFFFEF3C7),
                                  child: Icon(icon, color: const Color(0xFFB45309)),
                                ),
                                title: Text('${t('lead_from')}: ${l.userName}',
                                    style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text(l.type),
                                trailing: Text(_timeAgo(l.createdAt),
                                    style: const TextStyle(
                                        color: Color(0xFFA8A29E), fontSize: 12)),
                              ),
                            );
                          },
                        ),
                      ),
              ]),
      ),
    );
  }
}
````

## 📄 `mobile/README.md`

````markdown
# Labors Near Me — Flutter Mobile App (Android + iOS)

यह app वही product है जो `web/` PWA में है — native mobile shell में।
Same REST API, same features: search, categories, provider profiles, call/WhatsApp,
favorites, reviews, Hindi/English, provider registration, dashboard.

---

## ☁️ बिना laptop के Build करें (GitHub Actions — RECOMMENDED)

1. पूरा repo GitHub पर push करें
2. **Actions → "Generate Upload Keystore" → Run workflow** — एक बार (नीचे देखें)
3. **Actions → "Build Android (APK + AAB)" → Run workflow**
   - "Backend API URL" में अपना live API डालें (जैसे `https://labors-near-me-xxxx.onrender.com`)
4. 10-15 मिनट बाद artifacts download करें:
   - `app-bundle-play-store/app-release.aab` → **Play Store upload के लिए**
   - `apk-direct-install/*.apk` → सीधे phone में install/share

Play Store पर upload करने की पूरी guide: **`docs/PLAY_STORE_GUIDE_HINDI.md`**

### Keystore (एक बार — ज़रूरी)
Play Store को signed AAB चाहिए। "Generate Upload Keystore" workflow चलाएँ,
artifact download करें, और repo secrets में 4 values डालें
(`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS=upload`, `KEY_PASSWORD`) —
पूरा steps guide के Step 2a में है। **Passwords कहीं सुरक्षित लिखें!**

---

## 💻 Laptop से Build करें (optional)

```bash
cd mobile
flutter pub get
dart run flutter_launcher_icons      # assets/icon.png → launcher icons
flutter create . --platforms android --org in.laborsnearme
flutter build apk --release --split-per-abi
flutter build appbundle --release    # Play Store के लिए
```

**API URL कैसे बदलें:** `lib/core/api_client.dart` में `defaultValue` की जगह अपना URL,
या build करते समय: `flutter build apk --dart-define=API_BASE=https://your-api.onrender.com`

---

## 📁 Structure

```
mobile/
├── pubspec.yaml            — deps: http · geolocator · url_launcher · shared_preferences
├── assets/icon.png         — app icon (launcher icons इसी से बनते हैं)
├── store-assets/           — Play Store graphics (icon 512 + feature graphic 1024x500)
├── scripts/setup_android.py — CI helper: manifest label/permissions + release signing
└── lib/
    ├── main.dart           — app entry, theme (orange brand), language/city state
    ├── models.dart         — JSON models (API contract)
    ├── core/
    │   ├── api_client.dart — REST client (1 line में API URL बदलें)
    │   ├── i18n.dart       — English/हिंदी strings
    │   └── widgets.dart    — avatar, stars, badges, category icons
    └── screens/
        ├── home_screen.dart       — shell + home (categories, city, top rated)
        ├── search_screen.dart     — search + filters + sort + GPS
        ├── detail_screen.dart     — profile + call/WhatsApp/directions + reviews
        ├── favorites_screen.dart  — saved workers
        ├── account_screen.dart    — OTP login + account hub
        ├── register_screen.dart   — provider self-registration
        └── dashboard_screen.dart  — my listings + leads + edit + open/closed
```

## 🔑 Demo logins (jab backend demo mode me ho)
- Admin: `9000000001` / OTP `123456`
- Koi bhi valid number / OTP `123456`

## Apple App Store (baad me)
1. Apple Developer account ($99/year) + Mac ya Codemagic cloud
2. `flutter build ipa` (ya Codemagic workflow) → App Store Connect me upload
3. Feature graphic/icon `store-assets/` me already hai
````

## 📄 `mobile/scripts/setup_android.py`

````python
#!/usr/bin/env python3
# setup_android.py — runs in CI right after `flutter create . --platforms android`.
# Patches the generated Android project:
#   1. App label → "Labors Near Me"
#   2. Permissions: INTERNET + LOCATION (geolocator) + <queries> for tel:/https: (url_launcher)
#   3. Release signing from android/key.properties when keystore secrets exist,
#      otherwise falls back to debug signing (test builds only).
import io, os, re, base64, sys

APP = os.path.join(os.path.dirname(__file__), '..', 'android', 'app')
MANIFEST = os.path.join(APP, 'src', 'main', 'AndroidManifest.xml')

# ── 1. Manifest: label + permissions + queries ───────────────────────────────
with io.open(MANIFEST, encoding='utf-8') as f:
    m = f.read()

m = re.sub(r'android:label="[^"]*"', 'android:label="Labors Near Me"', m, count=1)

if 'android.permission.INTERNET' not in m:
    m = m.replace('<application',
        '''<uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.DIAL" />
            <data android:scheme="tel" />
        </intent>
    </queries>

    <application''', 1)

with io.open(MANIFEST, 'w', encoding='utf-8') as f:
    f.write(m)
print('manifest patched: label + permissions + queries')

# ── 2. Keystore → android/key.properties + android/app/upload-keystore.jks ──
ks_b64 = os.environ.get('KEYSTORE_BASE64', '').strip()
ks_pass = os.environ.get('KEYSTORE_PASSWORD', '').strip()
key_alias = os.environ.get('KEY_ALIAS', 'upload').strip()
key_pass = os.environ.get('KEY_PASSWORD', '').strip()
signed = False

if ks_b64 and ks_pass:
    jks_path = os.path.join(APP, 'upload-keystore.jks')
    with open(jks_path, 'wb') as f:
        f.write(base64.b64decode(ks_b64))
    props = os.path.join(os.path.dirname(APP), 'key.properties')
    with io.open(props, 'w', encoding='utf-8') as f:
        f.write('storePassword=%s\nkeyPassword=%s\nkeyAlias=%s\nstoreFile=upload-keystore.jks\n'
                % (ks_pass, key_pass or ks_pass, key_alias))
    signed = True
    print('keystore written → android/key.properties (release signing ENABLED)')
else:
    print('WARNING: KEYSTORE_BASE64 secret not set — builds will be DEBUG-signed (test only).')
    print('         Run the "Generate Upload Keystore" workflow once to fix this.')

# ── 3. Patch build.gradle (Groovy) or build.gradle.kts (Kotlin DSL) ─────────
def patch_groovy(path):
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    if 'keystoreProperties' in s:
        return True
    props_block = '''def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

'''
    sign_block = '''    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
'''
    idx = s.find('android {')
    if idx == -1:
        return False
    s = s[:idx] + props_block + s[idx:]
    idx = s.find('android {')
    end = s.find('\n', idx)
    s = s[:end + 1] + sign_block + s[end + 1:]
    s = s.replace('signingConfig signingConfigs.debug',
                  "signingConfig keystoreProperties['storeFile'] ? signingConfigs.release : signingConfigs.debug")
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    return True

def patch_kts(path):
    with io.open(path, encoding='utf-8') as f:
        s = f.read()
    if 'keystoreProperties' in s:
        return True
    imports = '''import java.util.Properties
import java.io.FileInputStream

'''
    props_block = '''val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

'''
    sign_block = '''    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties["keyAlias"] as String?
            keyPassword = keystoreProperties["keyPassword"] as String?
            storeFile = if (keystoreProperties.containsKey("storeFile")) file(keystoreProperties["storeFile"] as String) else null
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }
'''
    s = imports + s
    idx = s.find('android {')
    if idx == -1:
        return False
    s = s[:idx] + props_block + s[idx:]
    idx = s.find('android {')
    end = s.find('\n', idx)
    s = s[:end + 1] + sign_block + s[end + 1:]
    s = s.replace('signingConfig = signingConfigs.getByName("debug")',
                  'signingConfig = if (keystoreProperties.containsKey("storeFile")) signingConfigs.getByName("release") else signingConfigs.getByName("debug")')
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(s)
    return True

groovy = os.path.join(APP, 'build.gradle')
kts = os.path.join(APP, 'build.gradle.kts')
if os.path.exists(groovy) and patch_groovy(groovy):
    print('build.gradle patched (Groovy signing config)')
elif os.path.exists(kts) and patch_kts(kts):
    print('build.gradle.kts patched (Kotlin DSL signing config)')
else:
    print('ERROR: no build.gradle(.kts) found in android/app', file=sys.stderr)
    sys.exit(1)

print('setup_android.py done ✅')
````

## 📄 `.github/workflows/build-android.yml`

````yaml
# Build Android (APK + AAB) — runs on GitHub's cloud, no laptop needed!
#
# How to use:
#   1. Push this repo to GitHub → this workflow runs automatically on every push
#   2. Or run manually: Actions tab → "Build Android" → Run workflow
#      (optional: enter your backend API URL)
#   3. Download the artifacts when green:
#        · app-bundle-play-store  → .aab  (upload this to Play Console)
#        · apk-direct-install     → .apk  (share on WhatsApp / install directly)
name: Build Android (APK + AAB)

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      api_base:
        description: "Backend API URL (https://... — leave empty to use the one in api_client.dart)"
        required: false
        default: ""

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          cache: true

      - name: Flutter version
        run: flutter --version

      - name: Prepare project (launcher icons, android/ scaffold, signing, manifest)
        working-directory: mobile
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          flutter pub get
          dart run flutter_launcher_icons || true
          flutter create . --platforms android --org in.laborsnearme --project-name labors_near_me
          python3 scripts/setup_android.py

      - name: Build APK (split per ABI — small downloads)
        working-directory: mobile
        env:
          API_BASE: ${{ inputs.api_base || vars.API_BASE || '' }}
        run: |
          if [ -n "$API_BASE" ]; then
            flutter build apk --release --split-per-abi --dart-define=API_BASE="$API_BASE"
          else
            flutter build apk --release --split-per-abi
          fi

      - name: Build App Bundle (AAB — for Play Store upload)
        working-directory: mobile
        env:
          API_BASE: ${{ inputs.api_base || vars.API_BASE || '' }}
        run: |
          if [ -n "$API_BASE" ]; then
            flutter build appbundle --release --dart-define=API_BASE="$API_BASE"
          else
            flutter build appbundle --release
          fi

      - name: Upload AAB (Play Store artifact)
        uses: actions/upload-artifact@v4
        with:
          name: app-bundle-play-store
          path: mobile/build/app/outputs/bundle/release/app-release.aab
          if-no-files-found: error

      - name: Upload APKs (direct install)
        uses: actions/upload-artifact@v4
        with:
          name: apk-direct-install
          path: mobile/build/app/outputs/flutter-apk/*.apk
          if-no-files-found: error
````

## 📄 `.github/workflows/generate-keystore.yml`

````yaml
# One-time keystore generation (app ka digital signature — Play Store ke liye zaroori).
#
# How to use (10 minutes, fully in the cloud):
#   1. Actions tab → "Generate Upload Keystore" → Run workflow
#      (choose a keystore password + key password — WRITE THEM DOWN safely!)
#   2. When green, download the artifact "upload-keystore"
#   3. Repo → Settings → Secrets and variables → Actions → New repository secret:
#        KEYSTORE_BASE64   = content of keystore.b64 (open in Notepad, copy all)
#        KEYSTORE_PASSWORD = the password you chose
#        KEY_ALIAS         = upload
#        KEY_PASSWORD      = the key password you chose
#   4. Done! Every "Build Android" run now produces a Play-Store-ready signed AAB.
name: Generate Upload Keystore (one-time)

on:
  workflow_dispatch:
    inputs:
      keystore_password:
        description: "Choose a keystore password (remember it! 6+ chars)"
        required: true
      key_password:
        description: "Choose a key password (can be the same)"
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Generate RSA keystore
        run: |
          keytool -genkeypair -v \
            -keystore upload-keystore.jks \
            -alias upload \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -storepass "${{ inputs.keystore_password }}" \
            -keypass "${{ inputs.key_password }}" \
            -dname "CN=Labors Near Me, OU=Mobile App, O=LaborsNearMe, L=Indore, S=Madhya Pradesh, C=IN"
          base64 -w0 upload-keystore.jks > keystore.b64
          {
            echo "## ✅ Keystore generated"
            echo ""
            echo "Download the artifact **upload-keystore** from this run."
            echo ""
            echo "Then add 4 repository secrets (Settings → Secrets → Actions):"
            echo ""
            echo "| Secret | Value |"
            echo "|---|---|"
            echo "| KEYSTORE_BASE64 | full text of keystore.b64 |"
            echo "| KEYSTORE_PASSWORD | the password you chose |"
            echo "| KEY_ALIAS | upload |"
            echo "| KEY_PASSWORD | the key password you chose |"
            echo ""
            echo "⚠️ KEEP THE KEYSTORE + PASSWORDS SAFE — losing them means you can never update the app!"
          } >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v4
        with:
          name: upload-keystore
          path: |
            upload-keystore.jks
            keystore.b64
````

## 📄 `render.yaml`

````yaml
# render.yaml — One-click deploy for Labors Near Me
# Push this repo to GitHub, then go to https://render.com/deploy?repo=YOUR_GITHUB_URL
# Render will read this file and create the service automatically.
services:
  - type: web
    name: labors-near-me
    env: node
    plan: free
    # Root is repo root (contains backend/ + web/)
    buildCommand: cd backend && npm install
    startCommand: node backend/src/server.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      # Optional — add when you have keys (app works without them in demo mode):
      # - key: MSG91_AUTHKEY
      #   sync: false
      # - key: MSG91_SENDER_ID
      #   value: LNMAPP
      # - key: MSG91_TEMPLATE_ID
      #   sync: false
      # - key: FCM_SERVER_KEY
      #   sync: false
      # - key: CLOUDINARY_URL
      #   sync: false
````

## 📄 `README.md`

````markdown
# Labors Near Me — लेबर्स नियर मी 👷

**Hyperlocal service-provider discovery for India.** Find trusted skilled & unskilled workers
near you — electricians, tailors, raj mistris (masons), plumbers, carpenters, painters,
bhandara/catering, safai karamcharis, dry cleaners, engineers, AC repair, drivers —
call or WhatsApp them in one tap.

Works as a **mobile app (installable PWA)** + **website** + **admin panel**, bilingual
**English / हिंदी**, built for low-bandwidth tier-2/3 networks.

---

## ▶ Quick start

```bash
cd backend
npm install       # first time only (express + leaflet)
npm start         # → http://localhost:3000
```

Open **http://localhost:3000** — that's the whole product:

| Screen | URL | Notes |
|---|---|---|
| App / Website (PWA) | `/` | Home, search, map, provider profiles |
| Install to phone | open URL on Android/iOS → browser menu → **Install app / Add to Home Screen** | shareable as a link on WhatsApp |
| Provider registration | `/#/register` | 3-step wizard |
| Provider dashboard | `/#/dashboard` | leads + availability toggle |
| **Admin panel** | `/#/admin` | verification queue, bulk CSV, categories, analytics |

### Demo logins (demo OTP mode — no real SMS is sent)

| Role | Mobile | OTP |
|---|---|---|
| **Admin** | `9000000001` | `123456` |
| Demo seeker | `9000000002` | `123456` |
| Any new user | any valid 10-digit (6–9…) | `123456` |

Seed data: **16 categories · 10 cities · 93 providers · 39 reviews** (pan-India: Indore, Bhopal,
Jaipur, Pune, Lucknow, Patna, Nagpur, Surat, Ahmedabad, Varanasi).

## 📱 Download & Use on Mobile (No server, no install!)

**`LaborsNearMe.html`** — पूरा app एक single file में (~500 KB)। बिना internet/server के चलता है:

1. `LaborsNearMe.html` download करो (repo root में है)
2. Phone में भेजो (WhatsApp/Drive/email) और **Chrome में खोलो** — बस!
3. Search, categories, filters, call/WhatsApp buttons, Hindi/English, favourites,
   login, provider registration, admin panel — सब offline चलता है
4. Demo login: `9000000001` / OTP `123456` (admin) · कोई भी number + `123456`
5. Data phone में ही save होता है (localStorage). Map tiles के लिए internet चाहिए।

Rebuild after any code change: `node tools/build-standalone.js` (tests: `node tools/test-localapi.js`).

## 📲 Play Store / App Store (Real Native App!)

**`mobile/`** में पूरा **Flutter app** (Android + iOS) है + **GitHub Actions cloud build** —
बिना laptop के APK/AAB बनता है।

1. Repo GitHub पर push करो → **Actions → Generate Upload Keystore** (एक बार)
2. **Actions → Build Android (APK + AAB)** → 15 मिनट में `.aab` + `.apk` download
3. Play Console ($25 one-time) पर AAB upload करो — पूरी Hindi guide:
   **`docs/PLAY_STORE_GUIDE_HINDI.md`** · Privacy policy: `docs/privacy-policy.html`
4. Store graphics ready: `mobile/store-assets/` (icon 512 + feature graphic)

## 🚀 One-Click Deploy (Permanent Link)

**GitHub पर push करो, फिर एक click में live:**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. इस repo को GitHub पर push करो
2. ऊपर **Deploy to Render** button दबाओ → अपना GitHub URL paste करो → Render `render.yaml` पढ़ कर auto deploy कर देगा
3. 2-3 मिनट में permanent link मिलेगा: `https://labors-near-me.onrender.com`
4. वही link phone में खोलो → Add to Home Screen → हमेशा चलेगा!

> `render.yaml` पहले से बना हुआ है — backend + PWA एक साथ deploy होगा। Env vars: `MSG91_AUTHKEY`, `FCM_SERVER_KEY`, `CLOUDINARY_URL` बाद में add कर सकते हो (demo mode में भी चलेगा)।

**Permanent deploy के बाद APK में API कैसे जोड़ें:**
`mobile/lib/core/api_client.dart` में `apiBase = 'https://आपका-render-link.onrender.com'` डालो → `flutter build apk`

---

## 📁 Repo layout

```
labors-near-me/
├── README.md
├── docs/ARCHITECTURE.md  — the full 7-deliverable architecture & build plan
├── backend/              — Node.js + Express REST API + production adapters
│   └── src/services.js     (MSG91 OTP · FCM push · Cloudinary — demo fallbacks)
├── web/                  — Installable PWA — website + app in one (Leaflet/OSM maps, offline shell)
└── mobile/               — Flutter source for the Play Store / APK build (see mobile/README.md)
```

## ✨ Feature checklist (MVP)

- [x] GPS location + manual city picker (pan-India)
- [x] Keyword + category search, icon grid, distance-sorted results, filters (open now, 4★+), **Best match ranking v2**
- [x] List ⇄ Map toggle with pins · provider profiles with click-to-call, WhatsApp, directions
- [x] Phone-OTP + Google login (demo mode), favourites, recent searches, search suggestions
- [x] Provider self-registration wizard (photo + KYC) → admin verification queue
- [x] Provider dashboard: status, one-tap open/closed, **edit profile**, lead feed, share card
- [x] Admin: approve/reject, manual add + inline edit, **bulk CSV (template download)**, **export CSV**, categories, analytics, moderation
- [x] Ratings & reviews · **rate-after-lead nudge** · report listing · share provider/app (WhatsApp growth loop)
- [x] Production adapters ready: MSG91 OTP · FCM push · Cloudinary photos (`backend/src/services.js`)
- [x] Hindi + English toggle · PWA install + offline shell (2G/3G friendly)
- [x] **Flutter app source** for Play Store/APK (`mobile/` — build guide inside)

## 🔌 API in 30 seconds

```bash
curl "http://localhost:3000/api/providers/nearby?cityId=indore&q=tailor&sort=distance"
curl -X POST http://localhost:3000/api/auth/request-otp -H 'Content-Type: application/json' -d '{"phone":"9876543210"}'
```

Full endpoint list + schemas: **`docs/ARCHITECTURE.md`** (Sections 3 & 6).

## 🗺 Production roadmap (short version)

1. Set 3 env keys on the API — `MSG91_AUTHKEY` (real OTP SMS), `FCM_SERVER_KEY` (lead push), `CLOUDINARY_URL` (photos) — **no code changes needed**
2. JSON store → PostgreSQL+PostGIS (schema is ready) · Flutter APK via `mobile/README.md`
3. Google Maps/Places upgrade · city-by-city launch playbook

Stack decisions & trade-offs: `docs/ARCHITECTURE.md` §1 · Build plan: §5.
````

## 📄 `DEPLOY_HINDI.md`

````markdown
# Permanent Deploy Guide — हिंदी में

> **⚡ सबसे आसान तरीका:** `LaborsNearMe.html` file download करो → phone में Chrome से खोलो →
> पूरा app तुरंत चलेगा (बिना server, बिना internet)। नीचे वाला deploy तब करो जब
> WhatsApp पर link share करना हो या real SMS/OTP चाहिए हो।

आपका app अभी temporary link पर चल रहा है (e2b sandbox) जो 5-10 मिनट में बंद हो जाता है।
Permanent link के लिए नीचे वाले steps follow करो — 100% Free।

## Option A: Render.com (सबसे आसान, Free)

### 1. GitHub पर डालो
```bash
# ZIP को unzip करो
cd labors-near-me
git init
git add .
git commit -m "deploy"
# GitHub पर नया repo बनाओ: https://github.com/new
git remote add origin https://github.com/YOUR_USERNAME/labors-near-me.git
git push -u origin main
```

### 2. Render पर Deploy
1. https://render.com → Sign up (GitHub से login)
2. Dashboard → New + → Blueprint → अपना GitHub repo select करो
3. Render खुद `render.yaml` देख लेगा:
   - Name: labors-near-me
   - Build: `cd backend && npm install`
   - Start: `node backend/src/server.js`
4. **Apply** दबाओ → 2-3 मिनट wait करो
5. Link मिलेगा: `https://labors-near-me-xxxx.onrender.com`

Test करो: `https://.../api/health` खोलो → `{"ok":true}` आना चाहिए

### 3. Phone में Install
- वही link Chrome में खोलो
- 3 dots → Add to Home Screen → Install
- WhatsApp पर share करो — सब install कर पाएंगे

### 4. (Optional) Real OTP SMS लगाओ
1. MSG91.com पर account बनाओ (₹500 में 1000 SMS)
2. Render Dashboard → Your Service → Environment → Add:
   - `MSG91_AUTHKEY` = आपकी key
   - `MSG91_SENDER_ID` = LNMAPP
   - `MSG91_TEMPLATE_ID` = आपका template ID
3. Save → Auto redeploy → अब real SMS जाएगा

### 5. APK में Permanent API जोड़ो
```dart
// mobile/lib/core/api_client.dart
static const String apiBase = 'https://labors-near-me-xxxx.onrender.com';
```
फिर:
```bash
cd mobile
flutter create . --platforms android
flutter build apk --split-per-abi
# APK: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

## Option B: Hostinger VPS (₹199/month, Fast)
1. Hostinger से VPS लो
2. `pm2` install करो: `npm install -g pm2`
3. Code upload करो, `cd backend && npm install`
4. `pm2 start src/server.js --name lnm`
5. Nginx से `web/` serve करो + domain लगाओ

## Database Note
अभी data `backend/data/db.json` में है — redeploy पर reset हो जाता है।
Production के लिए Render पर Free PostgreSQL add करो — schema `docs/ARCHITECTURE.md` §3 में तैयार है।

## Help चाहिए?
- ZIP: `labors-near-me.zip` (516KB) — ऊपर download किया था
- Architecture: `docs/ARCHITECTURE.md`
- Mobile build: `mobile/README.md`

किसी step पर अटको तो बोलो — मैं command दे दूंगा!
````

## 📄 `docs/PLAY_STORE_GUIDE_HINDI.md`

````markdown
# Play Store पर App कैसे डालें — पूरी Guide (हिंदी में)

> **कुल समय: ~2-3 घंटे (पहली बार) · खर्च: $25 (एक बार, Google Play Developer account)**
> Laptop की ज़रूरत नहीं — सब कुछ phone/browser + GitHub cloud से होगा।

---

## Step 0 — पहले ये तैयार रखें ✅

| चीज़ | कहाँ से मिलेगी |
|---|---|
| Google account (Gmail) | आपके पास होगा |
| $25 (लगभग ₹2,100) | Debit/Credit card या net banking |
| ये पूरा project (ZIP) | `labors-near-me.zip` |
| Bank/PAN details | Play Console payment + tax info के लिए |

---

## Step 1 — Backend को Internet पर डालें (30 मिनट) 🌐

App को चलने के लिए एक **live server (API)** चाहिए — बिना इसके app खाली दिखेगा।

1. **https://github.com** पर जाएँ → New Repository → नाम `labors-near-me` → Create
2. ZIP unzip करें → सारी files GitHub पर upload करें (web interface: "Add file → Upload files")
3. **https://render.com** पर free account बनाएँ (GitHub से login)
4. **New + → Blueprint** → अपना `labors-near-me` repo चुनें → **Apply**
5. 3 मिनट में link मिलेगा: `https://labors-near-me-xxxx.onrender.com`
6. Test: उस link पर `/api/health` खोलें → `{"ok":true}` दिखना चाहिए ✅

> ⚠️ **यह URL लिखकर रखें** — आगे हर जगह यही लगेगा।
> (चाहें तो बाद में custom domain लगा सकते हैं — जैसे `api.laborsnearme.in`)

---

## Step 2 — GitHub पर App Build करें (20 मिनट) 🔨

**Laptop नहीं चाहिए — GitHub Actions cloud में build होगा!**

### 2a. सबसे पहले Keystore बनाएँ (app का digital signature — एक बार)
1. GitHub पर अपने repo → **Actions** tab → बाएँ "Generate Upload Keystore" → **Run workflow**
2. दो passwords चुनें और **कहीं लिखकर रखें** (भूल गए तो app कभी update नहीं हो सकेगा!)
3. Run होने दें (1 मिनट) → हरा होने पर नीचे **upload-keystore** artifact download करें
4. `keystore.b64` file Notepad में खोलें → सारा text copy करें
5. Repo → **Settings → Secrets and variables → Actions → New repository secret** — 4 secrets जोड़ें:

| Name | Value |
|---|---|
| `KEYSTORE_BASE64` | keystore.b64 का पूरा text |
| `KEYSTORE_PASSWORD` | आपका password |
| `KEY_ALIAS` | `upload` |
| `KEY_PASSWORD` | आपका key password |

### 2b. अब App build करें
1. **Actions** tab → "Build Android (APK + AAB)" → **Run workflow**
2. "Backend API URL" बॉक्स में **Step 1 वाला URL** डालें (जैसे `https://labors-near-me-xxxx.onrender.com`)
3. **Run** दबाएँ → 10-15 मिनट लगेंगे ☕
4. हरा होने पर नीचे Artifacts में दो files मिलेंगी:
   - **app-bundle-play-store** → इसमें `app-release.aab` है ← **यही Play Store में जाएगा**
   - **apk-direct-install** → APK, जो सीधे phone में install/share हो सकता है

> 💡 APK download करके अपने phone में install करके पहले **खुद test कर लें** — सब सही लगे तभी Play Store पर डालें।

---

## Step 3 — Google Play Developer Account बनाएँ (30 मिनट) 💳

1. **https://play.google.com/console** खोलें → Google account से login
2. **$25 one-time fee** pay करें (card / net banking)
3. अपनी जानकारी भरें: नाम, पता, email, phone
4. बैंक और PAN details (पैसे कमाने के लिए — अभी ज़रूरी नहीं, बाद में भी दे सकते हैं)

---

## Step 4 — App Listing बनाएँ (45 मिनट) 📝

1. Console में **Create app** दबाएँ:
   - App name: **Labors Near Me**
   - Default language: **Hindi (India)** या English
   - App or Game: **App**
   - Free or Paid: **Free**
   - Declarations ☑️ (सब सही है — gambling नहीं, ads नहीं)

### 4a. App access / Ads
- "App access" → **All functionality available without restrictions**
- "Ads" → **No, my app does not contain ads**

### 4b. Store listing (दुकान की सजावट)
- **App name:** `Labors Near Me - Find Workers`
- **Short description (80 char):**
  `Electrician, tailor, plumber, mason — trusted workers near you. Call in one tap.`
- **Full description** (Hindi+English mix चलेगा):
```
Labors Near Me — अपने पास के भरोसेमंद कामगार खोजें!

Electrician, tailor (दर्जी), plumber, raj mistri (mason), bhandara/catering,
AC repair, carpenter, painter, driver, mobile repair, beautician, cook, mali —
सब एक app में।

★ Features:
• GPS से नज़दीकी कामगार खोजें या शहर चुनें
• Category icons से तुरंत खोज — 16 categories
• एक tap में Call या WhatsApp
• Map पर देखें, directions पाएँ
• असली reviews और ratings
• Hindi और English दोनों में
• अपनी सेवा FREE में लिस्ट करें (24 घंटे में verify)
• कम internet पर भी तेज़ चलता है

Apni dukaan/service list karein aur paayein naye customers!
```
- **App icon:** `mobile/store-assets/app-icon-512.png` upload करें
- **Feature graphic (1024x500):** `mobile/store-assets/feature-graphic-1024x500.png` upload करें
- **Screenshots:** कम से कम 2 (8-10 best). बनाने का आसान तरीका:
  - APK अपने phone में install करें → 4-5 screens के screenshots लें
    (Home + categories, Search results, Provider profile, Hindi mode, Dashboard)
  - Phone screenshots सीधे upload कर दें — Play Console उन्हें accept कर लेगा

### 4c. Categorization
- App category: **Business** या **Tools**
- Tags: services, local, workers

### 4d. Contact details
- Email डालें (ज़रूरी है)
- Website: आपका Render URL डाल सकते हैं (optional)
- Phone (optional)

---

## Step 5 — Privacy Policy (ज़रूरी है!) 🔒

Play Store बिना privacy policy के app accept नहीं करता।

1. इसी repo में `docs/privacy-policy.html` तैयार है
2. उसे **GitHub Pages** पर free host करें:
   - Repo → Settings → Pages → Source: "Deploy from a branch"
   - Branch: `main`, Folder: `/docs` → Save
   - 2 मिनट में link मिलेगा: `https://आपका-username.github.io/labors-near-me/privacy-policy.html`
3. वही link Play Console → App content → Privacy policy में डालें

---

## Step 6 — App Content Forms (30 मिनट) 📋

Console के "App content" सेक्शन में सब भरें:

1. **Privacy policy** → Step 5 वाला link
2. **App access** → All functionality available
3. **Ads** → No
4. **Content rating** → सवालों के जवाब:
   - Violence: No · Sexual content: No · Language: No · Gambling: No
   - Rating मिलेगी: **3+ / Everyone** ✅
5. **Target audience** → Age 18+ (workers/services platform) — या "Everyone"
6. **News app** → No
7. **COVID-19** → No
8. **Data safety** → ये भरें (हमारा app क्या collect करता है):
   - Data collected: **Location (approximate)**, **Phone number**, **Name**
   - Purpose: App functionality, Account management
   - Data shared with third parties: **No**
   - Encrypted in transit: **Yes**
   - Can users request deletion: **Yes** (email से)
9. **Financial features** → No

---

## Step 7 — AAB Upload करें (15 मिनट) 🚀

1. Console → **Testing → Internal testing** (सबसे पहले यहाँ डालना आसान है)
2. **Create new release**
3. Step 2 वाला **`app-release.aab`** upload करें
4. Release name: `1.0.0` · Notes (optional):
```
First release: search, categories, provider profiles, call/WhatsApp,
Hindi/English, favorites, reviews, provider registration & dashboard.
```
5. **Review release** → **Start release to Internal testing**

> Internal testing में आप + आपके 100 testers पहले try कर सकते हैं।
> सब सही लगे तो **Production** में "Promote release" दबाएँ।

---

## Step 8 — Review और Live! 🎉

1. पहली बार review में **1-7 दिन** लगते हैं
2. Google email करेगा — कोई दिक्कत हो तो वो बताएँगे (आम मुद्दे: privacy policy link, screenshots)
3. Approve होते ही app **Play Store पर LIVE**! 🥳
4. अपना link share करें: `https://play.google.com/store/apps/details?id=in.laborsnearme.labors_near_me`

---

## आगे क्या? (Optional upgrades)

| काम | कैसे |
|---|---|
| Real OTP SMS (demo बंद) | MSG91 account → Render में `MSG91_AUTHKEY` env var |
| ज़्यादा cities/providers | Admin panel → Bulk CSV upload |
| Apple App Store | Mac या Codemagic cloud से iOS build + $99/year Apple account |
| App update कैसे | `pubspec.yaml` में version बढ़ाएँ (जैसे `1.0.1+2`) → फिर से Actions में build → Play Console में नया release |
| Ratings बढ़ाना | App में "rate us" prompt बाद में जोड़ें |

---

## ❌ आम गलतियाँ (इनसे बचें)

1. **AAB की जगह APK upload** — Play Store को AAB चाहिए (हमारा workflow दोनों बनाता है)
2. **Privacy policy नहीं** — सबसे आम rejection
3. **Screenshots नहीं** — कम से कम 2 लगें
4. **Keystore/passwords खोना** — app कभी update नहीं हो पाएगा! Google Drive पर backup रखें
5. **Demo API URL** — app में `YOUR-API-URL` वाला placeholder रह गया तो app खाली दिखेगा
6. **बिना test के upload** — पहले APK अपने phone में install करके देखें

---

कहीं अटकें तो screenshot लेकर पूछें — मैं हर step में मदद करूँगा! 💪
````

## 📄 `docs/privacy-policy.html`

````html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Labors Near Me</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px;
         color: #1C1917; line-height: 1.65; background: #FAFAF9; }
  h1 { color: #EA580C; } h2 { color: #B45309; margin-top: 28px; }
  .meta { color: #78716C; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #E7E5E4; padding: 8px 10px; text-align: left; font-size: 14px; }
  th { background: #FEF3C7; }
</style>
</head>
<body>
<h1>Privacy Policy — Labors Near Me (लेबर्स नियर मी)</h1>
<p class="meta">Effective date: 26 September 2026 · Contact: <b>privacy@laborsnearme.in</b></p>

<p>Labors Near Me ("the App", "we", "us") helps users find local service providers
(electricians, tailors, plumbers, masons, cooks and other workers) and lets workers
list their services. This policy explains what information we collect, how we use it,
and your choices. This policy is for the Android/iOS app and the website.</p>

<h2>1. Information we collect</h2>
<table>
  <tr><th>Data</th><th>Why</th><th>Required?</th></tr>
  <tr><td>Mobile phone number</td><td>Login (OTP), account security</td><td>Yes, for login</td></tr>
  <tr><td>Name</td><td>Profile display, reviews</td><td>Yes, for account</td></tr>
  <tr><td>Approximate location / city</td><td>Show workers near you, distance sorting</td><td>Optional (you can pick a city manually)</td></tr>
  <tr><td>Provider listing info (business name, phone, address, skills, photo)</td><td>Public listing so customers can contact you</td><td>Only if you register as a provider</td></tr>
  <tr><td>Reviews and ratings you write</td><td>Show feedback to other users</td><td>Optional</td></tr>
</table>

<h2>2. What we do NOT collect</h2>
<ul>
  <li>We do <b>not</b> collect your contacts list, SMS, call logs, or device files.</li>
  <li>We do <b>not</b> sell or share your personal data with advertisers or data brokers.</li>
  <li>We do <b>not</b> use third-party advertising or tracking SDKs.</li>
</ul>

<h2>3. How information is used</h2>
<ul>
  <li>To provide the service: search, listings, contact (call/WhatsApp), reviews.</li>
  <li>To verify and moderate listings (fraud/spam prevention).</li>
  <li>To improve the app (aggregate, non-personal statistics like search counts).</li>
</ul>

<h2>4. Location</h2>
<p>Location is used only to sort workers by distance. You can deny GPS permission and
choose your city manually — all features keep working.</p>

<h2>5. Sharing</h2>
<ul>
  <li>Provider information you publish (name, business, phone, address) is <b>public by design</b> — that is the point of the service.</li>
  <li>Your phone number is <b>never</b> shown publicly (only verified leads reach providers).</li>
  <li>We may disclose information if required by Indian law or a valid court order.</li>
</ul>

<h2>6. Security</h2>
<p>Data is transmitted over encrypted HTTPS. Access to the database is restricted to
authorized operators. No system is 100% secure, but we take reasonable steps to
protect your data.</p>

<h2>7. Data retention & deletion</h2>
<p>We keep account data while your account is active. You can request deletion of your
account and data at any time by emailing <b>privacy@laborsnearme.in</b> from your
registered email/phone. We will delete it within 30 days (except records we must keep
by law).</p>

<h2>8. Children</h2>
<p>The App is not directed at children under 13. We do not knowingly collect data
from children.</p>

<h2>9. Changes</h2>
<p>We may update this policy. Material changes will be announced in the app or on this
page. Continued use means acceptance of the updated policy.</p>

<h2>10. Contact</h2>
<p>
<b>Labors Near Me</b><br>
Email: privacy@laborsnearme.in<br>
Address: Indore, Madhya Pradesh, India
</p>

<p class="meta">This document is provided for transparency with app-store requirements
(Google Play Data safety form). Adapt the contact details before publishing.</p>
</body>
</html>
````

## 📄 `docs/ARCHITECTURE.md`

````markdown
# Labors Near Me — Architecture & MVP Build Plan

> Hyperlocal service-provider discovery platform (JustDial / UrbanClap-class) for India —
> connecting **Service Seekers** with nearby skilled & unskilled **Service Providers**
> (electricians, engineers, tailors, dry cleaners, raj mistris, bhandara/catering, plumbers,
> carpenters, painters, safai karamcharis, …) with **Admin** as the platform operator.
>
> Deliverables covered: **(1)** Tech stack · **(2)** System architecture · **(3)** DB schema ·
> **(4)** Folder structure · **(5)** Phased MVP build plan · **(6)** API endpoints · **(7)** UI/UX flows.
> A working implementation of this design ships alongside this document (see `README.md`).

**Decisions locked from the kickoff discussion**

| Decision | Choice |
|---|---|
| Launch market | Pan-India from day one (runtime city picker; 10 seed cities) |
| Constraints | Low-bandwidth tier-2/3 first · simple icon UX · Hindi + English · speed-to-MVP |
| Infrastructure | No vendor constraints — choose for speed, cost and India availability |
| Delivery form | Working, shareable app **plus** this document |

---

## 1. Recommended Tech Stack (with justification)

### 1.1 Mobile App — **Flutter** (Android + iOS)

| | **Flutter** ✅ | React Native |
|---|---|---|
| Rendering | Own engine (Skia/Impeller) — **identical pixels on every ₹5k Android device** | Bridge to native views — jank on low-end Android when JS thread is busy |
| Low-end Android (2–3 GB RAM) | Excellent; predictable 60 fps lists | Acceptable; heavier on RAM (JS runtime + Hermes) |
| APK size (release, arm64) | ~9–12 MB | ~8–10 MB |
| Code sharing with web | None (Dart) — mitigated by our REST contract | Near-total with React web |
| Hiring in India | Growing fast; strong fresher pipeline (Dart is easy) | Large JS pool |
| Maps/OTP SDKs | Official Google Maps, FCM, SMS retriever plugins — mature | Mature |
| Hot reload / dev speed | Excellent | Excellent |

**Recommendation: Flutter.** The dominant risk for this product is *the device*, not the team —
Indian tier-2/3 users run low-end Androids on flaky 3G. Flutter's single rendering pipeline
produces the most consistent experience on those phones, and one Dart codebase covers
Play Store + App Store. The trade-off (no JS code-share with the website) is softened because
**all business logic lives in the REST API**; clients stay thin.

**Also shipping now: the PWA** (see 1.2) is the fastest "app people can open from a WhatsApp
link" — installable to the home screen, no store review, no APK sideload friction. The Flutter
app is Phase 2 of the product roadmap (Play Store distribution, deeper push/location
integration) and consumes the exact same API.

### 1.2 Website — **React + Vite PWA** (responsive, app-parity)

| | **PWA (React/Vite)** ✅ | Next.js (SSR) | Plain server-rendered |
|---|---|---|---|
| Low-bandwidth behaviour | Best: ~60–80 KB gz JS, service-worker offline shell, instant repeat loads | Good, but SSR payload + hydration cost on 3G | Lightest pages, but weak app-like interactions (map, wizard) |
| SEO (provider pages) | Moderate (client-rendered) | Best (SSR) | Best |
| Complexity / speed-to-MVP | Low | Medium (SSR, caching, image pipeline) | Low |

**Recommendation: Vite + React PWA for MVP**, designed so an SEO-critical
provider-profile SSR layer (Next.js or Remix) can be added in Phase 2 without API changes —
`GET /api/providers/:id` is already a stable JSON contract ready to be server-rendered.
The MVP code in this workspace ships as a **dependency-light vanilla-JS PWA** (≈30 KB of JS,
zero build step) — the same architecture, minus React — precisely to honour the low-bandwidth
constraint. Swapping the view layer for React components is a presentation-only change.

### 1.3 Backend — **Node.js + Express (REST)** vs Firebase

| | **Node/Express + Postgres** ✅ | Firebase (Firestore + Functions + Auth) |
|---|---|---|
| Time to first API | Slightly slower | Faster for CRUD+auth |
| **Nearby geo search (radius)** | PostGIS `ST_DWithin` — real spatial indexes, distance sort in SQL | Firestore geo-hashes via open-source lib (geofire) — no native radius query, awkward distance sorting |
| Complex admin analytics | SQL aggregation trivial | Multiple fan-out denormalised counters |
| Vendor lock-in / cost at scale | Low (any VPS/managed PG) | Reads/writes pricing gets expensive at JustDial-like traffic |
| OTP in India | MSG91/Truecaller — cheap (~₹0.15/SMS), DLT-ready | Firebase Phone Auth costs per verification, DLT friction |
| Local dev / offline demos | Runs anywhere (even a laptop) | Requires Google project + network |

**Recommendation: Node.js + Express + PostgreSQL.** Geo search is the heart of this product
("X near me", distance-sorted) and PostGIS is purpose-built for it; Firebase's geo story is the
exact weak point. We also keep full SQL for the admin analytics the brief requires. *Trade-off
accepted:* slightly slower first endpoint vs Firebase — mitigated by the repository pattern and
the ready-made Express scaffold in this repo.

### 1.4 Database — **PostgreSQL 16 + PostGIS**

| | **PostgreSQL + PostGIS** ✅ | MongoDB | Firestore |
|---|---|---|---|
| Geospatial | `geography(Point)`, `ST_DWithin`, spatial index — industry standard | `$geoNear` (2d/2dsphere) — good | Geo-hashes via libraries — weak |
| Relational integrity (users↔providers↔reviews) | Foreign keys, triggers for rating rollups | Manual | Manual |
| Ad-hoc admin analytics | SQL | Aggregation pipeline (verbose) | Composite indexes + denormalisation |
| Multi-city scale | Partition-ready, read replicas | Sharding mature | Auto-scale |

**Recommendation: PostgreSQL + PostGIS.** Strong consistency for verification/lead data, one
query language for search + analytics + admin, and geospatial done *right*. Mongo's geo support
is decent but we gain nothing from document flexibility here (our shapes are stable), and
Firestore repeats Firebase's geo weakness. The MVP in this workspace uses a JSON-file store with
**the same collection shapes** as the SQL schema below — migration is a repository-layer swap.

### 1.5 Maps & Location

| | **Google Maps Platform** (production) | Mappls / MapmyIndia | Leaflet + OpenStreetMap (MVP) |
|---|---|---|---|
| India map quality / pin codes | Excellent | Excellent (better local POIs) | Good (uneven rural) |
| Mobile SDKs (Flutter) | Official | Official | Community (flutter_map) |
| Cost | $200/mo free credit then usage | Cheaper India plans | **Free** (self-host tiles if needed) |
| Autocomplete / Place IDs | Best-in-class | Good | Manual |

**Recommendation:** start with **Leaflet + OSM (zero API keys, zero cost — what the MVP ships
with)**; upgrade to **Google Maps SDK + Places Autocomplete** at Play Store launch when the bill
is justified, or **Mappls** if targeting cost optimisation at scale. The backend contract only
sends `lat/lng` — the map renderer is a client-side choice and can change without migrations.

### 1.6 Auth — Phone OTP (primary) + Google (secondary)

- **OTP SMS: MSG91** (or **Truecaller SDK** for zero-OTP friction on Android) — DLT-registered
  sender IDs, ₹0.15/SMS, delivery reports. Fallback: **Firebase Phone Auth** if already on GCP.
- **Google Sign-In** with One-Tap (web) / native (Flutter).
- MVP ships a **demo OTP mode** (code `123456`, surfaced in the API response) so the whole flow
  is testable without SMS spend — same endpoints, one config flag in production.

### 1.7 Notifications — **FCM** (push) + MSG91 (SMS fallback)

- Seekers: lead status, saved-provider promos (Phase 3+).
- Providers: **"नई लीड! / New lead!"** on every call/WhatsApp tap + verification status changes.
- Admin: new registration digest. Push payload contract in §6.

### 1.8 Media storage — **Cloudinary** (or S3 + CloudFront)

- Provider photos & KYC docs; Cloudinary free tier + on-the-fly resizing/WebP saves bandwidth
  for tier-2/3 users (auto `q_auto,f_webp,w_auto`). KYC docs stored with signed, admin-only URLs.

### 1.9 Hosting & DevOps (MVP → scale)

- **MVP:** single VM (Hetzner/DigitalOcean ₹400–800/mo) or Render/Fly.io — Docker Compose
  (`api + postgres`), Cloudflare in front (free CDN + TLS + image resizing).
- **Scale path:** managed Postgres (RDS/Neon), API on containers (ECS/Cloud Run), read replica
  for analytics, PgBouncer. Everything behind CI (GitHub Actions: lint, test, docker build).

**Stack summary**

| Layer | Choice | Ships in this workspace as |
|---|---|---|
| Mobile (native) | Flutter (Phase 2) | API contract + this doc |
| Mobile (instant) | **PWA** | ✅ Working installable app |
| Website | React PWA (vanilla-JS MVP here) | ✅ Same app, responsive |
| Admin | React (separate app in prod) | ✅ Working panel at `/#/admin` |
| API | Node.js + Express REST | ✅ Working (`backend/`) |
| DB | PostgreSQL + PostGIS | JSON store, same shapes (`backend/data/`) |
| Maps | OSM/Leaflet → Google Maps | ✅ Leaflet |
| OTP | MSG91/Truecaller (prod), demo OTP now | ✅ Demo OTP `123456` |
| Push | FCM | Phase 2 (contract in §6) |
| Media | Cloudinary | Data-URL upload (MVP) |

---

## 2. High-Level System Architecture

```
                                ┌────────────────────────────────────────────┐
                                │                 END USERS                  │
                                └───────┬──────────────┬─────────────┬───────┘
                                        │              │             │
                        ┌───────────────▼──┐   ┌───────▼──────┐  ┌───▼──────────┐
                        │  Flutter App     │   │  Website PWA │  │  Admin Panel │
                        │  (Android/iOS)   │   │  (React/Vite)│  │  (React)     │
                        └───────┬──────────┘   └───────┬──────┘  └───┬──────────┘
                                │   HTTPS/JSON (REST, same contract for all three)
                                │
     GPS / Geolocation          │            ┌──────────────────────────────────────────┐
     Maps SDK (client) ─────────┼───────────►│            API GATEWAY (Nginx/           │
     WhatsApp / tel: deep links │            │         Cloudflare → rate limit)         │
     FCM push ◄─────────────────┼────────────┤                                          │
                                │            └──────────────────┬───────────────────────┘
                                │                               │
                                │            ┌──────────────────▼───────────────────────┐
                                │            │        Node.js + Express API             │
                                │            │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
                                │            │  │ /auth    │ │ /search  │ │ /admin    │ │
                                │            │  │ OTP+JWT  │ │ nearby   │ │ verify,   │ │
                                │            │  │ sessions │ │ ranking  │ │ bulk CSV  │ │
                                │            │  └──────────┘ └──────────┘ └───────────┘ │
                                │            │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
                                │            │  │/providers│ │  /leads  │ │ /reviews  │ │
                                │            │  └──────────┘ └──────────┘ └───────────┘ │
                                │            └───────┬─────────────┬───────────┬────────┘
                                │                    │             │           │
                                │            ┌───────▼──┐  ┌───────▼──────┐ ┌──▼──────────────┐
                                │            │PostgreSQL│  │ Redis (opt.) │ │ Object Storage  │
                                │            │+ PostGIS │  │ cache + geo  │ │ (Cloudinary/S3) │
                                │            │  main DB │  │ hot queries  │ │ photos, KYC     │
                                │            └──────────┘  └──────────────┘ └─────────────────┘
                                │
                     ┌──────────▼───────────┐   ┌──────────────────┐   ┌─────────────────┐
                     │ MSG91 / Truecaller   │   │ Google Maps API  │   │ FCM             │
                     │ (OTP SMS, DLT)       │   │ (Places, SDK)    │   │ (push notifs)   │
                     └──────────────────────┘   └──────────────────┘   └─────────────────┘
```

**Component responsibilities**

| Component | Responsibility |
|---|---|
| Flutter app / PWA / Website | Thin clients: location capture, map rendering, call/WhatsApp taps (native deep links), offline shell. **No business rules in clients.** |
| API (Express) | All business logic: auth, geo search & ranking, verification workflow, leads, reviews, moderation. Stateless — JWT/session-token auth, horizontally scalable. |
| PostgreSQL + PostGIS | Source of truth. `providers.location` is a `geography(Point)` with a GiST index — `ST_DWithin` powers "near me" at any city scale. |
| Redis (optional, Phase 2) | Cache hot nearby queries (`city:cat:page`), rate-limit OTP requests, session denylist. |
| Object storage | Profile/shop photos (public), KYC docs (private, signed URLs). |
| External | MSG91/Truecaller (OTP), Google Maps/Places (autocomplete, directions), FCM (push). |

**Key sequence: "electrician near me"**

```
Seeker                PWA/Flutter                API                     PostGIS
  │ open app              │                       │                        │
  │──GPS fix──────────────►│──GET /providers/nearby?lat&lng&q=electrician──►│
  │                       │                       │──ST_DWithin(location,  │
  │                       │                       │   radius 25km) + rank──►
  │                       │◄──JSON: results[] sorted by distance (w/ rating)│
  │◄──list + map pins─────│  (SW caches response for offline/repeat loads)  │
  │ tap "Call"            │                       │                        │
  │ tel:+91… opened ──────│──POST /leads {type:'call'} ──►│ (provider feed + push via FCM)
```

**Key sequence: provider onboarding**

```
Provider ──register (phone OTP)──► API ──create provider(verified='pending')──► DB
Admin ──GET /admin/providers?status=pending──► queue UI
Admin ──POST /admin/providers/:id/verify──► verified='verified' ──► live in search
                                        └──► FCM/SMS to provider: "आपकी लिस्टिंग लाइव है!"
(Alternatively Admin ──POST /admin/providers (manual) or /bulk (CSV)──► verified='verified' instantly)
```

**Scaling notes (multi-city, JustDial-style growth)**

- All queries are city-agnostic (`lat/lng + radius`) — adding a city = seeding categories'
  city rows + marketing; **no code change**. A `cities` table powers pickers and defaults.
- Ranking (Phase 2+): `score = w1·proximity + w2·rating + w3·recency(completed profile) +
  w4·responsiveness(lead→call-back) − penalties(reports)` — computed in SQL at query time.
- Read replicas for admin analytics; partition `leads/searches` tables by month when they grow.
- CDN (Cloudflare) fronts static PWA; `Cache-Control` on `/api/categories` (1h), nearby (30s).

---

## 3. Database Schema (key tables)

PostgreSQL DDL (production). The MVP JSON store mirrors these shapes 1:1.

```sql
-- ═══════════ 1. USERS ═══════════
CREATE TYPE user_role AS ENUM ('user', 'provider', 'admin');

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  phone         VARCHAR(15) UNIQUE,            -- E.164, primary login identity (India +91)
  google_id     VARCHAR(255) UNIQUE,           -- optional social login
  name          VARCHAR(80) NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  city_id       VARCHAR(40) REFERENCES cities(id),
  preferred_lang CHAR(2) NOT NULL DEFAULT 'hi', -- 'hi' | 'en'
  fcm_token     VARCHAR(512),                  -- push notifications
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);
CREATE INDEX idx_users_phone ON users(phone);

-- ═══════════ 2. CITIES & LOCATIONS ═══════════
CREATE TABLE cities (                        -- multi-city from day one
  id         VARCHAR(40) PRIMARY KEY,        -- 'indore', 'pune', …
  name_en    VARCHAR(80) NOT NULL,
  name_hi    VARCHAR(80) NOT NULL,
  state      VARCHAR(80) NOT NULL,
  center     GEOGRAPHY(POINT, 4326) NOT NULL, -- city centroid for default search origin
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- ═══════════ 3. CATEGORIES & SUB-CATEGORIES ═══════════
CREATE TABLE categories (
  id         VARCHAR(40) PRIMARY KEY,        -- 'electrician', 'raj-mistri', …
  name_en    VARCHAR(60) NOT NULL,
  name_hi    VARCHAR(60) NOT NULL,
  icon       VARCHAR(24) NOT NULL,           -- icon key ('bolt','scissors', …)
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subcategories (
  id          VARCHAR(40) PRIMARY KEY,
  category_id VARCHAR(40) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_en     VARCHAR(60) NOT NULL,
  name_hi     VARCHAR(60) NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ═══════════ 4. PROVIDERS (service listings) ═══════════
CREATE TYPE verify_status AS ENUM ('pending', 'verified', 'rejected', 'reported');
CREATE TYPE provider_source AS ENUM ('self', 'admin', 'csv');

CREATE TABLE providers (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- NULL for admin/CSV-added
  business_name  VARCHAR(80) NOT NULL,
  person_name    VARCHAR(60) NOT NULL,          -- the worker/owner
  category_id    VARCHAR(40) NOT NULL REFERENCES categories(id),
  subcategory_id VARCHAR(40) REFERENCES subcategories(id),
  phone          VARCHAR(15) NOT NULL,          -- click-to-call
  whatsapp       VARCHAR(15),                   -- wa.me deep link (fallback: phone)
  photo_url      VARCHAR(512),                  -- shop/profile photo (Cloudinary)
  about          TEXT,                          -- short bio (bilingual friendly)
  skills         TEXT[],                        -- ['House wiring','Inverter', …]
  price_hint     VARCHAR(40),                   -- '₹250 visit' — free text, not a price table
  address_line   VARCHAR(120),
  area           VARCHAR(60),                   -- 'Vijay Nagar', 'Sarafa' …
  city_id        VARCHAR(40) NOT NULL REFERENCES cities(id),
  state          VARCHAR(60),
  pincode        VARCHAR(10),
  location       GEOGRAPHY(POINT, 4326) NOT NULL,  -- live map pin (lat,lng)
  is_open_manual BOOLEAN NOT NULL DEFAULT true,    -- provider's one-tap toggle
  open_time      TIME NOT NULL DEFAULT '09:00',
  close_time     TIME NOT NULL DEFAULT '19:00',
  off_days       SMALLINT[] DEFAULT '{0}',         -- 0=Sun … 6=Sat
  verified       verify_status NOT NULL DEFAULT 'pending',
  source         provider_source NOT NULL DEFAULT 'self',
  kyc_ref        VARCHAR(512),                     -- KYC doc URL (private bucket)
  kyc_name       VARCHAR(80),                      -- name on ID proof
  rating_avg     NUMERIC(2,1) NOT NULL DEFAULT 0,  -- rollup (trigger-maintained)
  rating_count   INT NOT NULL DEFAULT 0,
  lead_count     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ★ The "near me" index — makes radius queries O(log n) at pan-India scale
CREATE INDEX idx_providers_location  ON providers USING GIST (location);
CREATE INDEX idx_providers_city      ON providers (city_id);
CREATE INDEX idx_providers_category  ON providers (category_id);
CREATE INDEX idx_providers_verified  ON providers (verified);
CREATE INDEX idx_providers_search    ON providers (to_tsvector('simple',
                        business_name || ' ' || person_name || ' ' || coalesce(about,'')));
                        -- full-text for keyword search ("tailor", "राज मिस्त्री")

-- ═══════════ 5. REVIEWS & RATINGS ═══════════
CREATE TABLE reviews (
  id          BIGSERIAL PRIMARY KEY,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        VARCHAR(500),                     -- Hindi/English free text
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, user_id)                 -- one review per user per provider
);

-- Rollup trigger keeps providers.rating_avg/count consistent (same logic as API weighted update)
CREATE OR REPLACE FUNCTION refresh_provider_rating() RETURNS trigger AS $$
BEGIN
  UPDATE providers p SET
    rating_avg   = (p.rating_avg * p.rating_count + NEW.rating) / (p.rating_count + 1),
    rating_count = p.rating_count + 1
  WHERE p.id = NEW.provider_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_review_rollup AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_provider_rating();

-- ═══════════ 6. FAVOURITES / BOOKMARKS ═══════════
CREATE TABLE favorites (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_id)
);

-- ═══════════ 7. LEADS (contact events — the marketplace's pulse) ═══════════
CREATE TYPE lead_type AS ENUM ('call', 'whatsapp', 'directions');

CREATE TABLE leads (
  id          BIGSERIAL PRIMARY KEY,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id),
  type        lead_type NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_provider ON leads (provider_id, created_at DESC);
-- increment providers.lead_count via trigger (same pattern as reviews)

-- ═══════════ 8. SEARCH LOG (analytics + "popular searches") ═══════════
CREATE TABLE searches (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  q          VARCHAR(80),
  city_id    VARCHAR(40) REFERENCES cities(id),
  location   GEOGRAPHY(POINT, 4326),           -- where demand is — guides city/category expansion
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_searches_created ON searches (created_at DESC);

-- ═══════════ 9. REPORTS (moderation queue) ═══════════
CREATE TABLE reports (
  id          BIGSERIAL PRIMARY KEY,
  provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id),
  reason      VARCHAR(300),
  status      VARCHAR(10) NOT NULL DEFAULT 'open',  -- open | resolved
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ 10. OTPS (short-lived; or use Redis) ═══════════
CREATE TABLE otps (
  phone      VARCHAR(15) PRIMARY KEY,
  code_hash  VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   SMALLINT NOT NULL DEFAULT 0
);
```

**The money query** (`GET /api/providers/nearby` in production form):

```sql
SELECT p.*,
       ST_Distance(p.location, ST_MakePoint($lng, $lat)::geography) AS distance_m
FROM   providers p
WHERE  p.verified = 'verified'
  AND  ST_DWithin(p.location, ST_MakePoint($lng, $lat)::geography, $radius_m)   -- GiST index
  AND  ($category IS NULL OR p.category_id = $category)
  AND  ($city     IS NULL OR p.city_id = $city)
  AND  ($open_now = false  OR (p.is_open_manual
        AND EXTRACT(DOW FROM now()) <> ALL(p.off_days)
        AND now()::time BETWEEN p.open_time AND p.close_time))
  AND  ($min_rating = 0    OR p.rating_avg >= $min_rating)
  AND  ($q IS NULL OR to_tsvector('simple', p.business_name||' '||p.person_name||' '||coalesce(p.about,''))
                     @@ plainto_tsquery('simple', $q))
ORDER BY distance_m           -- or rating_avg DESC / rating_count DESC
LIMIT  $limit;
```

---

## 4. Folder / Project Structure

### 4.1 Production monorepo (target layout, Phase 2)

```
labors-near-me/
├── docs/
│   ├── ARCHITECTURE.md            ← this document
│   └── API.md
├── apps/
│   ├── mobile/                    # FLUTTER (Android + iOS)
│   │   ├── android/  ios/
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── core/              # theme, di, router, constants
│   │   │   │   ├── network/api_client.dart      # Dio wrapper → same REST contract
│   │   │   │   ├── location/location_service.dart
│   │   │   │   └── l10n/ (app_hi.arb, app_en.arb)  # bilingual via flutter gen-l10n
│   │   │   ├── features/
│   │   │   │   ├── home/          # search bar, categories grid (screens/, widgets/, cubit/)
│   │   │   │   ├── search/        # results list, map view, filters
│   │   │   │   ├── provider/      # detail screen, call/WhatsApp/directions actions
│   │   │   │   ├── auth/          # phone OTP + Google
│   │   │   │   ├── favorites/
│   │   │   │   ├── registration/  # 3-step provider wizard
│   │   │   │   └── dashboard/     # provider leads + availability toggle
│   │   │   └── shared/widgets/    # big buttons, badges, avatar, star row
│   │   └── pubspec.yaml           # flutter_bloc, dio, google_maps_flutter, geolocator,
│   │                              # firebase_messaging, url_launcher (tel:, wa.me), l10n
│   ├── web/                       # WEBSITE — React PWA (feature parity with mobile)
│   │   ├── src/
│   │   │   ├── app/ (router, providers)
│   │   │   ├── features/ (home/ search/ provider/ auth/ favorites/ registration/ dashboard/)
│   │   │   ├── shared/ (components/ hooks/ api/ i18n en.ts hi.ts)
│   │   │   └── main.tsx
│   │   ├── public/ (manifest.webmanifest, sw.js, icons/)
│   │   └── vite.config.ts
│   └── admin/                     # ADMIN PANEL — React (role-gated)
│       └── src/features/ (overview/ verifications/ providers/ categories/ moderation/ bulk-upload/)
├── services/
│   └── api/                       # NODE.JS + EXPRESS + PostgreSQL
│       ├── src/
│       │   ├── app.ts  server.ts
│       │   ├── config/ (env, db.ts, logger.ts)
│       │   ├── modules/
│       │   │   ├── auth/   (routes, service, otp.strategy)
│       │   │   ├── search/ (nearby.query.ts — PostGIS, ranking.ts)
│       │   │   ├── providers/ (routes, service, repository.ts)
│       │   │   ├── leads/  reviews/ favorites/ admin/  notifications/
│       │   │   └── categories/ cities/
│       │   ├── middleware/ (auth, adminOnly, rateLimit, validate)
│       │   └── migrations/ (001_init.sql … = §3 DDL)
│       └── tests/
├── docker-compose.yml             # api + postgres(postgis) + redis
└── .github/workflows/ci.yml
```

### 4.2 What is in THIS workspace (working MVP — mirrors the above)

```
labors-near-me/
├── README.md                      # quickstart + demo credentials
├── docs/ARCHITECTURE.md           # ← this document
├── backend/                       # Node.js + Express REST API (§ modules → routes/)
│   ├── package.json               # npm start → :3000
│   ├── data/db.json               # JSON store (seeded on first boot; mirrors §3 schema)
│   └── src/
│       ├── server.js              # entry point (bind 0.0.0.0)
│       ├── app.js                 # static PWA + /api mount
│       ├── db.js                  # load/save store (swap for pg Pool in production)
│       ├── services.js            # PRODUCTION ADAPTERS: MSG91 OTP · FCM push · Cloudinary
│       │                          # (auto demo-fallback when env keys are absent)
│       ├── seed.js                # pan-India seed: 12 categories, 10 cities, 93 providers, 39 reviews
│       ├── geo.js                 # haversine + open-now (IST) + ranking-v2 relevance score
│       └── routes/
│           ├── public.js          # categories, cities, GET /providers/nearby (distance|relevance), detail, reviews
│           ├── auth.js            # request-otp (MSG91/demo), verify-otp, google (demo), me, logout
│           ├── user.js            # favorites, leads (+push), reviews, register (+Cloudinary), edit, dashboard
│           └── admin.js           # stats, verify/reject (+push), CRUD, bulk CSV, categories, reports
├── web/                           # Installable PWA = website + mobile app (shared code!)
│   ├── index.html                 # app shell + inline SVG icon sprite (offline icons)
│   ├── manifest.webmanifest       # PWA install metadata ("Labors Near Me / लेबर्स नियर मी")
│   ├── sw.js                      # service worker: cache shell, network-first API (2G/3G)
│   ├── css/app.css                # mobile-first, ≥48px targets, system fonts (Devanagari-ready)
│   ├── js/
│   │   ├── i18n.js                # EN + हिंदी dictionary (every UI string)
│   │   ├── api.js                 # REST client + avatar/stars/lead helpers (relative URLs)
│   │   └── app.js                 # hash router + all screens (home, search+map, detail, edit listing,
│   │                              #  auth, favorites, account, register wizard, dashboard, admin)
│   ├── vendor/leaflet/            # self-hosted map lib (no CDN dependency)
│   └── icons/                     # app icons (192/512/maskable/apple-touch)
└── mobile/                        # FLUTTER source (Phase-2 native client — see mobile/README.md)
    ├── pubspec.yaml               # http, geolocator, url_launcher, shared_preferences
    └── lib/
        ├── main.dart              # app shell, theme (big buttons), Session state
        ├── core/api_client.dart   # same REST contract as web/js/api.js
        ├── core/i18n.dart         # EN/हिंदी
        ├── models.dart
        └── screens/               # home · search · detail · login · register · dashboard
```

---

## 5. Step-by-Step MVP Build Plan (phased)

> Principle: **speed-to-MVP, vertical slices**. Each phase ends with something demoable.

### Phase 0 — Foundations (Week 1) ✅ *(done in this workspace)*
- [x] Monorepo scaffold (api + web + docs), CI stub
- [x] Schema design (§3) + seed data: 12 bilingual categories, 10 cities, 93 providers
- [x] REST contract frozen (§6) — clients and API agree before features multiply
- [x] Bilingual (EN/हिंदी) i18n plumbing + PWA shell (manifest, service worker, icons)

### Phase 1 — Core search + listings (Weeks 2–3) ✅ *(done in this workspace)*
- [x] GPS auto-detect + manual city/location picker (10 cities)
- [x] Keyword + category search ("electrician near me", "raj mistri", …)
- [x] Icon-grid category browsing (12 categories × 2–3 sub-categories)
- [x] Nearby results: distance-sorted, radius filter, open-now & rating filters, sort options
- [x] **List ⇄ Map toggle** with pins, tap-pin bottom sheet
- [x] Provider profile card: photo/monogram, business name, category/subcategory, full address,
-     live distance, ratings, open/verified badges, **click-to-call + WhatsApp + Get Directions**
- [x] Low-bandwidth pass: tiny JS payload, SVG icons/avatars, cached shell, lazy map tiles
- [ ] **Phase 1 exit criteria on device:** cold search on 3G < 2s to first results; call connects.

### Phase 2 — Provider dashboard + onboarding (Weeks 4–5) ✅ *(app done — Flutter source ready)*
- [x] Phone-OTP login (demo mode) + Google login (demo) — swap to MSG91/Truecaller + Google One-Tap
- [x] Self-registration 3-step wizard (details → address + map pin → photo/KYC) → `pending`
- [x] Provider dashboard: listing status, **one-tap availability toggle**, **edit profile**, share card
- [x] Lead feed (call/WhatsApp/directions events) per listing
- [x] Favorites (bookmarks) + recent searches
- [x] **Flutter project skeleton** consuming the same API (`mobile/` — home, search, detail, login, register, dashboard)
- [x] Production adapters wired with demo fallbacks (`backend/src/services.js`):
      MSG91 OTP SMS · FCM push ("नई लीड!" + verification status) · Cloudinary photo upload · `POST /api/me/fcm-token`
- [ ] One-command APK build + Play Console internal track (needs local Android SDK — see `mobile/README.md`)

### Phase 3 — Admin panel (Week 6) ✅ *(done in this workspace)*
- [x] Admin login (role-gated routes + UI)
- [x] Verification queue: approve / reject self-registered providers (with status badges)
- [x] Manual provider add + full edit/delete
- [x] **Bulk CSV onboarding** (validates category/city rows, reports skips)
- [x] Category & sub-category management (add/enable/disable — no deploy needed)
- [x] Analytics overview: totals, by-city, by-category bars, recent searches, leads
- [x] Moderation: report/flag queue with resolve action
- [x] CSV **template download** + **Export CSV** (providers list) + inline provider edit
- [ ] CSV drag-drop polish + scheduled digest emails to ops

### Phase 4 — Reviews, ratings & growth loops (Weeks 7–8) ✅ *(core done)*
- [x] Ratings & reviews (1/user/provider), weighted rollup into listing score
- [x] Write-review from provider page (star picker, Hindi/English text)
- [x] **Rate-after-lead nudge** ("you contacted recently — how was it? ⭐")
- [x] Report listing → moderation queue
- [x] Share-a-provider + **share-the-app** (WhatsApp/web-share growth loop)
- [x] **Ranking v2 "Best match"**: `0.45·proximity + 0.30·rating + 0.15·review-trust + 0.10·profile-completeness + claim boost`
- [ ] Rate-after-lead **push/SMS** 2h after first call (FCM adapter is ready — scheduler next)
- [ ] PWA install campaign + city launch checklist (seed 200 providers/city before opening)

**Team & timeline:** 1 full-stack + 1 mobile (Flutter) + 1 part-time design → ~8 weeks to
Play Store beta. This workspace already contains Phases 1, 3, 4 and the app half of Phase 2.

---

## 6. Sample API Endpoints (MVP contract — all implemented)

Base: `https://<host>/api` · Auth: `Authorization: Bearer <token>` · All JSON.
Conventions: errors → `{ "error": "<code>" }` with 4xx/5xx; success payloads below.

### 6.1 Public — search & content

| Method | Path | Purpose |
|---|---|---|
| GET | `/categories` | Icon-grid categories + subcategories (bilingual) |
| GET | `/cities` | City picker (pan-India) |
| GET | `/providers/nearby` | ★ Core: geo search — `?lat&lng&radius&cityId&q&category&openNow&minRating&sort=distance\|rating\|reviews&limit` |
| GET | `/providers/:id` | Public profile (`?lat&lng` adds distance; `?preview=1` for owner/admin) |
| GET | `/providers/:id/reviews` | Review list (newest first) |
| GET | `/searches/popular` | Trending search chips |
| POST | `/searches` | Log a search (analytics) |
| GET | `/health` | Liveness |

```http
GET /api/providers/nearby?lat=22.7196&lng=75.8577&q=electrician&openNow=1&sort=distance&limit=20
```
```json
{
  "origin": { "lat": 22.7196, "lng": 75.8577, "label": "gps" },
  "radius": 25000,
  "total": 3,
  "sort": "distance",
  "results": [
    {
      "id": "prv_vermaelectricals_ind",
      "name": "Sunita Verma",
      "businessName": "Verma Electricals",
      "categoryId": "electrician",
      "categoryNameEn": "Electrician", "categoryNameHi": "इलेक्ट्रीशियन",
      "subcategoryNameEn": "House Wiring", "categoryIcon": "bolt",
      "phone": "9826011102", "whatsapp": "9826011102",
      "photo": null,
      "address": { "line1": "Vijay Nagar, Indore", "area": "Vijay Nagar",
                   "city": "Indore", "cityId": "indore", "pincode": "452010" },
      "location": { "lat": 22.7406, "lng": 75.8877 },
      "isOpenNow": true, "verified": "verified",
      "ratingAvg": 4.6, "ratingCount": 41,
      "distance": 2850, "distanceText": "2.9 km",
      "priceHint": "₹250 visit",
      "skills": ["House wiring", "MCB", "Inverter"],
      "availability": { "manualOpen": true, "hours": { "open": "09:00", "close": "19:00" }, "offDays": [0] },
      "languages": ["hi", "en"]
    }
  ]
}
```

### 6.2 Auth (phone OTP + Google)

| Method | Path | Body → Result |
|---|---|---|
| POST | `/auth/request-otp` | `{phone}` → `{ok, devOtp}` (prod: SMS sent, no devOtp) |
| POST | `/auth/verify-otp` | `{phone, code, name?}` → `{token, user}` |
| POST | `/auth/google` | `{email, name}` (prod: Google ID token) → `{token, user}` |
| GET | `/auth/me` | → `{user}` |
| POST | `/auth/logout` | → `{ok}` |

```http
POST /api/auth/verify-otp   { "phone": "9876543210", "code": "123456", "name": "Rekha Devi" }
→ { "token": "59f1…", "user": { "id": "u_…", "phone": "9876543210", "name": "Rekha Devi", "role": "user" } }
```

### 6.3 Seeker + Provider (auth required)

| Method | Path | Purpose |
|---|---|---|
| GET/POST/DELETE | `/favorites[/:providerId]` | Save/bookmark favourites |
| POST | `/leads` | `{providerId, type: call\|whatsapp\|directions}` — fired on contact tap |
| POST | `/providers/:id/reviews` | `{rating 1-5, text}` (one per user; weighted rollup) |
| POST | `/reports` | `{providerId, reason}` — flag a listing |
| POST | `/providers/register` | ★ Self-onboarding → `verified:'pending'` |
| GET | `/me/providers` | Provider dashboard: my listings + status + lead counts |
| GET | `/me/leads` | My lead feed |
| PUT | `/providers/:id` | Edit own listing (owner or admin) |
| POST | `/providers/:id/availability` | `{open: true\|false}` one-tap toggle |

```http
POST /api/providers/register
{
  "name": "Rekha Devi", "businessName": "Devi Boutique",
  "categoryId": "tailor", "subcategory": "boutique",
  "phone": "9876543210", "whatsapp": "9876543210",
  "cityId": "indore", "address": "22, Sarafa Bazaar", "area": "Sarafa",
  "pincode": "452002", "lat": 22.722, "lng": 75.861,
  "about": "Blouse, suit, kurti — 15 saal ka anubhav",
  "skills": ["Blouse stitching", "Bridal"], "priceHint": "₹150 blouse onwards",
  "open": "10:00", "close": "20:00", "offDays": [0],
  "kycName": "Rekha Devi", "photo": "data:image/jpeg;base64,…"
}
→ 201 { "ok": true, "provider": { "id": "prv_…", "verified": "pending" },
        "message": "Verification ke liye bhej diya gaya…" }
```

### 6.4 Admin (role `admin`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | Totals, by-city, by-category, recent searches |
| GET | `/admin/providers?status=&q=` | List/filter listings (verification queue) |
| POST | `/admin/providers` | Manual add (instantly `verified`, `source:'admin'`) |
| POST | `/admin/providers/:id/verify` \| `/reject` | Approval queue actions |
| PUT/DELETE | `/admin/providers/:id` | Full edit / remove |
| POST | `/admin/providers/bulk` | `{csv}` bulk onboarding (validated per row) |
| GET/POST/PUT/DELETE | `/admin/categories[/:id]` | Category & subcategory management |
| GET | `/admin/reports` · POST `/admin/reports/:id/resolve` | Moderation queue |

```http
POST /api/admin/providers/bulk
{ "csv": "name,businessName,category,subcategory,phone,whatsapp,address,area,cityId,state,pincode,lat,lng,about
          Ramesh Kumar,Ramesh Tailors,tailor,alteration,9812345678,9812345678,MG Road 12,Sarafa,indore,Madhya Pradesh,452002,22.72,75.85,20 saal ka tajurba" }
→ { "added": 1, "skipped": [], "rows": ["Ramesh Kumar"] }
```

### 6.5 Notifications contract (Phase 2, FCM data payload)

```json
{ "to": "<fcm_token>", "data": {
    "type": "new_lead", "providerId": "prv_…", "leadType": "whatsapp",
    "title_hi": "नई लीड! 🔔", "body_hi": "किसी ने व्हाट्सएप किया — अभी देखें",
    "title_en": "New lead! 🔔",  "body_en": "Someone tapped WhatsApp — view now" } }
```

---

## 7. UI/UX Flows — 3 Key Screens

**Global UX rules (target users: low tech-literacy, ₹5–8k phones, 2G/3G):**
- Every primary target ≥ 48×48 px; primary actions are **icon + one word** (Call / WhatsApp).
- **Icon-first:** category grid carries icons + ≤2-word labels (देवनागरी + Latin).
- Colour meaning is consistent app-wide: 🟠 amber = primary/verified · 🟢 green = open/WhatsApp ·
  ⚫ dark = directions/tools · 🔴 red = closed/danger.
- One-thumb reach: search up top, actions in the lower half, persistent 4-tab bottom nav
  (होम · खोज · सेव · खाता). No hamburger menus.
- Language toggle **EN | हि** always visible in the top bar (instant switch, no reload).
- Offline/2G: cached shell + stale results + honest offline banner; images are SVG monograms
  or compressed WebP; maps load only on the Map tab.

### 7.1 Screen A — Home / Search

```
┌──────────────────────────────────────┐
│ [◉] Labors Near Me    📍Indore ▾  EN │  ← city + language (top, always)
│                                      │
│  Find trusted workers near you 👷    │
│  ────────────────────────────────    │
│  [🔍 Try "electrician near me"…][गो] │  ← BIG search field + go button
│  🕘 recent: electrician | raj mistri │  ← recent searches (local, clearable)
│  🔥 popular: tailor · plumber · bhandara
│                                      │
│  ── All categories ──────────────    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │ ⚡ │ │ 🧵 │ │ 🧱 │ │ 🔧 │ …      │  ← 4-col ICON grid (12 categories)
│  │इले.| │दर्जी│ │राज │ │प्लं│        │     tap → search results (category filter)
│  └────┘ └────┘ └────┘ └────┘        │
│  ── Top rated near you ── (scroll ►) │  ← horizontal mini-cards (rating, dist)
│  ┌────────────────────────────┐      │
│  │ + Are you a worker?        │ →    │  ← provider onboarding CTA
│  │   List your services FREE  │      │
│  ├────────────────────────────┤      │
│  │ 🟢 Share this app (WhatsApp)│ →   │  ← growth loop
│  └────────────────────────────┘      │
│ [🏠 होम][🔍 खोज][❤ सेव][👤 खाता]    │  ← 4 big tabs
└──────────────────────────────────────┘
```

**Flow:** open app → GPS prompt once (`Use my location`) with graceful fallback to the city
picker → type *or* tap a category *or* a recent/popular chip → results. First-use search must
work with **zero logins** (login only for save/review/register).

### 7.2 Screen B — Provider Detail

```
┌──────────────────────────────────────┐
│ ← Back                    ♡  [Share] │
│ ┌─────┐  Qureshi Tailors & Boutique  │
│ │photo│  👔 Tailor · Blouse/Suit      │
│ └─────┘  ★ 4.9 (88 समीक्षाएं)        │
│           [● अभी खुला] [✓ सत्यापित]  │
│           [📍 540 m दूर]              │
│                                      │
│ [ 📞    ] [ 💬     ] [ 🧭      ] [↗] │  ← 4 BIG actions: Call | WhatsApp |
│ │ कॉल  │ │WhatsApp│ │ रास्ता  │ │शेयर│     Directions | Share  (icon+label)
│                                      │
│ ── परिचय / About ─────────────────   │
│ "Blouse, suit, kurti silai — 24      │
│  ghante me delivery…"                │
│ ── सेवाएं ─────────────────────────  │
│ [Blouse stitching][Suit][Bridal]     │  ← skill chips
│ शुल्क: ₹150 blouse onwards           │
│ ── पता ────────────────────────────  │
│ 📍 Itwaria Bazaar, Sarafa, 452002    │
│ 🕐 09:00–19:00 (रवि बंद)             │
│ ┌────────────────────────────┐       │
│ │        [live map + pin]    │[🧭रास्ता]│ ← tap → Google Maps directions
│ └────────────────────────────┘       │
│ ── समीक्षाएं / Reviews (88) ───────  │
│ ★★★★★ Farida B. · 33d               │
│ "Blouse fitting perfect!…"           │
│ [★★★★★ आपका अनुभव…] [ जमा करें ]    │  ← review (login-gated)
│ ⚑ रिपोर्ट                           │
└──────────────────────────────────────┘
```

**Flow:** from any result card or map pin → profile. Taps on Call/WhatsApp/Directions open the
native dialer / `wa.me` / Maps **and silently log a lead** (no login required — zero friction);
favourite heart and review require a one-time OTP login. Verification badge (green) and
"Open now" (live from working hours + provider toggle) are the two trust signals that convert.

### 7.3 Screen C — Provider Registration (3-step wizard)

```
 Step indicator:  ▬▬▬▬  ─────  ─────        Step 1/3 — आपकी जानकारी
┌──────────────────────────────────────┐
│ अपनी सेवा लिस्ट करें — मुफ्त 👷      │  ← value prop first ("free", "3 minutes")
│ ग्राहक पाएं — सिर्फ 3 मिनट           │
│                                      │
│ नाम / Name *                         │
│ [ Rekha Devi                        ]│  ← prefilled from login (phone already known)
│ दुकान / Business (optional)          │
│ [ Devi Boutique                     ]│
│ सेवा श्रेणी / Category *             │
│ [ 👔 Tailor                    ▾ ]   │  ← icon picker, BIG rows
│ विशेषज्ञता / Specialisation          │
│ [ Boutique / Designer          ▾ ]   │
│ WhatsApp नंबर                        │
│ [ 9876543210 ] (same as phone ✓)     │
│                                      │
│ [                 आगे →             ] │  ← full-width primary
└──────────────────────────────────────┘

 Step 2/3 — पता और लोकेशन
  शहर [इंदौर ▾] · पता [ 22, Sarafa Bazaar          ]
  इलाका [Sarafa] · पिन [452002]
  ┌────────────────────────────┐
  │   [  tap map to drop pin 📌 ]  │   [📍 GPS उपयोग करें]
  └────────────────────────────┘

 Step 3/3 — फोटो और ID प्रमाण
  [ 📷 फोटो जोड़ें ]  (camera capture)
  परिचय [Blouse, suit…]
  सेवाएं [Blouse stitching, Bridal] · शुल्क [₹150 onwards]
  खुलने [10:00] · बंद [20:00]
  🪪 ID पर नाम [Rekha Devi]
  (hint: ID सिर्फ एडमिन देखता है — ग्राहक को नंबर ही दिखता है)
  [           सत्यापन के लिए भेजें ✅         ]

  ✅ Application submitted!   (big confirmation)
  "एडमिन सत्यापन 24–48 घंटे — लाइव होते ही SMS/पुश मिलेगा"
  [ मेरा डैशबोर्ड → ]
```

**Flow:** CTA on Home/Account (or auto-prompt after a seeker's 3rd session) → login is required
only when submitting (phone already captured by OTP) → 3 steps with progress bar, **draft state
kept in memory** so Back never loses data → map pin (or GPS) sets the live location → photo is
optional at submit (listings without photos get colour monograms) → status `pending` → admin
queue (§5 Phase 3) → **push/SMS "आपकी लिस्टिंग लाइव है!"** → dashboard with availability toggle
and lead feed. Copy is Hindi-first with English mirrors; every step shows *one* primary button.

---

### Appendix — MVP demo credentials (this workspace build)

| Role | Phone | OTP |
|---|---|---|
| Admin | `9000000001` | `123456` |
| Demo seeker | `9000000002` | `123456` |
| Any new user | any 10-digit starting 6–9 | `123456` (demo mode) |

Run: `cd backend && npm start` → open `http://localhost:3000` (or the shared preview URL).
````

## 📄 `web/vendor/leaflet/leaflet.js`

````javascript
/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).leaflet={})}(this,function(t){"use strict";function l(t){for(var e,i,n=1,o=arguments.length;n<o;n++)for(e in i=arguments[n])t[e]=i[e];return t}var R=Object.create||function(t){return N.prototype=t,new N};function N(){}function a(t,e){var i,n=Array.prototype.slice;return t.bind?t.bind.apply(t,n.call(arguments,1)):(i=n.call(arguments,2),function(){return t.apply(e,i.length?i.concat(n.call(arguments)):arguments)})}var D=0;function h(t){return"_leaflet_id"in t||(t._leaflet_id=++D),t._leaflet_id}function j(t,e,i){var n,o,s=function(){n=!1,o&&(r.apply(i,o),o=!1)},r=function(){n?o=arguments:(t.apply(i,arguments),setTimeout(s,e),n=!0)};return r}function H(t,e,i){var n=e[1],e=e[0],o=n-e;return t===n&&i?t:((t-e)%o+o)%o+e}function u(){return!1}function i(t,e){return!1===e?t:(e=Math.pow(10,void 0===e?6:e),Math.round(t*e)/e)}function W(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function F(t){return W(t).split(/\s+/)}function c(t,e){for(var i in Object.prototype.hasOwnProperty.call(t,"options")||(t.options=t.options?R(t.options):{}),e)t.options[i]=e[i];return t.options}function U(t,e,i){var n,o=[];for(n in t)o.push(encodeURIComponent(i?n.toUpperCase():n)+"="+encodeURIComponent(t[n]));return(e&&-1!==e.indexOf("?")?"&":"?")+o.join("&")}var V=/\{ *([\w_ -]+) *\}/g;function q(t,i){return t.replace(V,function(t,e){e=i[e];if(void 0===e)throw new Error("No value provided for variable "+t);return e="function"==typeof e?e(i):e})}var d=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)};function G(t,e){for(var i=0;i<t.length;i++)if(t[i]===e)return i;return-1}var K="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";function Y(t){return window["webkit"+t]||window["moz"+t]||window["ms"+t]}var X=0;function J(t){var e=+new Date,i=Math.max(0,16-(e-X));return X=e+i,window.setTimeout(t,i)}var $=window.requestAnimationFrame||Y("RequestAnimationFrame")||J,Q=window.cancelAnimationFrame||Y("CancelAnimationFrame")||Y("CancelRequestAnimationFrame")||function(t){window.clearTimeout(t)};function x(t,e,i){if(!i||$!==J)return $.call(window,a(t,e));t.call(e)}function r(t){t&&Q.call(window,t)}var tt={__proto__:null,extend:l,create:R,bind:a,get lastId(){return D},stamp:h,throttle:j,wrapNum:H,falseFn:u,formatNum:i,trim:W,splitWords:F,setOptions:c,getParamString:U,template:q,isArray:d,indexOf:G,emptyImageUrl:K,requestFn:$,cancelFn:Q,requestAnimFrame:x,cancelAnimFrame:r};function et(){}et.extend=function(t){function e(){c(this),this.initialize&&this.initialize.apply(this,arguments),this.callInitHooks()}var i,n=e.__super__=this.prototype,o=R(n);for(i in(o.constructor=e).prototype=o,this)Object.prototype.hasOwnProperty.call(this,i)&&"prototype"!==i&&"__super__"!==i&&(e[i]=this[i]);if(t.statics&&l(e,t.statics),t.includes){var s=t.includes;if("undefined"!=typeof L&&L&&L.Mixin){s=d(s)?s:[s];for(var r=0;r<s.length;r++)s[r]===L.Mixin.Events&&console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.",(new Error).stack)}l.apply(null,[o].concat(t.includes))}return l(o,t),delete o.statics,delete o.includes,o.options&&(o.options=n.options?R(n.options):{},l(o.options,t.options)),o._initHooks=[],o.callInitHooks=function(){if(!this._initHooksCalled){n.callInitHooks&&n.callInitHooks.call(this),this._initHooksCalled=!0;for(var t=0,e=o._initHooks.length;t<e;t++)o._initHooks[t].call(this)}},e},et.include=function(t){var e=this.prototype.options;return l(this.prototype,t),t.options&&(this.prototype.options=e,this.mergeOptions(t.options)),this},et.mergeOptions=function(t){return l(this.prototype.options,t),this},et.addInitHook=function(t){var e=Array.prototype.slice.call(arguments,1),i="function"==typeof t?t:function(){this[t].apply(this,e)};return this.prototype._initHooks=this.prototype._initHooks||[],this.prototype._initHooks.push(i),this};var e={on:function(t,e,i){if("object"==typeof t)for(var n in t)this._on(n,t[n],e);else for(var o=0,s=(t=F(t)).length;o<s;o++)this._on(t[o],e,i);return this},off:function(t,e,i){if(arguments.length)if("object"==typeof t)for(var n in t)this._off(n,t[n],e);else{t=F(t);for(var o=1===arguments.length,s=0,r=t.length;s<r;s++)o?this._off(t[s]):this._off(t[s],e,i)}else delete this._events;return this},_on:function(t,e,i,n){"function"!=typeof e?console.warn("wrong listener type: "+typeof e):!1===this._listens(t,e,i)&&(e={fn:e,ctx:i=i===this?void 0:i},n&&(e.once=!0),this._events=this._events||{},this._events[t]=this._events[t]||[],this._events[t].push(e))},_off:function(t,e,i){var n,o,s;if(this._events&&(n=this._events[t]))if(1===arguments.length){if(this._firingCount)for(o=0,s=n.length;o<s;o++)n[o].fn=u;delete this._events[t]}else"function"!=typeof e?console.warn("wrong listener type: "+typeof e):!1!==(e=this._listens(t,e,i))&&(i=n[e],this._firingCount&&(i.fn=u,this._events[t]=n=n.slice()),n.splice(e,1))},fire:function(t,e,i){if(this.listens(t,i)){var n=l({},e,{type:t,target:this,sourceTarget:e&&e.sourceTarget||this});if(this._events){var o=this._events[t];if(o){this._firingCount=this._firingCount+1||1;for(var s=0,r=o.length;s<r;s++){var a=o[s],h=a.fn;a.once&&this.off(t,h,a.ctx),h.call(a.ctx||this,n)}this._firingCount--}}i&&this._propagateEvent(n)}return this},listens:function(t,e,i,n){"string"!=typeof t&&console.warn('"string" type argument expected');var o=e,s=("function"!=typeof e&&(n=!!e,i=o=void 0),this._events&&this._events[t]);if(s&&s.length&&!1!==this._listens(t,o,i))return!0;if(n)for(var r in this._eventParents)if(this._eventParents[r].listens(t,e,i,n))return!0;return!1},_listens:function(t,e,i){if(this._events){var n=this._events[t]||[];if(!e)return!!n.length;i===this&&(i=void 0);for(var o=0,s=n.length;o<s;o++)if(n[o].fn===e&&n[o].ctx===i)return o}return!1},once:function(t,e,i){if("object"==typeof t)for(var n in t)this._on(n,t[n],e,!0);else for(var o=0,s=(t=F(t)).length;o<s;o++)this._on(t[o],e,i,!0);return this},addEventParent:function(t){return this._eventParents=this._eventParents||{},this._eventParents[h(t)]=t,this},removeEventParent:function(t){return this._eventParents&&delete this._eventParents[h(t)],this},_propagateEvent:function(t){for(var e in this._eventParents)this._eventParents[e].fire(t.type,l({layer:t.target,propagatedFrom:t.target},t),!0)}},it=(e.addEventListener=e.on,e.removeEventListener=e.clearAllEventListeners=e.off,e.addOneTimeEventListener=e.once,e.fireEvent=e.fire,e.hasEventListeners=e.listens,et.extend(e));function p(t,e,i){this.x=i?Math.round(t):t,this.y=i?Math.round(e):e}var nt=Math.trunc||function(t){return 0<t?Math.floor(t):Math.ceil(t)};function m(t,e,i){return t instanceof p?t:d(t)?new p(t[0],t[1]):null==t?t:"object"==typeof t&&"x"in t&&"y"in t?new p(t.x,t.y):new p(t,e,i)}function f(t,e){if(t)for(var i=e?[t,e]:t,n=0,o=i.length;n<o;n++)this.extend(i[n])}function _(t,e){return!t||t instanceof f?t:new f(t,e)}function s(t,e){if(t)for(var i=e?[t,e]:t,n=0,o=i.length;n<o;n++)this.extend(i[n])}function g(t,e){return t instanceof s?t:new s(t,e)}function v(t,e,i){if(isNaN(t)||isNaN(e))throw new Error("Invalid LatLng object: ("+t+", "+e+")");this.lat=+t,this.lng=+e,void 0!==i&&(this.alt=+i)}function w(t,e,i){return t instanceof v?t:d(t)&&"object"!=typeof t[0]?3===t.length?new v(t[0],t[1],t[2]):2===t.length?new v(t[0],t[1]):null:null==t?t:"object"==typeof t&&"lat"in t?new v(t.lat,"lng"in t?t.lng:t.lon,t.alt):void 0===e?null:new v(t,e,i)}p.prototype={clone:function(){return new p(this.x,this.y)},add:function(t){return this.clone()._add(m(t))},_add:function(t){return this.x+=t.x,this.y+=t.y,this},subtract:function(t){return this.clone()._subtract(m(t))},_subtract:function(t){return this.x-=t.x,this.y-=t.y,this},divideBy:function(t){return this.clone()._divideBy(t)},_divideBy:function(t){return this.x/=t,this.y/=t,this},multiplyBy:function(t){return this.clone()._multiplyBy(t)},_multiplyBy:function(t){return this.x*=t,this.y*=t,this},scaleBy:function(t){return new p(this.x*t.x,this.y*t.y)},unscaleBy:function(t){return new p(this.x/t.x,this.y/t.y)},round:function(){return this.clone()._round()},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},floor:function(){return this.clone()._floor()},_floor:function(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this},ceil:function(){return this.clone()._ceil()},_ceil:function(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this},trunc:function(){return this.clone()._trunc()},_trunc:function(){return this.x=nt(this.x),this.y=nt(this.y),this},distanceTo:function(t){var e=(t=m(t)).x-this.x,t=t.y-this.y;return Math.sqrt(e*e+t*t)},equals:function(t){return(t=m(t)).x===this.x&&t.y===this.y},contains:function(t){return t=m(t),Math.abs(t.x)<=Math.abs(this.x)&&Math.abs(t.y)<=Math.abs(this.y)},toString:function(){return"Point("+i(this.x)+", "+i(this.y)+")"}},f.prototype={extend:function(t){var e,i;if(t){if(t instanceof p||"number"==typeof t[0]||"x"in t)e=i=m(t);else if(e=(t=_(t)).min,i=t.max,!e||!i)return this;this.min||this.max?(this.min.x=Math.min(e.x,this.min.x),this.max.x=Math.max(i.x,this.max.x),this.min.y=Math.min(e.y,this.min.y),this.max.y=Math.max(i.y,this.max.y)):(this.min=e.clone(),this.max=i.clone())}return this},getCenter:function(t){return m((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,t)},getBottomLeft:function(){return m(this.min.x,this.max.y)},getTopRight:function(){return m(this.max.x,this.min.y)},getTopLeft:function(){return this.min},getBottomRight:function(){return this.max},getSize:function(){return this.max.subtract(this.min)},contains:function(t){var e,i;return(t=("number"==typeof t[0]||t instanceof p?m:_)(t))instanceof f?(e=t.min,i=t.max):e=i=t,e.x>=this.min.x&&i.x<=this.max.x&&e.y>=this.min.y&&i.y<=this.max.y},intersects:function(t){t=_(t);var e=this.min,i=this.max,n=t.min,t=t.max,o=t.x>=e.x&&n.x<=i.x,t=t.y>=e.y&&n.y<=i.y;return o&&t},overlaps:function(t){t=_(t);var e=this.min,i=this.max,n=t.min,t=t.max,o=t.x>e.x&&n.x<i.x,t=t.y>e.y&&n.y<i.y;return o&&t},isValid:function(){return!(!this.min||!this.max)},pad:function(t){var e=this.min,i=this.max,n=Math.abs(e.x-i.x)*t,t=Math.abs(e.y-i.y)*t;return _(m(e.x-n,e.y-t),m(i.x+n,i.y+t))},equals:function(t){return!!t&&(t=_(t),this.min.equals(t.getTopLeft())&&this.max.equals(t.getBottomRight()))}},s.prototype={extend:function(t){var e,i,n=this._southWest,o=this._northEast;if(t instanceof v)i=e=t;else{if(!(t instanceof s))return t?this.extend(w(t)||g(t)):this;if(e=t._southWest,i=t._northEast,!e||!i)return this}return n||o?(n.lat=Math.min(e.lat,n.lat),n.lng=Math.min(e.lng,n.lng),o.lat=Math.max(i.lat,o.lat),o.lng=Math.max(i.lng,o.lng)):(this._southWest=new v(e.lat,e.lng),this._northEast=new v(i.lat,i.lng)),this},pad:function(t){var e=this._southWest,i=this._northEast,n=Math.abs(e.lat-i.lat)*t,t=Math.abs(e.lng-i.lng)*t;return new s(new v(e.lat-n,e.lng-t),new v(i.lat+n,i.lng+t))},getCenter:function(){return new v((this._southWest.lat+this._northEast.lat)/2,(this._southWest.lng+this._northEast.lng)/2)},getSouthWest:function(){return this._southWest},getNorthEast:function(){return this._northEast},getNorthWest:function(){return new v(this.getNorth(),this.getWest())},getSouthEast:function(){return new v(this.getSouth(),this.getEast())},getWest:function(){return this._southWest.lng},getSouth:function(){return this._southWest.lat},getEast:function(){return this._northEast.lng},getNorth:function(){return this._northEast.lat},contains:function(t){t=("number"==typeof t[0]||t instanceof v||"lat"in t?w:g)(t);var e,i,n=this._southWest,o=this._northEast;return t instanceof s?(e=t.getSouthWest(),i=t.getNorthEast()):e=i=t,e.lat>=n.lat&&i.lat<=o.lat&&e.lng>=n.lng&&i.lng<=o.lng},intersects:function(t){t=g(t);var e=this._southWest,i=this._northEast,n=t.getSouthWest(),t=t.getNorthEast(),o=t.lat>=e.lat&&n.lat<=i.lat,t=t.lng>=e.lng&&n.lng<=i.lng;return o&&t},overlaps:function(t){t=g(t);var e=this._southWest,i=this._northEast,n=t.getSouthWest(),t=t.getNorthEast(),o=t.lat>e.lat&&n.lat<i.lat,t=t.lng>e.lng&&n.lng<i.lng;return o&&t},toBBoxString:function(){return[this.getWest(),this.getSouth(),this.getEast(),this.getNorth()].join(",")},equals:function(t,e){return!!t&&(t=g(t),this._southWest.equals(t.getSouthWest(),e)&&this._northEast.equals(t.getNorthEast(),e))},isValid:function(){return!(!this._southWest||!this._northEast)}};var ot={latLngToPoint:function(t,e){t=this.projection.project(t),e=this.scale(e);return this.transformation._transform(t,e)},pointToLatLng:function(t,e){e=this.scale(e),t=this.transformation.untransform(t,e);return this.projection.unproject(t)},project:function(t){return this.projection.project(t)},unproject:function(t){return this.projection.unproject(t)},scale:function(t){return 256*Math.pow(2,t)},zoom:function(t){return Math.log(t/256)/Math.LN2},getProjectedBounds:function(t){var e;return this.infinite?null:(e=this.projection.bounds,t=this.scale(t),new f(this.transformation.transform(e.min,t),this.transformation.transform(e.max,t)))},infinite:!(v.prototype={equals:function(t,e){return!!t&&(t=w(t),Math.max(Math.abs(this.lat-t.lat),Math.abs(this.lng-t.lng))<=(void 0===e?1e-9:e))},toString:function(t){return"LatLng("+i(this.lat,t)+", "+i(this.lng,t)+")"},distanceTo:function(t){return st.distance(this,w(t))},wrap:function(){return st.wrapLatLng(this)},toBounds:function(t){var t=180*t/40075017,e=t/Math.cos(Math.PI/180*this.lat);return g([this.lat-t,this.lng-e],[this.lat+t,this.lng+e])},clone:function(){return new v(this.lat,this.lng,this.alt)}}),wrapLatLng:function(t){var e=this.wrapLng?H(t.lng,this.wrapLng,!0):t.lng;return new v(this.wrapLat?H(t.lat,this.wrapLat,!0):t.lat,e,t.alt)},wrapLatLngBounds:function(t){var e=t.getCenter(),i=this.wrapLatLng(e),n=e.lat-i.lat,e=e.lng-i.lng;return 0==n&&0==e?t:(i=t.getSouthWest(),t=t.getNorthEast(),new s(new v(i.lat-n,i.lng-e),new v(t.lat-n,t.lng-e)))}},st=l({},ot,{wrapLng:[-180,180],R:6371e3,distance:function(t,e){var i=Math.PI/180,n=t.lat*i,o=e.lat*i,s=Math.sin((e.lat-t.lat)*i/2),e=Math.sin((e.lng-t.lng)*i/2),t=s*s+Math.cos(n)*Math.cos(o)*e*e,i=2*Math.atan2(Math.sqrt(t),Math.sqrt(1-t));return this.R*i}}),rt=6378137,rt={R:rt,MAX_LATITUDE:85.0511287798,project:function(t){var e=Math.PI/180,i=this.MAX_LATITUDE,i=Math.max(Math.min(i,t.lat),-i),i=Math.sin(i*e);return new p(this.R*t.lng*e,this.R*Math.log((1+i)/(1-i))/2)},unproject:function(t){var e=180/Math.PI;return new v((2*Math.atan(Math.exp(t.y/this.R))-Math.PI/2)*e,t.x*e/this.R)},bounds:new f([-(rt=rt*Math.PI),-rt],[rt,rt])};function at(t,e,i,n){d(t)?(this._a=t[0],this._b=t[1],this._c=t[2],this._d=t[3]):(this._a=t,this._b=e,this._c=i,this._d=n)}function ht(t,e,i,n){return new at(t,e,i,n)}at.prototype={transform:function(t,e){return this._transform(t.clone(),e)},_transform:function(t,e){return t.x=(e=e||1)*(this._a*t.x+this._b),t.y=e*(this._c*t.y+this._d),t},untransform:function(t,e){return new p((t.x/(e=e||1)-this._b)/this._a,(t.y/e-this._d)/this._c)}};var lt=l({},st,{code:"EPSG:3857",projection:rt,transformation:ht(lt=.5/(Math.PI*rt.R),.5,-lt,.5)}),ut=l({},lt,{code:"EPSG:900913"});function ct(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function dt(t,e){for(var i,n,o,s,r="",a=0,h=t.length;a<h;a++){for(i=0,n=(o=t[a]).length;i<n;i++)r+=(i?"L":"M")+(s=o[i]).x+" "+s.y;r+=e?b.svg?"z":"x":""}return r||"M0 0"}var _t=document.documentElement.style,pt="ActiveXObject"in window,mt=pt&&!document.addEventListener,n="msLaunchUri"in navigator&&!("documentMode"in document),ft=y("webkit"),gt=y("android"),vt=y("android 2")||y("android 3"),yt=parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1],10),yt=gt&&y("Google")&&yt<537&&!("AudioNode"in window),xt=!!window.opera,wt=!n&&y("chrome"),bt=y("gecko")&&!ft&&!xt&&!pt,Pt=!wt&&y("safari"),Lt=y("phantom"),o="OTransition"in _t,Tt=0===navigator.platform.indexOf("Win"),Mt=pt&&"transition"in _t,zt="WebKitCSSMatrix"in window&&"m11"in new window.WebKitCSSMatrix&&!vt,_t="MozPerspective"in _t,Ct=!window.L_DISABLE_3D&&(Mt||zt||_t)&&!o&&!Lt,Zt="undefined"!=typeof orientation||y("mobile"),St=Zt&&ft,Et=Zt&&zt,kt=!window.PointerEvent&&window.MSPointerEvent,Ot=!(!window.PointerEvent&&!kt),At="ontouchstart"in window||!!window.TouchEvent,Bt=!window.L_NO_TOUCH&&(At||Ot),It=Zt&&xt,Rt=Zt&&bt,Nt=1<(window.devicePixelRatio||window.screen.deviceXDPI/window.screen.logicalXDPI),Dt=function(){var t=!1;try{var e=Object.defineProperty({},"passive",{get:function(){t=!0}});window.addEventListener("testPassiveEventSupport",u,e),window.removeEventListener("testPassiveEventSupport",u,e)}catch(t){}return t}(),jt=!!document.createElement("canvas").getContext,Ht=!(!document.createElementNS||!ct("svg").createSVGRect),Wt=!!Ht&&((Wt=document.createElement("div")).innerHTML="<svg/>","http://www.w3.org/2000/svg"===(Wt.firstChild&&Wt.firstChild.namespaceURI));function y(t){return 0<=navigator.userAgent.toLowerCase().indexOf(t)}var b={ie:pt,ielt9:mt,edge:n,webkit:ft,android:gt,android23:vt,androidStock:yt,opera:xt,chrome:wt,gecko:bt,safari:Pt,phantom:Lt,opera12:o,win:Tt,ie3d:Mt,webkit3d:zt,gecko3d:_t,any3d:Ct,mobile:Zt,mobileWebkit:St,mobileWebkit3d:Et,msPointer:kt,pointer:Ot,touch:Bt,touchNative:At,mobileOpera:It,mobileGecko:Rt,retina:Nt,passiveEvents:Dt,canvas:jt,svg:Ht,vml:!Ht&&function(){try{var t=document.createElement("div"),e=(t.innerHTML='<v:shape adj="1"/>',t.firstChild);return e.style.behavior="url(#default#VML)",e&&"object"==typeof e.adj}catch(t){return!1}}(),inlineSvg:Wt,mac:0===navigator.platform.indexOf("Mac"),linux:0===navigator.platform.indexOf("Linux")},Ft=b.msPointer?"MSPointerDown":"pointerdown",Ut=b.msPointer?"MSPointerMove":"pointermove",Vt=b.msPointer?"MSPointerUp":"pointerup",qt=b.msPointer?"MSPointerCancel":"pointercancel",Gt={touchstart:Ft,touchmove:Ut,touchend:Vt,touchcancel:qt},Kt={touchstart:function(t,e){e.MSPOINTER_TYPE_TOUCH&&e.pointerType===e.MSPOINTER_TYPE_TOUCH&&O(e);ee(t,e)},touchmove:ee,touchend:ee,touchcancel:ee},Yt={},Xt=!1;function Jt(t,e,i){return"touchstart"!==e||Xt||(document.addEventListener(Ft,$t,!0),document.addEventListener(Ut,Qt,!0),document.addEventListener(Vt,te,!0),document.addEventListener(qt,te,!0),Xt=!0),Kt[e]?(i=Kt[e].bind(this,i),t.addEventListener(Gt[e],i,!1),i):(console.warn("wrong event specified:",e),u)}function $t(t){Yt[t.pointerId]=t}function Qt(t){Yt[t.pointerId]&&(Yt[t.pointerId]=t)}function te(t){delete Yt[t.pointerId]}function ee(t,e){if(e.pointerType!==(e.MSPOINTER_TYPE_MOUSE||"mouse")){for(var i in e.touches=[],Yt)e.touches.push(Yt[i]);e.changedTouches=[e],t(e)}}var ie=200;function ne(t,i){t.addEventListener("dblclick",i);var n,o=0;function e(t){var e;1!==t.detail?n=t.detail:"mouse"===t.pointerType||t.sourceCapabilities&&!t.sourceCapabilities.firesTouchEvents||((e=Ne(t)).some(function(t){return t instanceof HTMLLabelElement&&t.attributes.for})&&!e.some(function(t){return t instanceof HTMLInputElement||t instanceof HTMLSelectElement})||((e=Date.now())-o<=ie?2===++n&&i(function(t){var e,i,n={};for(i in t)e=t[i],n[i]=e&&e.bind?e.bind(t):e;return(t=n).type="dblclick",n.detail=2,n.isTrusted=!1,n._simulated=!0,n}(t)):n=1,o=e))}return t.addEventListener("click",e),{dblclick:i,simDblclick:e}}var oe,se,re,ae,he,le,ue=we(["transform","webkitTransform","OTransform","MozTransform","msTransform"]),ce=we(["webkitTransition","transition","OTransition","MozTransition","msTransition"]),de="webkitTransition"===ce||"OTransition"===ce?ce+"End":"transitionend";function _e(t){return"string"==typeof t?document.getElementById(t):t}function pe(t,e){var i=t.style[e]||t.currentStyle&&t.currentStyle[e];return"auto"===(i=i&&"auto"!==i||!document.defaultView?i:(t=document.defaultView.getComputedStyle(t,null))?t[e]:null)?null:i}function P(t,e,i){t=document.createElement(t);return t.className=e||"",i&&i.appendChild(t),t}function T(t){var e=t.parentNode;e&&e.removeChild(t)}function me(t){for(;t.firstChild;)t.removeChild(t.firstChild)}function fe(t){var e=t.parentNode;e&&e.lastChild!==t&&e.appendChild(t)}function ge(t){var e=t.parentNode;e&&e.firstChild!==t&&e.insertBefore(t,e.firstChild)}function ve(t,e){return void 0!==t.classList?t.classList.contains(e):0<(t=xe(t)).length&&new RegExp("(^|\\s)"+e+"(\\s|$)").test(t)}function M(t,e){var i;if(void 0!==t.classList)for(var n=F(e),o=0,s=n.length;o<s;o++)t.classList.add(n[o]);else ve(t,e)||ye(t,((i=xe(t))?i+" ":"")+e)}function z(t,e){void 0!==t.classList?t.classList.remove(e):ye(t,W((" "+xe(t)+" ").replace(" "+e+" "," ")))}function ye(t,e){void 0===t.className.baseVal?t.className=e:t.className.baseVal=e}function xe(t){return void 0===(t=t.correspondingElement?t.correspondingElement:t).className.baseVal?t.className:t.className.baseVal}function C(t,e){if("opacity"in t.style)t.style.opacity=e;else if("filter"in t.style){var i=!1,n="DXImageTransform.Microsoft.Alpha";try{i=t.filters.item(n)}catch(t){if(1===e)return}e=Math.round(100*e),i?(i.Enabled=100!==e,i.Opacity=e):t.style.filter+=" progid:"+n+"(opacity="+e+")"}}function we(t){for(var e=document.documentElement.style,i=0;i<t.length;i++)if(t[i]in e)return t[i];return!1}function be(t,e,i){e=e||new p(0,0);t.style[ue]=(b.ie3d?"translate("+e.x+"px,"+e.y+"px)":"translate3d("+e.x+"px,"+e.y+"px,0)")+(i?" scale("+i+")":"")}function Z(t,e){t._leaflet_pos=e,b.any3d?be(t,e):(t.style.left=e.x+"px",t.style.top=e.y+"px")}function Pe(t){return t._leaflet_pos||new p(0,0)}function Le(){S(window,"dragstart",O)}function Te(){k(window,"dragstart",O)}function Me(t){for(;-1===t.tabIndex;)t=t.parentNode;t.style&&(ze(),le=(he=t).style.outlineStyle,t.style.outlineStyle="none",S(window,"keydown",ze))}function ze(){he&&(he.style.outlineStyle=le,le=he=void 0,k(window,"keydown",ze))}function Ce(t){for(;!((t=t.parentNode).offsetWidth&&t.offsetHeight||t===document.body););return t}function Ze(t){var e=t.getBoundingClientRect();return{x:e.width/t.offsetWidth||1,y:e.height/t.offsetHeight||1,boundingClientRect:e}}ae="onselectstart"in document?(re=function(){S(window,"selectstart",O)},function(){k(window,"selectstart",O)}):(se=we(["userSelect","WebkitUserSelect","OUserSelect","MozUserSelect","msUserSelect"]),re=function(){var t;se&&(t=document.documentElement.style,oe=t[se],t[se]="none")},function(){se&&(document.documentElement.style[se]=oe,oe=void 0)});pt={__proto__:null,TRANSFORM:ue,TRANSITION:ce,TRANSITION_END:de,get:_e,getStyle:pe,create:P,remove:T,empty:me,toFront:fe,toBack:ge,hasClass:ve,addClass:M,removeClass:z,setClass:ye,getClass:xe,setOpacity:C,testProp:we,setTransform:be,setPosition:Z,getPosition:Pe,get disableTextSelection(){return re},get enableTextSelection(){return ae},disableImageDrag:Le,enableImageDrag:Te,preventOutline:Me,restoreOutline:ze,getSizedParentNode:Ce,getScale:Ze};function S(t,e,i,n){if(e&&"object"==typeof e)for(var o in e)ke(t,o,e[o],i);else for(var s=0,r=(e=F(e)).length;s<r;s++)ke(t,e[s],i,n);return this}var E="_leaflet_events";function k(t,e,i,n){if(1===arguments.length)Se(t),delete t[E];else if(e&&"object"==typeof e)for(var o in e)Oe(t,o,e[o],i);else if(e=F(e),2===arguments.length)Se(t,function(t){return-1!==G(e,t)});else for(var s=0,r=e.length;s<r;s++)Oe(t,e[s],i,n);return this}function Se(t,e){for(var i in t[E]){var n=i.split(/\d/)[0];e&&!e(n)||Oe(t,n,null,null,i)}}var Ee={mouseenter:"mouseover",mouseleave:"mouseout",wheel:!("onwheel"in window)&&"mousewheel"};function ke(e,t,i,n){var o,s,r=t+h(i)+(n?"_"+h(n):"");e[E]&&e[E][r]||(s=o=function(t){return i.call(n||e,t||window.event)},!b.touchNative&&b.pointer&&0===t.indexOf("touch")?o=Jt(e,t,o):b.touch&&"dblclick"===t?o=ne(e,o):"addEventListener"in e?"touchstart"===t||"touchmove"===t||"wheel"===t||"mousewheel"===t?e.addEventListener(Ee[t]||t,o,!!b.passiveEvents&&{passive:!1}):"mouseenter"===t||"mouseleave"===t?e.addEventListener(Ee[t],o=function(t){t=t||window.event,We(e,t)&&s(t)},!1):e.addEventListener(t,s,!1):e.attachEvent("on"+t,o),e[E]=e[E]||{},e[E][r]=o)}function Oe(t,e,i,n,o){o=o||e+h(i)+(n?"_"+h(n):"");var s,r,i=t[E]&&t[E][o];i&&(!b.touchNative&&b.pointer&&0===e.indexOf("touch")?(n=t,r=i,Gt[s=e]?n.removeEventListener(Gt[s],r,!1):console.warn("wrong event specified:",s)):b.touch&&"dblclick"===e?(n=i,(r=t).removeEventListener("dblclick",n.dblclick),r.removeEventListener("click",n.simDblclick)):"removeEventListener"in t?t.removeEventListener(Ee[e]||e,i,!1):t.detachEvent("on"+e,i),t[E][o]=null)}function Ae(t){return t.stopPropagation?t.stopPropagation():t.originalEvent?t.originalEvent._stopped=!0:t.cancelBubble=!0,this}function Be(t){return ke(t,"wheel",Ae),this}function Ie(t){return S(t,"mousedown touchstart dblclick contextmenu",Ae),t._leaflet_disable_click=!0,this}function O(t){return t.preventDefault?t.preventDefault():t.returnValue=!1,this}function Re(t){return O(t),Ae(t),this}function Ne(t){if(t.composedPath)return t.composedPath();for(var e=[],i=t.target;i;)e.push(i),i=i.parentNode;return e}function De(t,e){var i,n;return e?(n=(i=Ze(e)).boundingClientRect,new p((t.clientX-n.left)/i.x-e.clientLeft,(t.clientY-n.top)/i.y-e.clientTop)):new p(t.clientX,t.clientY)}var je=b.linux&&b.chrome?window.devicePixelRatio:b.mac?3*window.devicePixelRatio:0<window.devicePixelRatio?2*window.devicePixelRatio:1;function He(t){return b.edge?t.wheelDeltaY/2:t.deltaY&&0===t.deltaMode?-t.deltaY/je:t.deltaY&&1===t.deltaMode?20*-t.deltaY:t.deltaY&&2===t.deltaMode?60*-t.deltaY:t.deltaX||t.deltaZ?0:t.wheelDelta?(t.wheelDeltaY||t.wheelDelta)/2:t.detail&&Math.abs(t.detail)<32765?20*-t.detail:t.detail?t.detail/-32765*60:0}function We(t,e){var i=e.relatedTarget;if(!i)return!0;try{for(;i&&i!==t;)i=i.parentNode}catch(t){return!1}return i!==t}var mt={__proto__:null,on:S,off:k,stopPropagation:Ae,disableScrollPropagation:Be,disableClickPropagation:Ie,preventDefault:O,stop:Re,getPropagationPath:Ne,getMousePosition:De,getWheelDelta:He,isExternalTarget:We,addListener:S,removeListener:k},Fe=it.extend({run:function(t,e,i,n){this.stop(),this._el=t,this._inProgress=!0,this._duration=i||.25,this._easeOutPower=1/Math.max(n||.5,.2),this._startPos=Pe(t),this._offset=e.subtract(this._startPos),this._startTime=+new Date,this.fire("start"),this._animate()},stop:function(){this._inProgress&&(this._step(!0),this._complete())},_animate:function(){this._animId=x(this._animate,this),this._step()},_step:function(t){var e=+new Date-this._startTime,i=1e3*this._duration;e<i?this._runFrame(this._easeOut(e/i),t):(this._runFrame(1),this._complete())},_runFrame:function(t,e){t=this._startPos.add(this._offset.multiplyBy(t));e&&t._round(),Z(this._el,t),this.fire("step")},_complete:function(){r(this._animId),this._inProgress=!1,this.fire("end")},_easeOut:function(t){return 1-Math.pow(1-t,this._easeOutPower)}}),A=it.extend({options:{crs:lt,center:void 0,zoom:void 0,minZoom:void 0,maxZoom:void 0,layers:[],maxBounds:void 0,renderer:void 0,zoomAnimation:!0,zoomAnimationThreshold:4,fadeAnimation:!0,markerZoomAnimation:!0,transform3DLimit:8388608,zoomSnap:1,zoomDelta:1,trackResize:!0},initialize:function(t,e){e=c(this,e),this._handlers=[],this._layers={},this._zoomBoundLayers={},this._sizeChanged=!0,this._initContainer(t),this._initLayout(),this._onResize=a(this._onResize,this),this._initEvents(),e.maxBounds&&this.setMaxBounds(e.maxBounds),void 0!==e.zoom&&(this._zoom=this._limitZoom(e.zoom)),e.center&&void 0!==e.zoom&&this.setView(w(e.center),e.zoom,{reset:!0}),this.callInitHooks(),this._zoomAnimated=ce&&b.any3d&&!b.mobileOpera&&this.options.zoomAnimation,this._zoomAnimated&&(this._createAnimProxy(),S(this._proxy,de,this._catchTransitionEnd,this)),this._addLayers(this.options.layers)},setView:function(t,e,i){if((e=void 0===e?this._zoom:this._limitZoom(e),t=this._limitCenter(w(t),e,this.options.maxBounds),i=i||{},this._stop(),this._loaded&&!i.reset&&!0!==i)&&(void 0!==i.animate&&(i.zoom=l({animate:i.animate},i.zoom),i.pan=l({animate:i.animate,duration:i.duration},i.pan)),this._zoom!==e?this._tryAnimatedZoom&&this._tryAnimatedZoom(t,e,i.zoom):this._tryAnimatedPan(t,i.pan)))return clearTimeout(this._sizeTimer),this;return this._resetView(t,e,i.pan&&i.pan.noMoveStart),this},setZoom:function(t,e){return this._loaded?this.setView(this.getCenter(),t,{zoom:e}):(this._zoom=t,this)},zoomIn:function(t,e){return t=t||(b.any3d?this.options.zoomDelta:1),this.setZoom(this._zoom+t,e)},zoomOut:function(t,e){return t=t||(b.any3d?this.options.zoomDelta:1),this.setZoom(this._zoom-t,e)},setZoomAround:function(t,e,i){var n=this.getZoomScale(e),o=this.getSize().divideBy(2),t=(t instanceof p?t:this.latLngToContainerPoint(t)).subtract(o).multiplyBy(1-1/n),n=this.containerPointToLatLng(o.add(t));return this.setView(n,e,{zoom:i})},_getBoundsCenterZoom:function(t,e){e=e||{},t=t.getBounds?t.getBounds():g(t);var i=m(e.paddingTopLeft||e.padding||[0,0]),n=m(e.paddingBottomRight||e.padding||[0,0]),o=this.getBoundsZoom(t,!1,i.add(n));return(o="number"==typeof e.maxZoom?Math.min(e.maxZoom,o):o)===1/0?{center:t.getCenter(),zoom:o}:(e=n.subtract(i).divideBy(2),n=this.project(t.getSouthWest(),o),i=this.project(t.getNorthEast(),o),{center:this.unproject(n.add(i).divideBy(2).add(e),o),zoom:o})},fitBounds:function(t,e){if((t=g(t)).isValid())return t=this._getBoundsCenterZoom(t,e),this.setView(t.center,t.zoom,e);throw new Error("Bounds are not valid.")},fitWorld:function(t){return this.fitBounds([[-90,-180],[90,180]],t)},panTo:function(t,e){return this.setView(t,this._zoom,{pan:e})},panBy:function(t,e){var i;return e=e||{},(t=m(t).round()).x||t.y?(!0===e.animate||this.getSize().contains(t)?(this._panAnim||(this._panAnim=new Fe,this._panAnim.on({step:this._onPanTransitionStep,end:this._onPanTransitionEnd},this)),e.noMoveStart||this.fire("movestart"),!1!==e.animate?(M(this._mapPane,"leaflet-pan-anim"),i=this._getMapPanePos().subtract(t).round(),this._panAnim.run(this._mapPane,i,e.duration||.25,e.easeLinearity)):(this._rawPanBy(t),this.fire("move").fire("moveend"))):this._resetView(this.unproject(this.project(this.getCenter()).add(t)),this.getZoom()),this):this.fire("moveend")},flyTo:function(n,o,t){if(!1===(t=t||{}).animate||!b.any3d)return this.setView(n,o,t);this._stop();var s=this.project(this.getCenter()),r=this.project(n),e=this.getSize(),a=this._zoom,h=(n=w(n),o=void 0===o?a:o,Math.max(e.x,e.y)),i=h*this.getZoomScale(a,o),l=r.distanceTo(s)||1,u=1.42,c=u*u;function d(t){t=(i*i-h*h+(t?-1:1)*c*c*l*l)/(2*(t?i:h)*c*l),t=Math.sqrt(t*t+1)-t;return t<1e-9?-18:Math.log(t)}function _(t){return(Math.exp(t)-Math.exp(-t))/2}function p(t){return(Math.exp(t)+Math.exp(-t))/2}var m=d(0);function f(t){return h*(p(m)*(_(t=m+u*t)/p(t))-_(m))/c}var g=Date.now(),v=(d(1)-m)/u,y=t.duration?1e3*t.duration:1e3*v*.8;return this._moveStart(!0,t.noMoveStart),function t(){var e=(Date.now()-g)/y,i=(1-Math.pow(1-e,1.5))*v;e<=1?(this._flyToFrame=x(t,this),this._move(this.unproject(s.add(r.subtract(s).multiplyBy(f(i)/l)),a),this.getScaleZoom(h/(e=i,h*(p(m)/p(m+u*e))),a),{flyTo:!0})):this._move(n,o)._moveEnd(!0)}.call(this),this},flyToBounds:function(t,e){t=this._getBoundsCenterZoom(t,e);return this.flyTo(t.center,t.zoom,e)},setMaxBounds:function(t){return t=g(t),this.listens("moveend",this._panInsideMaxBounds)&&this.off("moveend",this._panInsideMaxBounds),t.isValid()?(this.options.maxBounds=t,this._loaded&&this._panInsideMaxBounds(),this.on("moveend",this._panInsideMaxBounds)):(this.options.maxBounds=null,this)},setMinZoom:function(t){var e=this.options.minZoom;return this.options.minZoom=t,this._loaded&&e!==t&&(this.fire("zoomlevelschange"),this.getZoom()<this.options.minZoom)?this.setZoom(t):this},setMaxZoom:function(t){var e=this.options.maxZoom;return this.options.maxZoom=t,this._loaded&&e!==t&&(this.fire("zoomlevelschange"),this.getZoom()>this.options.maxZoom)?this.setZoom(t):this},panInsideBounds:function(t,e){this._enforcingBounds=!0;var i=this.getCenter(),t=this._limitCenter(i,this._zoom,g(t));return i.equals(t)||this.panTo(t,e),this._enforcingBounds=!1,this},panInside:function(t,e){var i=m((e=e||{}).paddingTopLeft||e.padding||[0,0]),n=m(e.paddingBottomRight||e.padding||[0,0]),o=this.project(this.getCenter()),t=this.project(t),s=this.getPixelBounds(),i=_([s.min.add(i),s.max.subtract(n)]),s=i.getSize();return i.contains(t)||(this._enforcingBounds=!0,n=t.subtract(i.getCenter()),i=i.extend(t).getSize().subtract(s),o.x+=n.x<0?-i.x:i.x,o.y+=n.y<0?-i.y:i.y,this.panTo(this.unproject(o),e),this._enforcingBounds=!1),this},invalidateSize:function(t){if(!this._loaded)return this;t=l({animate:!1,pan:!0},!0===t?{animate:!0}:t);var e=this.getSize(),i=(this._sizeChanged=!0,this._lastCenter=null,this.getSize()),n=e.divideBy(2).round(),o=i.divideBy(2).round(),n=n.subtract(o);return n.x||n.y?(t.animate&&t.pan?this.panBy(n):(t.pan&&this._rawPanBy(n),this.fire("move"),t.debounceMoveend?(clearTimeout(this._sizeTimer),this._sizeTimer=setTimeout(a(this.fire,this,"moveend"),200)):this.fire("moveend")),this.fire("resize",{oldSize:e,newSize:i})):this},stop:function(){return this.setZoom(this._limitZoom(this._zoom)),this.options.zoomSnap||this.fire("viewreset"),this._stop()},locate:function(t){var e,i;return t=this._locateOptions=l({timeout:1e4,watch:!1},t),"geolocation"in navigator?(e=a(this._handleGeolocationResponse,this),i=a(this._handleGeolocationError,this),t.watch?this._locationWatchId=navigator.geolocation.watchPosition(e,i,t):navigator.geolocation.getCurrentPosition(e,i,t)):this._handleGeolocationError({code:0,message:"Geolocation not supported."}),this},stopLocate:function(){return navigator.geolocation&&navigator.geolocation.clearWatch&&navigator.geolocation.clearWatch(this._locationWatchId),this._locateOptions&&(this._locateOptions.setView=!1),this},_handleGeolocationError:function(t){var e;this._container._leaflet_id&&(e=t.code,t=t.message||(1===e?"permission denied":2===e?"position unavailable":"timeout"),this._locateOptions.setView&&!this._loaded&&this.fitWorld(),this.fire("locationerror",{code:e,message:"Geolocation error: "+t+"."}))},_handleGeolocationResponse:function(t){if(this._container._leaflet_id){var e,i,n=new v(t.coords.latitude,t.coords.longitude),o=n.toBounds(2*t.coords.accuracy),s=this._locateOptions,r=(s.setView&&(e=this.getBoundsZoom(o),this.setView(n,s.maxZoom?Math.min(e,s.maxZoom):e)),{latlng:n,bounds:o,timestamp:t.timestamp});for(i in t.coords)"number"==typeof t.coords[i]&&(r[i]=t.coords[i]);this.fire("locationfound",r)}},addHandler:function(t,e){return e&&(e=this[t]=new e(this),this._handlers.push(e),this.options[t]&&e.enable()),this},remove:function(){if(this._initEvents(!0),this.options.maxBounds&&this.off("moveend",this._panInsideMaxBounds),this._containerId!==this._container._leaflet_id)throw new Error("Map container is being reused by another instance");try{delete this._container._leaflet_id,delete this._containerId}catch(t){this._container._leaflet_id=void 0,this._containerId=void 0}for(var t in void 0!==this._locationWatchId&&this.stopLocate(),this._stop(),T(this._mapPane),this._clearControlPos&&this._clearControlPos(),this._resizeRequest&&(r(this._resizeRequest),this._resizeRequest=null),this._clearHandlers(),this._loaded&&this.fire("unload"),this._layers)this._layers[t].remove();for(t in this._panes)T(this._panes[t]);return this._layers=[],this._panes=[],delete this._mapPane,delete this._renderer,this},createPane:function(t,e){e=P("div","leaflet-pane"+(t?" leaflet-"+t.replace("Pane","")+"-pane":""),e||this._mapPane);return t&&(this._panes[t]=e),e},getCenter:function(){return this._checkIfLoaded(),this._lastCenter&&!this._moved()?this._lastCenter.clone():this.layerPointToLatLng(this._getCenterLayerPoint())},getZoom:function(){return this._zoom},getBounds:function(){var t=this.getPixelBounds();return new s(this.unproject(t.getBottomLeft()),this.unproject(t.getTopRight()))},getMinZoom:function(){return void 0===this.options.minZoom?this._layersMinZoom||0:this.options.minZoom},getMaxZoom:function(){return void 0===this.options.maxZoom?void 0===this._layersMaxZoom?1/0:this._layersMaxZoom:this.options.maxZoom},getBoundsZoom:function(t,e,i){t=g(t),i=m(i||[0,0]);var n=this.getZoom()||0,o=this.getMinZoom(),s=this.getMaxZoom(),r=t.getNorthWest(),t=t.getSouthEast(),i=this.getSize().subtract(i),t=_(this.project(t,n),this.project(r,n)).getSize(),r=b.any3d?this.options.zoomSnap:1,a=i.x/t.x,i=i.y/t.y,t=e?Math.max(a,i):Math.min(a,i),n=this.getScaleZoom(t,n);return r&&(n=Math.round(n/(r/100))*(r/100),n=e?Math.ceil(n/r)*r:Math.floor(n/r)*r),Math.max(o,Math.min(s,n))},getSize:function(){return this._size&&!this._sizeChanged||(this._size=new p(this._container.clientWidth||0,this._container.clientHeight||0),this._sizeChanged=!1),this._size.clone()},getPixelBounds:function(t,e){t=this._getTopLeftPoint(t,e);return new f(t,t.add(this.getSize()))},getPixelOrigin:function(){return this._checkIfLoaded(),this._pixelOrigin},getPixelWorldBounds:function(t){return this.options.crs.getProjectedBounds(void 0===t?this.getZoom():t)},getPane:function(t){return"string"==typeof t?this._panes[t]:t},getPanes:function(){return this._panes},getContainer:function(){return this._container},getZoomScale:function(t,e){var i=this.options.crs;return e=void 0===e?this._zoom:e,i.scale(t)/i.scale(e)},getScaleZoom:function(t,e){var i=this.options.crs,t=(e=void 0===e?this._zoom:e,i.zoom(t*i.scale(e)));return isNaN(t)?1/0:t},project:function(t,e){return e=void 0===e?this._zoom:e,this.options.crs.latLngToPoint(w(t),e)},unproject:function(t,e){return e=void 0===e?this._zoom:e,this.options.crs.pointToLatLng(m(t),e)},layerPointToLatLng:function(t){t=m(t).add(this.getPixelOrigin());return this.unproject(t)},latLngToLayerPoint:function(t){return this.project(w(t))._round()._subtract(this.getPixelOrigin())},wrapLatLng:function(t){return this.options.crs.wrapLatLng(w(t))},wrapLatLngBounds:function(t){return this.options.crs.wrapLatLngBounds(g(t))},distance:function(t,e){return this.options.crs.distance(w(t),w(e))},containerPointToLayerPoint:function(t){return m(t).subtract(this._getMapPanePos())},layerPointToContainerPoint:function(t){return m(t).add(this._getMapPanePos())},containerPointToLatLng:function(t){t=this.containerPointToLayerPoint(m(t));return this.layerPointToLatLng(t)},latLngToContainerPoint:function(t){return this.layerPointToContainerPoint(this.latLngToLayerPoint(w(t)))},mouseEventToContainerPoint:function(t){return De(t,this._container)},mouseEventToLayerPoint:function(t){return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(t))},mouseEventToLatLng:function(t){return this.layerPointToLatLng(this.mouseEventToLayerPoint(t))},_initContainer:function(t){t=this._container=_e(t);if(!t)throw new Error("Map container not found.");if(t._leaflet_id)throw new Error("Map container is already initialized.");S(t,"scroll",this._onScroll,this),this._containerId=h(t)},_initLayout:function(){var t=this._container,e=(this._fadeAnimated=this.options.fadeAnimation&&b.any3d,M(t,"leaflet-container"+(b.touch?" leaflet-touch":"")+(b.retina?" leaflet-retina":"")+(b.ielt9?" leaflet-oldie":"")+(b.safari?" leaflet-safari":"")+(this._fadeAnimated?" leaflet-fade-anim":"")),pe(t,"position"));"absolute"!==e&&"relative"!==e&&"fixed"!==e&&"sticky"!==e&&(t.style.position="relative"),this._initPanes(),this._initControlPos&&this._initControlPos()},_initPanes:function(){var t=this._panes={};this._paneRenderers={},this._mapPane=this.createPane("mapPane",this._container),Z(this._mapPane,new p(0,0)),this.createPane("tilePane"),this.createPane("overlayPane"),this.createPane("shadowPane"),this.createPane("markerPane"),this.createPane("tooltipPane"),this.createPane("popupPane"),this.options.markerZoomAnimation||(M(t.markerPane,"leaflet-zoom-hide"),M(t.shadowPane,"leaflet-zoom-hide"))},_resetView:function(t,e,i){Z(this._mapPane,new p(0,0));var n=!this._loaded,o=(this._loaded=!0,e=this._limitZoom(e),this.fire("viewprereset"),this._zoom!==e);this._moveStart(o,i)._move(t,e)._moveEnd(o),this.fire("viewreset"),n&&this.fire("load")},_moveStart:function(t,e){return t&&this.fire("zoomstart"),e||this.fire("movestart"),this},_move:function(t,e,i,n){void 0===e&&(e=this._zoom);var o=this._zoom!==e;return this._zoom=e,this._lastCenter=t,this._pixelOrigin=this._getNewPixelOrigin(t),n?i&&i.pinch&&this.fire("zoom",i):((o||i&&i.pinch)&&this.fire("zoom",i),this.fire("move",i)),this},_moveEnd:function(t){return t&&this.fire("zoomend"),this.fire("moveend")},_stop:function(){return r(this._flyToFrame),this._panAnim&&this._panAnim.stop(),this},_rawPanBy:function(t){Z(this._mapPane,this._getMapPanePos().subtract(t))},_getZoomSpan:function(){return this.getMaxZoom()-this.getMinZoom()},_panInsideMaxBounds:function(){this._enforcingBounds||this.panInsideBounds(this.options.maxBounds)},_checkIfLoaded:function(){if(!this._loaded)throw new Error("Set map center and zoom first.")},_initEvents:function(t){this._targets={};var e=t?k:S;e((this._targets[h(this._container)]=this)._container,"click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup",this._handleDOMEvent,this),this.options.trackResize&&e(window,"resize",this._onResize,this),b.any3d&&this.options.transform3DLimit&&(t?this.off:this.on).call(this,"moveend",this._onMoveEnd)},_onResize:function(){r(this._resizeRequest),this._resizeRequest=x(function(){this.invalidateSize({debounceMoveend:!0})},this)},_onScroll:function(){this._container.scrollTop=0,this._container.scrollLeft=0},_onMoveEnd:function(){var t=this._getMapPanePos();Math.max(Math.abs(t.x),Math.abs(t.y))>=this.options.transform3DLimit&&this._resetView(this.getCenter(),this.getZoom())},_findEventTargets:function(t,e){for(var i,n=[],o="mouseout"===e||"mouseover"===e,s=t.target||t.srcElement,r=!1;s;){if((i=this._targets[h(s)])&&("click"===e||"preclick"===e)&&this._draggableMoved(i)){r=!0;break}if(i&&i.listens(e,!0)){if(o&&!We(s,t))break;if(n.push(i),o)break}if(s===this._container)break;s=s.parentNode}return n=n.length||r||o||!this.listens(e,!0)?n:[this]},_isClickDisabled:function(t){for(;t&&t!==this._container;){if(t._leaflet_disable_click)return!0;t=t.parentNode}},_handleDOMEvent:function(t){var e,i=t.target||t.srcElement;!this._loaded||i._leaflet_disable_events||"click"===t.type&&this._isClickDisabled(i)||("mousedown"===(e=t.type)&&Me(i),this._fireDOMEvent(t,e))},_mouseEvents:["click","dblclick","mouseover","mouseout","contextmenu"],_fireDOMEvent:function(t,e,i){"click"===t.type&&((a=l({},t)).type="preclick",this._fireDOMEvent(a,a.type,i));var n=this._findEventTargets(t,e);if(i){for(var o=[],s=0;s<i.length;s++)i[s].listens(e,!0)&&o.push(i[s]);n=o.concat(n)}if(n.length){"contextmenu"===e&&O(t);var r,a=n[0],h={originalEvent:t};for("keypress"!==t.type&&"keydown"!==t.type&&"keyup"!==t.type&&(r=a.getLatLng&&(!a._radius||a._radius<=10),h.containerPoint=r?this.latLngToContainerPoint(a.getLatLng()):this.mouseEventToContainerPoint(t),h.layerPoint=this.containerPointToLayerPoint(h.containerPoint),h.latlng=r?a.getLatLng():this.layerPointToLatLng(h.layerPoint)),s=0;s<n.length;s++)if(n[s].fire(e,h,!0),h.originalEvent._stopped||!1===n[s].options.bubblingMouseEvents&&-1!==G(this._mouseEvents,e))return}},_draggableMoved:function(t){return(t=t.dragging&&t.dragging.enabled()?t:this).dragging&&t.dragging.moved()||this.boxZoom&&this.boxZoom.moved()},_clearHandlers:function(){for(var t=0,e=this._handlers.length;t<e;t++)this._handlers[t].disable()},whenReady:function(t,e){return this._loaded?t.call(e||this,{target:this}):this.on("load",t,e),this},_getMapPanePos:function(){return Pe(this._mapPane)||new p(0,0)},_moved:function(){var t=this._getMapPanePos();return t&&!t.equals([0,0])},_getTopLeftPoint:function(t,e){return(t&&void 0!==e?this._getNewPixelOrigin(t,e):this.getPixelOrigin()).subtract(this._getMapPanePos())},_getNewPixelOrigin:function(t,e){var i=this.getSize()._divideBy(2);return this.project(t,e)._subtract(i)._add(this._getMapPanePos())._round()},_latLngToNewLayerPoint:function(t,e,i){i=this._getNewPixelOrigin(i,e);return this.project(t,e)._subtract(i)},_latLngBoundsToNewLayerBounds:function(t,e,i){i=this._getNewPixelOrigin(i,e);return _([this.project(t.getSouthWest(),e)._subtract(i),this.project(t.getNorthWest(),e)._subtract(i),this.project(t.getSouthEast(),e)._subtract(i),this.project(t.getNorthEast(),e)._subtract(i)])},_getCenterLayerPoint:function(){return this.containerPointToLayerPoint(this.getSize()._divideBy(2))},_getCenterOffset:function(t){return this.latLngToLayerPoint(t).subtract(this._getCenterLayerPoint())},_limitCenter:function(t,e,i){var n,o;return!i||(n=this.project(t,e),o=this.getSize().divideBy(2),o=new f(n.subtract(o),n.add(o)),o=this._getBoundsOffset(o,i,e),Math.abs(o.x)<=1&&Math.abs(o.y)<=1)?t:this.unproject(n.add(o),e)},_limitOffset:function(t,e){var i;return e?(i=new f((i=this.getPixelBounds()).min.add(t),i.max.add(t)),t.add(this._getBoundsOffset(i,e))):t},_getBoundsOffset:function(t,e,i){e=_(this.project(e.getNorthEast(),i),this.project(e.getSouthWest(),i)),i=e.min.subtract(t.min),e=e.max.subtract(t.max);return new p(this._rebound(i.x,-e.x),this._rebound(i.y,-e.y))},_rebound:function(t,e){return 0<t+e?Math.round(t-e)/2:Math.max(0,Math.ceil(t))-Math.max(0,Math.floor(e))},_limitZoom:function(t){var e=this.getMinZoom(),i=this.getMaxZoom(),n=b.any3d?this.options.zoomSnap:1;return n&&(t=Math.round(t/n)*n),Math.max(e,Math.min(i,t))},_onPanTransitionStep:function(){this.fire("move")},_onPanTransitionEnd:function(){z(this._mapPane,"leaflet-pan-anim"),this.fire("moveend")},_tryAnimatedPan:function(t,e){t=this._getCenterOffset(t)._trunc();return!(!0!==(e&&e.animate)&&!this.getSize().contains(t))&&(this.panBy(t,e),!0)},_createAnimProxy:function(){var t=this._proxy=P("div","leaflet-proxy leaflet-zoom-animated");this._panes.mapPane.appendChild(t),this.on("zoomanim",function(t){var e=ue,i=this._proxy.style[e];be(this._proxy,this.project(t.center,t.zoom),this.getZoomScale(t.zoom,1)),i===this._proxy.style[e]&&this._animatingZoom&&this._onZoomTransitionEnd()},this),this.on("load moveend",this._animMoveEnd,this),this._on("unload",this._destroyAnimProxy,this)},_destroyAnimProxy:function(){T(this._proxy),this.off("load moveend",this._animMoveEnd,this),delete this._proxy},_animMoveEnd:function(){var t=this.getCenter(),e=this.getZoom();be(this._proxy,this.project(t,e),this.getZoomScale(e,1))},_catchTransitionEnd:function(t){this._animatingZoom&&0<=t.propertyName.indexOf("transform")&&this._onZoomTransitionEnd()},_nothingToAnimate:function(){return!this._container.getElementsByClassName("leaflet-zoom-animated").length},_tryAnimatedZoom:function(t,e,i){if(!this._animatingZoom){if(i=i||{},!this._zoomAnimated||!1===i.animate||this._nothingToAnimate()||Math.abs(e-this._zoom)>this.options.zoomAnimationThreshold)return!1;var n=this.getZoomScale(e),n=this._getCenterOffset(t)._divideBy(1-1/n);if(!0!==i.animate&&!this.getSize().contains(n))return!1;x(function(){this._moveStart(!0,i.noMoveStart||!1)._animateZoom(t,e,!0)},this)}return!0},_animateZoom:function(t,e,i,n){this._mapPane&&(i&&(this._animatingZoom=!0,this._animateToCenter=t,this._animateToZoom=e,M(this._mapPane,"leaflet-zoom-anim")),this.fire("zoomanim",{center:t,zoom:e,noUpdate:n}),this._tempFireZoomEvent||(this._tempFireZoomEvent=this._zoom!==this._animateToZoom),this._move(this._animateToCenter,this._animateToZoom,void 0,!0),setTimeout(a(this._onZoomTransitionEnd,this),250))},_onZoomTransitionEnd:function(){this._animatingZoom&&(this._mapPane&&z(this._mapPane,"leaflet-zoom-anim"),this._animatingZoom=!1,this._move(this._animateToCenter,this._animateToZoom,void 0,!0),this._tempFireZoomEvent&&this.fire("zoom"),delete this._tempFireZoomEvent,this.fire("move"),this._moveEnd(!0))}});function Ue(t){return new B(t)}var B=et.extend({options:{position:"topright"},initialize:function(t){c(this,t)},getPosition:function(){return this.options.position},setPosition:function(t){var e=this._map;return e&&e.removeControl(this),this.options.position=t,e&&e.addControl(this),this},getContainer:function(){return this._container},addTo:function(t){this.remove(),this._map=t;var e=this._container=this.onAdd(t),i=this.getPosition(),t=t._controlCorners[i];return M(e,"leaflet-control"),-1!==i.indexOf("bottom")?t.insertBefore(e,t.firstChild):t.appendChild(e),this._map.on("unload",this.remove,this),this},remove:function(){return this._map&&(T(this._container),this.onRemove&&this.onRemove(this._map),this._map.off("unload",this.remove,this),this._map=null),this},_refocusOnMap:function(t){this._map&&t&&0<t.screenX&&0<t.screenY&&this._map.getContainer().focus()}}),Ve=(A.include({addControl:function(t){return t.addTo(this),this},removeControl:function(t){return t.remove(),this},_initControlPos:function(){var i=this._controlCorners={},n="leaflet-",o=this._controlContainer=P("div",n+"control-container",this._container);function t(t,e){i[t+e]=P("div",n+t+" "+n+e,o)}t("top","left"),t("top","right"),t("bottom","left"),t("bottom","right")},_clearControlPos:function(){for(var t in this._controlCorners)T(this._controlCorners[t]);T(this._controlContainer),delete this._controlCorners,delete this._controlContainer}}),B.extend({options:{collapsed:!0,position:"topright",autoZIndex:!0,hideSingleBase:!1,sortLayers:!1,sortFunction:function(t,e,i,n){return i<n?-1:n<i?1:0}},initialize:function(t,e,i){for(var n in c(this,i),this._layerControlInputs=[],this._layers=[],this._lastZIndex=0,this._handlingClick=!1,this._preventClick=!1,t)this._addLayer(t[n],n);for(n in e)this._addLayer(e[n],n,!0)},onAdd:function(t){this._initLayout(),this._update(),(this._map=t).on("zoomend",this._checkDisabledLayers,this);for(var e=0;e<this._layers.length;e++)this._layers[e].layer.on("add remove",this._onLayerChange,this);return this._container},addTo:function(t){return B.prototype.addTo.call(this,t),this._expandIfNotCollapsed()},onRemove:function(){this._map.off("zoomend",this._checkDisabledLayers,this);for(var t=0;t<this._layers.length;t++)this._layers[t].layer.off("add remove",this._onLayerChange,this)},addBaseLayer:function(t,e){return this._addLayer(t,e),this._map?this._update():this},addOverlay:function(t,e){return this._addLayer(t,e,!0),this._map?this._update():this},removeLayer:function(t){t.off("add remove",this._onLayerChange,this);t=this._getLayer(h(t));return t&&this._layers.splice(this._layers.indexOf(t),1),this._map?this._update():this},expand:function(){M(this._container,"leaflet-control-layers-expanded"),this._section.style.height=null;var t=this._map.getSize().y-(this._container.offsetTop+50);return t<this._section.clientHeight?(M(this._section,"leaflet-control-layers-scrollbar"),this._section.style.height=t+"px"):z(this._section,"leaflet-control-layers-scrollbar"),this._checkDisabledLayers(),this},collapse:function(){return z(this._container,"leaflet-control-layers-expanded"),this},_initLayout:function(){var t="leaflet-control-layers",e=this._container=P("div",t),i=this.options.collapsed,n=(e.setAttribute("aria-haspopup",!0),Ie(e),Be(e),this._section=P("section",t+"-list")),o=(i&&(this._map.on("click",this.collapse,this),S(e,{mouseenter:this._expandSafely,mouseleave:this.collapse},this)),this._layersLink=P("a",t+"-toggle",e));o.href="#",o.title="Layers",o.setAttribute("role","button"),S(o,{keydown:function(t){13===t.keyCode&&this._expandSafely()},click:function(t){O(t),this._expandSafely()}},this),i||this.expand(),this._baseLayersList=P("div",t+"-base",n),this._separator=P("div",t+"-separator",n),this._overlaysList=P("div",t+"-overlays",n),e.appendChild(n)},_getLayer:function(t){for(var e=0;e<this._layers.length;e++)if(this._layers[e]&&h(this._layers[e].layer)===t)return this._layers[e]},_addLayer:function(t,e,i){this._map&&t.on("add remove",this._onLayerChange,this),this._layers.push({layer:t,name:e,overlay:i}),this.options.sortLayers&&this._layers.sort(a(function(t,e){return this.options.sortFunction(t.layer,e.layer,t.name,e.name)},this)),this.options.autoZIndex&&t.setZIndex&&(this._lastZIndex++,t.setZIndex(this._lastZIndex)),this._expandIfNotCollapsed()},_update:function(){if(this._container){me(this._baseLayersList),me(this._overlaysList),this._layerControlInputs=[];for(var t,e,i,n=0,o=0;o<this._layers.length;o++)i=this._layers[o],this._addItem(i),e=e||i.overlay,t=t||!i.overlay,n+=i.overlay?0:1;this.options.hideSingleBase&&(this._baseLayersList.style.display=(t=t&&1<n)?"":"none"),this._separator.style.display=e&&t?"":"none"}return this},_onLayerChange:function(t){this._handlingClick||this._update();var e=this._getLayer(h(t.target)),t=e.overlay?"add"===t.type?"overlayadd":"overlayremove":"add"===t.type?"baselayerchange":null;t&&this._map.fire(t,e)},_createRadioElement:function(t,e){t='<input type="radio" class="leaflet-control-layers-selector" name="'+t+'"'+(e?' checked="checked"':"")+"/>",e=document.createElement("div");return e.innerHTML=t,e.firstChild},_addItem:function(t){var e,i=document.createElement("label"),n=this._map.hasLayer(t.layer),n=(t.overlay?((e=document.createElement("input")).type="checkbox",e.className="leaflet-control-layers-selector",e.defaultChecked=n):e=this._createRadioElement("leaflet-base-layers_"+h(this),n),this._layerControlInputs.push(e),e.layerId=h(t.layer),S(e,"click",this._onInputClick,this),document.createElement("span")),o=(n.innerHTML=" "+t.name,document.createElement("span"));return i.appendChild(o),o.appendChild(e),o.appendChild(n),(t.overlay?this._overlaysList:this._baseLayersList).appendChild(i),this._checkDisabledLayers(),i},_onInputClick:function(){if(!this._preventClick){var t,e,i=this._layerControlInputs,n=[],o=[];this._handlingClick=!0;for(var s=i.length-1;0<=s;s--)t=i[s],e=this._getLayer(t.layerId).layer,t.checked?n.push(e):t.checked||o.push(e);for(s=0;s<o.length;s++)this._map.hasLayer(o[s])&&this._map.removeLayer(o[s]);for(s=0;s<n.length;s++)this._map.hasLayer(n[s])||this._map.addLayer(n[s]);this._handlingClick=!1,this._refocusOnMap()}},_checkDisabledLayers:function(){for(var t,e,i=this._layerControlInputs,n=this._map.getZoom(),o=i.length-1;0<=o;o--)t=i[o],e=this._getLayer(t.layerId).layer,t.disabled=void 0!==e.options.minZoom&&n<e.options.minZoom||void 0!==e.options.maxZoom&&n>e.options.maxZoom},_expandIfNotCollapsed:function(){return this._map&&!this.options.collapsed&&this.expand(),this},_expandSafely:function(){var t=this._section,e=(this._preventClick=!0,S(t,"click",O),this.expand(),this);setTimeout(function(){k(t,"click",O),e._preventClick=!1})}})),qe=B.extend({options:{position:"topleft",zoomInText:'<span aria-hidden="true">+</span>',zoomInTitle:"Zoom in",zoomOutText:'<span aria-hidden="true">&#x2212;</span>',zoomOutTitle:"Zoom out"},onAdd:function(t){var e="leaflet-control-zoom",i=P("div",e+" leaflet-bar"),n=this.options;return this._zoomInButton=this._createButton(n.zoomInText,n.zoomInTitle,e+"-in",i,this._zoomIn),this._zoomOutButton=this._createButton(n.zoomOutText,n.zoomOutTitle,e+"-out",i,this._zoomOut),this._updateDisabled(),t.on("zoomend zoomlevelschange",this._updateDisabled,this),i},onRemove:function(t){t.off("zoomend zoomlevelschange",this._updateDisabled,this)},disable:function(){return this._disabled=!0,this._updateDisabled(),this},enable:function(){return this._disabled=!1,this._updateDisabled(),this},_zoomIn:function(t){!this._disabled&&this._map._zoom<this._map.getMaxZoom()&&this._map.zoomIn(this._map.options.zoomDelta*(t.shiftKey?3:1))},_zoomOut:function(t){!this._disabled&&this._map._zoom>this._map.getMinZoom()&&this._map.zoomOut(this._map.options.zoomDelta*(t.shiftKey?3:1))},_createButton:function(t,e,i,n,o){i=P("a",i,n);return i.innerHTML=t,i.href="#",i.title=e,i.setAttribute("role","button"),i.setAttribute("aria-label",e),Ie(i),S(i,"click",Re),S(i,"click",o,this),S(i,"click",this._refocusOnMap,this),i},_updateDisabled:function(){var t=this._map,e="leaflet-disabled";z(this._zoomInButton,e),z(this._zoomOutButton,e),this._zoomInButton.setAttribute("aria-disabled","false"),this._zoomOutButton.setAttribute("aria-disabled","false"),!this._disabled&&t._zoom!==t.getMinZoom()||(M(this._zoomOutButton,e),this._zoomOutButton.setAttribute("aria-disabled","true")),!this._disabled&&t._zoom!==t.getMaxZoom()||(M(this._zoomInButton,e),this._zoomInButton.setAttribute("aria-disabled","true"))}}),Ge=(A.mergeOptions({zoomControl:!0}),A.addInitHook(function(){this.options.zoomControl&&(this.zoomControl=new qe,this.addControl(this.zoomControl))}),B.extend({options:{position:"bottomleft",maxWidth:100,metric:!0,imperial:!0},onAdd:function(t){var e="leaflet-control-scale",i=P("div",e),n=this.options;return this._addScales(n,e+"-line",i),t.on(n.updateWhenIdle?"moveend":"move",this._update,this),t.whenReady(this._update,this),i},onRemove:function(t){t.off(this.options.updateWhenIdle?"moveend":"move",this._update,this)},_addScales:function(t,e,i){t.metric&&(this._mScale=P("div",e,i)),t.imperial&&(this._iScale=P("div",e,i))},_update:function(){var t=this._map,e=t.getSize().y/2,t=t.distance(t.containerPointToLatLng([0,e]),t.containerPointToLatLng([this.options.maxWidth,e]));this._updateScales(t)},_updateScales:function(t){this.options.metric&&t&&this._updateMetric(t),this.options.imperial&&t&&this._updateImperial(t)},_updateMetric:function(t){var e=this._getRoundNum(t);this._updateScale(this._mScale,e<1e3?e+" m":e/1e3+" km",e/t)},_updateImperial:function(t){var e,i,t=3.2808399*t;5280<t?(i=this._getRoundNum(e=t/5280),this._updateScale(this._iScale,i+" mi",i/e)):(i=this._getRoundNum(t),this._updateScale(this._iScale,i+" ft",i/t))},_updateScale:function(t,e,i){t.style.width=Math.round(this.options.maxWidth*i)+"px",t.innerHTML=e},_getRoundNum:function(t){var e=Math.pow(10,(Math.floor(t)+"").length-1),t=t/e;return e*(t=10<=t?10:5<=t?5:3<=t?3:2<=t?2:1)}})),Ke=B.extend({options:{position:"bottomright",prefix:'<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">'+(b.inlineSvg?'<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg> ':"")+"Leaflet</a>"},initialize:function(t){c(this,t),this._attributions={}},onAdd:function(t){for(var e in(t.attributionControl=this)._container=P("div","leaflet-control-attribution"),Ie(this._container),t._layers)t._layers[e].getAttribution&&this.addAttribution(t._layers[e].getAttribution());return this._update(),t.on("layeradd",this._addAttribution,this),this._container},onRemove:function(t){t.off("layeradd",this._addAttribution,this)},_addAttribution:function(t){t.layer.getAttribution&&(this.addAttribution(t.layer.getAttribution()),t.layer.once("remove",function(){this.removeAttribution(t.layer.getAttribution())},this))},setPrefix:function(t){return this.options.prefix=t,this._update(),this},addAttribution:function(t){return t&&(this._attributions[t]||(this._attributions[t]=0),this._attributions[t]++,this._update()),this},removeAttribution:function(t){return t&&this._attributions[t]&&(this._attributions[t]--,this._update()),this},_update:function(){if(this._map){var t,e=[];for(t in this._attributions)this._attributions[t]&&e.push(t);var i=[];this.options.prefix&&i.push(this.options.prefix),e.length&&i.push(e.join(", ")),this._container.innerHTML=i.join(' <span aria-hidden="true">|</span> ')}}}),n=(A.mergeOptions({attributionControl:!0}),A.addInitHook(function(){this.options.attributionControl&&(new Ke).addTo(this)}),B.Layers=Ve,B.Zoom=qe,B.Scale=Ge,B.Attribution=Ke,Ue.layers=function(t,e,i){return new Ve(t,e,i)},Ue.zoom=function(t){return new qe(t)},Ue.scale=function(t){return new Ge(t)},Ue.attribution=function(t){return new Ke(t)},et.extend({initialize:function(t){this._map=t},enable:function(){return this._enabled||(this._enabled=!0,this.addHooks()),this},disable:function(){return this._enabled&&(this._enabled=!1,this.removeHooks()),this},enabled:function(){return!!this._enabled}})),ft=(n.addTo=function(t,e){return t.addHandler(e,this),this},{Events:e}),Ye=b.touch?"touchstart mousedown":"mousedown",Xe=it.extend({options:{clickTolerance:3},initialize:function(t,e,i,n){c(this,n),this._element=t,this._dragStartTarget=e||t,this._preventOutline=i},enable:function(){this._enabled||(S(this._dragStartTarget,Ye,this._onDown,this),this._enabled=!0)},disable:function(){this._enabled&&(Xe._dragging===this&&this.finishDrag(!0),k(this._dragStartTarget,Ye,this._onDown,this),this._enabled=!1,this._moved=!1)},_onDown:function(t){var e,i;this._enabled&&(this._moved=!1,ve(this._element,"leaflet-zoom-anim")||(t.touches&&1!==t.touches.length?Xe._dragging===this&&this.finishDrag():Xe._dragging||t.shiftKey||1!==t.which&&1!==t.button&&!t.touches||((Xe._dragging=this)._preventOutline&&Me(this._element),Le(),re(),this._moving||(this.fire("down"),i=t.touches?t.touches[0]:t,e=Ce(this._element),this._startPoint=new p(i.clientX,i.clientY),this._startPos=Pe(this._element),this._parentScale=Ze(e),i="mousedown"===t.type,S(document,i?"mousemove":"touchmove",this._onMove,this),S(document,i?"mouseup":"touchend touchcancel",this._onUp,this)))))},_onMove:function(t){var e;this._enabled&&(t.touches&&1<t.touches.length?this._moved=!0:!(e=new p((e=t.touches&&1===t.touches.length?t.touches[0]:t).clientX,e.clientY)._subtract(this._startPoint)).x&&!e.y||Math.abs(e.x)+Math.abs(e.y)<this.options.clickTolerance||(e.x/=this._parentScale.x,e.y/=this._parentScale.y,O(t),this._moved||(this.fire("dragstart"),this._moved=!0,M(document.body,"leaflet-dragging"),this._lastTarget=t.target||t.srcElement,window.SVGElementInstance&&this._lastTarget instanceof window.SVGElementInstance&&(this._lastTarget=this._lastTarget.correspondingUseElement),M(this._lastTarget,"leaflet-drag-target")),this._newPos=this._startPos.add(e),this._moving=!0,this._lastEvent=t,this._updatePosition()))},_updatePosition:function(){var t={originalEvent:this._lastEvent};this.fire("predrag",t),Z(this._element,this._newPos),this.fire("drag",t)},_onUp:function(){this._enabled&&this.finishDrag()},finishDrag:function(t){z(document.body,"leaflet-dragging"),this._lastTarget&&(z(this._lastTarget,"leaflet-drag-target"),this._lastTarget=null),k(document,"mousemove touchmove",this._onMove,this),k(document,"mouseup touchend touchcancel",this._onUp,this),Te(),ae();var e=this._moved&&this._moving;this._moving=!1,Xe._dragging=!1,e&&this.fire("dragend",{noInertia:t,distance:this._newPos.distanceTo(this._startPos)})}});function Je(t,e,i){for(var n,o,s,r,a,h,l,u=[1,4,2,8],c=0,d=t.length;c<d;c++)t[c]._code=si(t[c],e);for(s=0;s<4;s++){for(h=u[s],n=[],c=0,o=(d=t.length)-1;c<d;o=c++)r=t[c],a=t[o],r._code&h?a._code&h||((l=oi(a,r,h,e,i))._code=si(l,e),n.push(l)):(a._code&h&&((l=oi(a,r,h,e,i))._code=si(l,e),n.push(l)),n.push(r));t=n}return t}function $e(t,e){var i,n,o,s,r,a,h;if(!t||0===t.length)throw new Error("latlngs not passed");I(t)||(console.warn("latlngs are not flat! Only the first ring will be used"),t=t[0]);for(var l=w([0,0]),u=g(t),c=(u.getNorthWest().distanceTo(u.getSouthWest())*u.getNorthEast().distanceTo(u.getNorthWest())<1700&&(l=Qe(t)),t.length),d=[],_=0;_<c;_++){var p=w(t[_]);d.push(e.project(w([p.lat-l.lat,p.lng-l.lng])))}for(_=r=a=h=0,i=c-1;_<c;i=_++)n=d[_],o=d[i],s=n.y*o.x-o.y*n.x,a+=(n.x+o.x)*s,h+=(n.y+o.y)*s,r+=3*s;u=0===r?d[0]:[a/r,h/r],u=e.unproject(m(u));return w([u.lat+l.lat,u.lng+l.lng])}function Qe(t){for(var e=0,i=0,n=0,o=0;o<t.length;o++){var s=w(t[o]);e+=s.lat,i+=s.lng,n++}return w([e/n,i/n])}var ti,gt={__proto__:null,clipPolygon:Je,polygonCenter:$e,centroid:Qe};function ei(t,e){if(e&&t.length){var i=t=function(t,e){for(var i=[t[0]],n=1,o=0,s=t.length;n<s;n++)(function(t,e){var i=e.x-t.x,e=e.y-t.y;return i*i+e*e})(t[n],t[o])>e&&(i.push(t[n]),o=n);o<s-1&&i.push(t[s-1]);return i}(t,e=e*e),n=i.length,o=new(typeof Uint8Array!=void 0+""?Uint8Array:Array)(n);o[0]=o[n-1]=1,function t(e,i,n,o,s){var r,a,h,l=0;for(a=o+1;a<=s-1;a++)h=ri(e[a],e[o],e[s],!0),l<h&&(r=a,l=h);n<l&&(i[r]=1,t(e,i,n,o,r),t(e,i,n,r,s))}(i,o,e,0,n-1);var s,r=[];for(s=0;s<n;s++)o[s]&&r.push(i[s]);return r}return t.slice()}function ii(t,e,i){return Math.sqrt(ri(t,e,i,!0))}function ni(t,e,i,n,o){var s,r,a,h=n?ti:si(t,i),l=si(e,i);for(ti=l;;){if(!(h|l))return[t,e];if(h&l)return!1;a=si(r=oi(t,e,s=h||l,i,o),i),s===h?(t=r,h=a):(e=r,l=a)}}function oi(t,e,i,n,o){var s,r,a=e.x-t.x,e=e.y-t.y,h=n.min,n=n.max;return 8&i?(s=t.x+a*(n.y-t.y)/e,r=n.y):4&i?(s=t.x+a*(h.y-t.y)/e,r=h.y):2&i?(s=n.x,r=t.y+e*(n.x-t.x)/a):1&i&&(s=h.x,r=t.y+e*(h.x-t.x)/a),new p(s,r,o)}function si(t,e){var i=0;return t.x<e.min.x?i|=1:t.x>e.max.x&&(i|=2),t.y<e.min.y?i|=4:t.y>e.max.y&&(i|=8),i}function ri(t,e,i,n){var o=e.x,e=e.y,s=i.x-o,r=i.y-e,a=s*s+r*r;return 0<a&&(1<(a=((t.x-o)*s+(t.y-e)*r)/a)?(o=i.x,e=i.y):0<a&&(o+=s*a,e+=r*a)),s=t.x-o,r=t.y-e,n?s*s+r*r:new p(o,e)}function I(t){return!d(t[0])||"object"!=typeof t[0][0]&&void 0!==t[0][0]}function ai(t){return console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead."),I(t)}function hi(t,e){var i,n,o,s,r,a;if(!t||0===t.length)throw new Error("latlngs not passed");I(t)||(console.warn("latlngs are not flat! Only the first ring will be used"),t=t[0]);for(var h=w([0,0]),l=g(t),u=(l.getNorthWest().distanceTo(l.getSouthWest())*l.getNorthEast().distanceTo(l.getNorthWest())<1700&&(h=Qe(t)),t.length),c=[],d=0;d<u;d++){var _=w(t[d]);c.push(e.project(w([_.lat-h.lat,_.lng-h.lng])))}for(i=d=0;d<u-1;d++)i+=c[d].distanceTo(c[d+1])/2;if(0===i)a=c[0];else for(n=d=0;d<u-1;d++)if(o=c[d],s=c[d+1],i<(n+=r=o.distanceTo(s))){a=[s.x-(r=(n-i)/r)*(s.x-o.x),s.y-r*(s.y-o.y)];break}l=e.unproject(m(a));return w([l.lat+h.lat,l.lng+h.lng])}var vt={__proto__:null,simplify:ei,pointToSegmentDistance:ii,closestPointOnSegment:function(t,e,i){return ri(t,e,i)},clipSegment:ni,_getEdgeIntersection:oi,_getBitCode:si,_sqClosestPointOnSegment:ri,isFlat:I,_flat:ai,polylineCenter:hi},yt={project:function(t){return new p(t.lng,t.lat)},unproject:function(t){return new v(t.y,t.x)},bounds:new f([-180,-90],[180,90])},xt={R:6378137,R_MINOR:6356752.314245179,bounds:new f([-20037508.34279,-15496570.73972],[20037508.34279,18764656.23138]),project:function(t){var e=Math.PI/180,i=this.R,n=t.lat*e,o=this.R_MINOR/i,o=Math.sqrt(1-o*o),s=o*Math.sin(n),s=Math.tan(Math.PI/4-n/2)/Math.pow((1-s)/(1+s),o/2),n=-i*Math.log(Math.max(s,1e-10));return new p(t.lng*e*i,n)},unproject:function(t){for(var e,i=180/Math.PI,n=this.R,o=this.R_MINOR/n,s=Math.sqrt(1-o*o),r=Math.exp(-t.y/n),a=Math.PI/2-2*Math.atan(r),h=0,l=.1;h<15&&1e-7<Math.abs(l);h++)e=s*Math.sin(a),e=Math.pow((1-e)/(1+e),s/2),a+=l=Math.PI/2-2*Math.atan(r*e)-a;return new v(a*i,t.x*i/n)}},wt={__proto__:null,LonLat:yt,Mercator:xt,SphericalMercator:rt},Pt=l({},st,{code:"EPSG:3395",projection:xt,transformation:ht(bt=.5/(Math.PI*xt.R),.5,-bt,.5)}),li=l({},st,{code:"EPSG:4326",projection:yt,transformation:ht(1/180,1,-1/180,.5)}),Lt=l({},ot,{projection:yt,transformation:ht(1,0,-1,0),scale:function(t){return Math.pow(2,t)},zoom:function(t){return Math.log(t)/Math.LN2},distance:function(t,e){var i=e.lng-t.lng,e=e.lat-t.lat;return Math.sqrt(i*i+e*e)},infinite:!0}),o=(ot.Earth=st,ot.EPSG3395=Pt,ot.EPSG3857=lt,ot.EPSG900913=ut,ot.EPSG4326=li,ot.Simple=Lt,it.extend({options:{pane:"overlayPane",attribution:null,bubblingMouseEvents:!0},addTo:function(t){return t.addLayer(this),this},remove:function(){return this.removeFrom(this._map||this._mapToAdd)},removeFrom:function(t){return t&&t.removeLayer(this),this},getPane:function(t){return this._map.getPane(t?this.options[t]||t:this.options.pane)},addInteractiveTarget:function(t){return this._map._targets[h(t)]=this},removeInteractiveTarget:function(t){return delete this._map._targets[h(t)],this},getAttribution:function(){return this.options.attribution},_layerAdd:function(t){var e,i=t.target;i.hasLayer(this)&&(this._map=i,this._zoomAnimated=i._zoomAnimated,this.getEvents&&(e=this.getEvents(),i.on(e,this),this.once("remove",function(){i.off(e,this)},this)),this.onAdd(i),this.fire("add"),i.fire("layeradd",{layer:this}))}})),ui=(A.include({addLayer:function(t){var e;if(t._layerAdd)return e=h(t),this._layers[e]||((this._layers[e]=t)._mapToAdd=this,t.beforeAdd&&t.beforeAdd(this),this.whenReady(t._layerAdd,t)),this;throw new Error("The provided object is not a Layer.")},removeLayer:function(t){var e=h(t);return this._layers[e]&&(this._loaded&&t.onRemove(this),delete this._layers[e],this._loaded&&(this.fire("layerremove",{layer:t}),t.fire("remove")),t._map=t._mapToAdd=null),this},hasLayer:function(t){return h(t)in this._layers},eachLayer:function(t,e){for(var i in this._layers)t.call(e,this._layers[i]);return this},_addLayers:function(t){for(var e=0,i=(t=t?d(t)?t:[t]:[]).length;e<i;e++)this.addLayer(t[e])},_addZoomLimit:function(t){isNaN(t.options.maxZoom)&&isNaN(t.options.minZoom)||(this._zoomBoundLayers[h(t)]=t,this._updateZoomLevels())},_removeZoomLimit:function(t){t=h(t);this._zoomBoundLayers[t]&&(delete this._zoomBoundLayers[t],this._updateZoomLevels())},_updateZoomLevels:function(){var t,e=1/0,i=-1/0,n=this._getZoomSpan();for(t in this._zoomBoundLayers)var o=this._zoomBoundLayers[t].options,e=void 0===o.minZoom?e:Math.min(e,o.minZoom),i=void 0===o.maxZoom?i:Math.max(i,o.maxZoom);this._layersMaxZoom=i===-1/0?void 0:i,this._layersMinZoom=e===1/0?void 0:e,n!==this._getZoomSpan()&&this.fire("zoomlevelschange"),void 0===this.options.maxZoom&&this._layersMaxZoom&&this.getZoom()>this._layersMaxZoom&&this.setZoom(this._layersMaxZoom),void 0===this.options.minZoom&&this._layersMinZoom&&this.getZoom()<this._layersMinZoom&&this.setZoom(this._layersMinZoom)}}),o.extend({initialize:function(t,e){var i,n;if(c(this,e),this._layers={},t)for(i=0,n=t.length;i<n;i++)this.addLayer(t[i])},addLayer:function(t){var e=this.getLayerId(t);return this._layers[e]=t,this._map&&this._map.addLayer(t),this},removeLayer:function(t){t=t in this._layers?t:this.getLayerId(t);return this._map&&this._layers[t]&&this._map.removeLayer(this._layers[t]),delete this._layers[t],this},hasLayer:function(t){return("number"==typeof t?t:this.getLayerId(t))in this._layers},clearLayers:function(){return this.eachLayer(this.removeLayer,this)},invoke:function(t){var e,i,n=Array.prototype.slice.call(arguments,1);for(e in this._layers)(i=this._layers[e])[t]&&i[t].apply(i,n);return this},onAdd:function(t){this.eachLayer(t.addLayer,t)},onRemove:function(t){this.eachLayer(t.removeLayer,t)},eachLayer:function(t,e){for(var i in this._layers)t.call(e,this._layers[i]);return this},getLayer:function(t){return this._layers[t]},getLayers:function(){var t=[];return this.eachLayer(t.push,t),t},setZIndex:function(t){return this.invoke("setZIndex",t)},getLayerId:h})),ci=ui.extend({addLayer:function(t){return this.hasLayer(t)?this:(t.addEventParent(this),ui.prototype.addLayer.call(this,t),this.fire("layeradd",{layer:t}))},removeLayer:function(t){return this.hasLayer(t)?((t=t in this._layers?this._layers[t]:t).removeEventParent(this),ui.prototype.removeLayer.call(this,t),this.fire("layerremove",{layer:t})):this},setStyle:function(t){return this.invoke("setStyle",t)},bringToFront:function(){return this.invoke("bringToFront")},bringToBack:function(){return this.invoke("bringToBack")},getBounds:function(){var t,e=new s;for(t in this._layers){var i=this._layers[t];e.extend(i.getBounds?i.getBounds():i.getLatLng())}return e}}),di=et.extend({options:{popupAnchor:[0,0],tooltipAnchor:[0,0],crossOrigin:!1},initialize:function(t){c(this,t)},createIcon:function(t){return this._createIcon("icon",t)},createShadow:function(t){return this._createIcon("shadow",t)},_createIcon:function(t,e){var i=this._getIconUrl(t);if(i)return i=this._createImg(i,e&&"IMG"===e.tagName?e:null),this._setIconStyles(i,t),!this.options.crossOrigin&&""!==this.options.crossOrigin||(i.crossOrigin=!0===this.options.crossOrigin?"":this.options.crossOrigin),i;if("icon"===t)throw new Error("iconUrl not set in Icon options (see the docs).");return null},_setIconStyles:function(t,e){var i=this.options,n=i[e+"Size"],n=m(n="number"==typeof n?[n,n]:n),o=m("shadow"===e&&i.shadowAnchor||i.iconAnchor||n&&n.divideBy(2,!0));t.className="leaflet-marker-"+e+" "+(i.className||""),o&&(t.style.marginLeft=-o.x+"px",t.style.marginTop=-o.y+"px"),n&&(t.style.width=n.x+"px",t.style.height=n.y+"px")},_createImg:function(t,e){return(e=e||document.createElement("img")).src=t,e},_getIconUrl:function(t){return b.retina&&this.options[t+"RetinaUrl"]||this.options[t+"Url"]}});var _i=di.extend({options:{iconUrl:"marker-icon.png",iconRetinaUrl:"marker-icon-2x.png",shadowUrl:"marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],tooltipAnchor:[16,-28],shadowSize:[41,41]},_getIconUrl:function(t){return"string"!=typeof _i.imagePath&&(_i.imagePath=this._detectIconPath()),(this.options.imagePath||_i.imagePath)+di.prototype._getIconUrl.call(this,t)},_stripUrl:function(t){function e(t,e,i){return(e=e.exec(t))&&e[i]}return(t=e(t,/^url\((['"])?(.+)\1\)$/,2))&&e(t,/^(.*)marker-icon\.png$/,1)},_detectIconPath:function(){var t=P("div","leaflet-default-icon-path",document.body),e=pe(t,"background-image")||pe(t,"backgroundImage");return document.body.removeChild(t),(e=this._stripUrl(e))?e:(t=document.querySelector('link[href$="leaflet.css"]'))?t.href.substring(0,t.href.length-"leaflet.css".length-1):""}}),pi=n.extend({initialize:function(t){this._marker=t},addHooks:function(){var t=this._marker._icon;this._draggable||(this._draggable=new Xe(t,t,!0)),this._draggable.on({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).enable(),M(t,"leaflet-marker-draggable")},removeHooks:function(){this._draggable.off({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).disable(),this._marker._icon&&z(this._marker._icon,"leaflet-marker-draggable")},moved:function(){return this._draggable&&this._draggable._moved},_adjustPan:function(t){var e=this._marker,i=e._map,n=this._marker.options.autoPanSpeed,o=this._marker.options.autoPanPadding,s=Pe(e._icon),r=i.getPixelBounds(),a=i.getPixelOrigin(),a=_(r.min._subtract(a).add(o),r.max._subtract(a).subtract(o));a.contains(s)||(o=m((Math.max(a.max.x,s.x)-a.max.x)/(r.max.x-a.max.x)-(Math.min(a.min.x,s.x)-a.min.x)/(r.min.x-a.min.x),(Math.max(a.max.y,s.y)-a.max.y)/(r.max.y-a.max.y)-(Math.min(a.min.y,s.y)-a.min.y)/(r.min.y-a.min.y)).multiplyBy(n),i.panBy(o,{animate:!1}),this._draggable._newPos._add(o),this._draggable._startPos._add(o),Z(e._icon,this._draggable._newPos),this._onDrag(t),this._panRequest=x(this._adjustPan.bind(this,t)))},_onDragStart:function(){this._oldLatLng=this._marker.getLatLng(),this._marker.closePopup&&this._marker.closePopup(),this._marker.fire("movestart").fire("dragstart")},_onPreDrag:function(t){this._marker.options.autoPan&&(r(this._panRequest),this._panRequest=x(this._adjustPan.bind(this,t)))},_onDrag:function(t){var e=this._marker,i=e._shadow,n=Pe(e._icon),o=e._map.layerPointToLatLng(n);i&&Z(i,n),e._latlng=o,t.latlng=o,t.oldLatLng=this._oldLatLng,e.fire("move",t).fire("drag",t)},_onDragEnd:function(t){r(this._panRequest),delete this._oldLatLng,this._marker.fire("moveend").fire("dragend",t)}}),mi=o.extend({options:{icon:new _i,interactive:!0,keyboard:!0,title:"",alt:"Marker",zIndexOffset:0,opacity:1,riseOnHover:!1,riseOffset:250,pane:"markerPane",shadowPane:"shadowPane",bubblingMouseEvents:!1,autoPanOnFocus:!0,draggable:!1,autoPan:!1,autoPanPadding:[50,50],autoPanSpeed:10},initialize:function(t,e){c(this,e),this._latlng=w(t)},onAdd:function(t){this._zoomAnimated=this._zoomAnimated&&t.options.markerZoomAnimation,this._zoomAnimated&&t.on("zoomanim",this._animateZoom,this),this._initIcon(),this.update()},onRemove:function(t){this.dragging&&this.dragging.enabled()&&(this.options.draggable=!0,this.dragging.removeHooks()),delete this.dragging,this._zoomAnimated&&t.off("zoomanim",this._animateZoom,this),this._removeIcon(),this._removeShadow()},getEvents:function(){return{zoom:this.update,viewreset:this.update}},getLatLng:function(){return this._latlng},setLatLng:function(t){var e=this._latlng;return this._latlng=w(t),this.update(),this.fire("move",{oldLatLng:e,latlng:this._latlng})},setZIndexOffset:function(t){return this.options.zIndexOffset=t,this.update()},getIcon:function(){return this.options.icon},setIcon:function(t){return this.options.icon=t,this._map&&(this._initIcon(),this.update()),this._popup&&this.bindPopup(this._popup,this._popup.options),this},getElement:function(){return this._icon},update:function(){var t;return this._icon&&this._map&&(t=this._map.latLngToLayerPoint(this._latlng).round(),this._setPos(t)),this},_initIcon:function(){var t=this.options,e="leaflet-zoom-"+(this._zoomAnimated?"animated":"hide"),i=t.icon.createIcon(this._icon),n=!1,i=(i!==this._icon&&(this._icon&&this._removeIcon(),n=!0,t.title&&(i.title=t.title),"IMG"===i.tagName&&(i.alt=t.alt||"")),M(i,e),t.keyboard&&(i.tabIndex="0",i.setAttribute("role","button")),this._icon=i,t.riseOnHover&&this.on({mouseover:this._bringToFront,mouseout:this._resetZIndex}),this.options.autoPanOnFocus&&S(i,"focus",this._panOnFocus,this),t.icon.createShadow(this._shadow)),o=!1;i!==this._shadow&&(this._removeShadow(),o=!0),i&&(M(i,e),i.alt=""),this._shadow=i,t.opacity<1&&this._updateOpacity(),n&&this.getPane().appendChild(this._icon),this._initInteraction(),i&&o&&this.getPane(t.shadowPane).appendChild(this._shadow)},_removeIcon:function(){this.options.riseOnHover&&this.off({mouseover:this._bringToFront,mouseout:this._resetZIndex}),this.options.autoPanOnFocus&&k(this._icon,"focus",this._panOnFocus,this),T(this._icon),this.removeInteractiveTarget(this._icon),this._icon=null},_removeShadow:function(){this._shadow&&T(this._shadow),this._shadow=null},_setPos:function(t){this._icon&&Z(this._icon,t),this._shadow&&Z(this._shadow,t),this._zIndex=t.y+this.options.zIndexOffset,this._resetZIndex()},_updateZIndex:function(t){this._icon&&(this._icon.style.zIndex=this._zIndex+t)},_animateZoom:function(t){t=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center).round();this._setPos(t)},_initInteraction:function(){var t;this.options.interactive&&(M(this._icon,"leaflet-interactive"),this.addInteractiveTarget(this._icon),pi&&(t=this.options.draggable,this.dragging&&(t=this.dragging.enabled(),this.dragging.disable()),this.dragging=new pi(this),t&&this.dragging.enable()))},setOpacity:function(t){return this.options.opacity=t,this._map&&this._updateOpacity(),this},_updateOpacity:function(){var t=this.options.opacity;this._icon&&C(this._icon,t),this._shadow&&C(this._shadow,t)},_bringToFront:function(){this._updateZIndex(this.options.riseOffset)},_resetZIndex:function(){this._updateZIndex(0)},_panOnFocus:function(){var t,e,i=this._map;i&&(t=(e=this.options.icon.options).iconSize?m(e.iconSize):m(0,0),e=e.iconAnchor?m(e.iconAnchor):m(0,0),i.panInside(this._latlng,{paddingTopLeft:e,paddingBottomRight:t.subtract(e)}))},_getPopupAnchor:function(){return this.options.icon.options.popupAnchor},_getTooltipAnchor:function(){return this.options.icon.options.tooltipAnchor}});var fi=o.extend({options:{stroke:!0,color:"#3388ff",weight:3,opacity:1,lineCap:"round",lineJoin:"round",dashArray:null,dashOffset:null,fill:!1,fillColor:null,fillOpacity:.2,fillRule:"evenodd",interactive:!0,bubblingMouseEvents:!0},beforeAdd:function(t){this._renderer=t.getRenderer(this)},onAdd:function(){this._renderer._initPath(this),this._reset(),this._renderer._addPath(this)},onRemove:function(){this._renderer._removePath(this)},redraw:function(){return this._map&&this._renderer._updatePath(this),this},setStyle:function(t){return c(this,t),this._renderer&&(this._renderer._updateStyle(this),this.options.stroke&&t&&Object.prototype.hasOwnProperty.call(t,"weight")&&this._updateBounds()),this},bringToFront:function(){return this._renderer&&this._renderer._bringToFront(this),this},bringToBack:function(){return this._renderer&&this._renderer._bringToBack(this),this},getElement:function(){return this._path},_reset:function(){this._project(),this._update()},_clickTolerance:function(){return(this.options.stroke?this.options.weight/2:0)+(this._renderer.options.tolerance||0)}}),gi=fi.extend({options:{fill:!0,radius:10},initialize:function(t,e){c(this,e),this._latlng=w(t),this._radius=this.options.radius},setLatLng:function(t){var e=this._latlng;return this._latlng=w(t),this.redraw(),this.fire("move",{oldLatLng:e,latlng:this._latlng})},getLatLng:function(){return this._latlng},setRadius:function(t){return this.options.radius=this._radius=t,this.redraw()},getRadius:function(){return this._radius},setStyle:function(t){var e=t&&t.radius||this._radius;return fi.prototype.setStyle.call(this,t),this.setRadius(e),this},_project:function(){this._point=this._map.latLngToLayerPoint(this._latlng),this._updateBounds()},_updateBounds:function(){var t=this._radius,e=this._radiusY||t,i=this._clickTolerance(),t=[t+i,e+i];this._pxBounds=new f(this._point.subtract(t),this._point.add(t))},_update:function(){this._map&&this._updatePath()},_updatePath:function(){this._renderer._updateCircle(this)},_empty:function(){return this._radius&&!this._renderer._bounds.intersects(this._pxBounds)},_containsPoint:function(t){return t.distanceTo(this._point)<=this._radius+this._clickTolerance()}});var vi=gi.extend({initialize:function(t,e,i){if(c(this,e="number"==typeof e?l({},i,{radius:e}):e),this._latlng=w(t),isNaN(this.options.radius))throw new Error("Circle radius cannot be NaN");this._mRadius=this.options.radius},setRadius:function(t){return this._mRadius=t,this.redraw()},getRadius:function(){return this._mRadius},getBounds:function(){var t=[this._radius,this._radiusY||this._radius];return new s(this._map.layerPointToLatLng(this._point.subtract(t)),this._map.layerPointToLatLng(this._point.add(t)))},setStyle:fi.prototype.setStyle,_project:function(){var t,e,i,n,o,s=this._latlng.lng,r=this._latlng.lat,a=this._map,h=a.options.crs;h.distance===st.distance?(n=Math.PI/180,o=this._mRadius/st.R/n,t=a.project([r+o,s]),e=a.project([r-o,s]),e=t.add(e).divideBy(2),i=a.unproject(e).lat,n=Math.acos((Math.cos(o*n)-Math.sin(r*n)*Math.sin(i*n))/(Math.cos(r*n)*Math.cos(i*n)))/n,!isNaN(n)&&0!==n||(n=o/Math.cos(Math.PI/180*r)),this._point=e.subtract(a.getPixelOrigin()),this._radius=isNaN(n)?0:e.x-a.project([i,s-n]).x,this._radiusY=e.y-t.y):(o=h.unproject(h.project(this._latlng).subtract([this._mRadius,0])),this._point=a.latLngToLayerPoint(this._latlng),this._radius=this._point.x-a.latLngToLayerPoint(o).x),this._updateBounds()}});var yi=fi.extend({options:{smoothFactor:1,noClip:!1},initialize:function(t,e){c(this,e),this._setLatLngs(t)},getLatLngs:function(){return this._latlngs},setLatLngs:function(t){return this._setLatLngs(t),this.redraw()},isEmpty:function(){return!this._latlngs.length},closestLayerPoint:function(t){for(var e=1/0,i=null,n=ri,o=0,s=this._parts.length;o<s;o++)for(var r=this._parts[o],a=1,h=r.length;a<h;a++){var l,u,c=n(t,l=r[a-1],u=r[a],!0);c<e&&(e=c,i=n(t,l,u))}return i&&(i.distance=Math.sqrt(e)),i},getCenter:function(){if(this._map)return hi(this._defaultShape(),this._map.options.crs);throw new Error("Must add layer to map before using getCenter()")},getBounds:function(){return this._bounds},addLatLng:function(t,e){return e=e||this._defaultShape(),t=w(t),e.push(t),this._bounds.extend(t),this.redraw()},_setLatLngs:function(t){this._bounds=new s,this._latlngs=this._convertLatLngs(t)},_defaultShape:function(){return I(this._latlngs)?this._latlngs:this._latlngs[0]},_convertLatLngs:function(t){for(var e=[],i=I(t),n=0,o=t.length;n<o;n++)i?(e[n]=w(t[n]),this._bounds.extend(e[n])):e[n]=this._convertLatLngs(t[n]);return e},_project:function(){var t=new f;this._rings=[],this._projectLatlngs(this._latlngs,this._rings,t),this._bounds.isValid()&&t.isValid()&&(this._rawPxBounds=t,this._updateBounds())},_updateBounds:function(){var t=this._clickTolerance(),t=new p(t,t);this._rawPxBounds&&(this._pxBounds=new f([this._rawPxBounds.min.subtract(t),this._rawPxBounds.max.add(t)]))},_projectLatlngs:function(t,e,i){var n,o,s=t[0]instanceof v,r=t.length;if(s){for(o=[],n=0;n<r;n++)o[n]=this._map.latLngToLayerPoint(t[n]),i.extend(o[n]);e.push(o)}else for(n=0;n<r;n++)this._projectLatlngs(t[n],e,i)},_clipPoints:function(){var t=this._renderer._bounds;if(this._parts=[],this._pxBounds&&this._pxBounds.intersects(t))if(this.options.noClip)this._parts=this._rings;else for(var e,i,n,o,s=this._parts,r=0,a=0,h=this._rings.length;r<h;r++)for(e=0,i=(o=this._rings[r]).length;e<i-1;e++)(n=ni(o[e],o[e+1],t,e,!0))&&(s[a]=s[a]||[],s[a].push(n[0]),n[1]===o[e+1]&&e!==i-2||(s[a].push(n[1]),a++))},_simplifyPoints:function(){for(var t=this._parts,e=this.options.smoothFactor,i=0,n=t.length;i<n;i++)t[i]=ei(t[i],e)},_update:function(){this._map&&(this._clipPoints(),this._simplifyPoints(),this._updatePath())},_updatePath:function(){this._renderer._updatePoly(this)},_containsPoint:function(t,e){var i,n,o,s,r,a,h=this._clickTolerance();if(this._pxBounds&&this._pxBounds.contains(t))for(i=0,s=this._parts.length;i<s;i++)for(n=0,o=(r=(a=this._parts[i]).length)-1;n<r;o=n++)if((e||0!==n)&&ii(t,a[o],a[n])<=h)return!0;return!1}});yi._flat=ai;var xi=yi.extend({options:{fill:!0},isEmpty:function(){return!this._latlngs.length||!this._latlngs[0].length},getCenter:function(){if(this._map)return $e(this._defaultShape(),this._map.options.crs);throw new Error("Must add layer to map before using getCenter()")},_convertLatLngs:function(t){var t=yi.prototype._convertLatLngs.call(this,t),e=t.length;return 2<=e&&t[0]instanceof v&&t[0].equals(t[e-1])&&t.pop(),t},_setLatLngs:function(t){yi.prototype._setLatLngs.call(this,t),I(this._latlngs)&&(this._latlngs=[this._latlngs])},_defaultShape:function(){return(I(this._latlngs[0])?this._latlngs:this._latlngs[0])[0]},_clipPoints:function(){var t=this._renderer._bounds,e=this.options.weight,e=new p(e,e),t=new f(t.min.subtract(e),t.max.add(e));if(this._parts=[],this._pxBounds&&this._pxBounds.intersects(t))if(this.options.noClip)this._parts=this._rings;else for(var i,n=0,o=this._rings.length;n<o;n++)(i=Je(this._rings[n],t,!0)).length&&this._parts.push(i)},_updatePath:function(){this._renderer._updatePoly(this,!0)},_containsPoint:function(t){var e,i,n,o,s,r,a,h,l=!1;if(!this._pxBounds||!this._pxBounds.contains(t))return!1;for(o=0,a=this._parts.length;o<a;o++)for(s=0,r=(h=(e=this._parts[o]).length)-1;s<h;r=s++)i=e[s],n=e[r],i.y>t.y!=n.y>t.y&&t.x<(n.x-i.x)*(t.y-i.y)/(n.y-i.y)+i.x&&(l=!l);return l||yi.prototype._containsPoint.call(this,t,!0)}});var wi=ci.extend({initialize:function(t,e){c(this,e),this._layers={},t&&this.addData(t)},addData:function(t){var e,i,n,o=d(t)?t:t.features;if(o){for(e=0,i=o.length;e<i;e++)((n=o[e]).geometries||n.geometry||n.features||n.coordinates)&&this.addData(n);return this}var s,r=this.options;return(!r.filter||r.filter(t))&&(s=bi(t,r))?(s.feature=Zi(t),s.defaultOptions=s.options,this.resetStyle(s),r.onEachFeature&&r.onEachFeature(t,s),this.addLayer(s)):this},resetStyle:function(t){return void 0===t?this.eachLayer(this.resetStyle,this):(t.options=l({},t.defaultOptions),this._setLayerStyle(t,this.options.style),this)},setStyle:function(e){return this.eachLayer(function(t){this._setLayerStyle(t,e)},this)},_setLayerStyle:function(t,e){t.setStyle&&("function"==typeof e&&(e=e(t.feature)),t.setStyle(e))}});function bi(t,e){var i,n,o,s,r="Feature"===t.type?t.geometry:t,a=r?r.coordinates:null,h=[],l=e&&e.pointToLayer,u=e&&e.coordsToLatLng||Li;if(!a&&!r)return null;switch(r.type){case"Point":return Pi(l,t,i=u(a),e);case"MultiPoint":for(o=0,s=a.length;o<s;o++)i=u(a[o]),h.push(Pi(l,t,i,e));return new ci(h);case"LineString":case"MultiLineString":return n=Ti(a,"LineString"===r.type?0:1,u),new yi(n,e);case"Polygon":case"MultiPolygon":return n=Ti(a,"Polygon"===r.type?1:2,u),new xi(n,e);case"GeometryCollection":for(o=0,s=r.geometries.length;o<s;o++){var c=bi({geometry:r.geometries[o],type:"Feature",properties:t.properties},e);c&&h.push(c)}return new ci(h);case"FeatureCollection":for(o=0,s=r.features.length;o<s;o++){var d=bi(r.features[o],e);d&&h.push(d)}return new ci(h);default:throw new Error("Invalid GeoJSON object.")}}function Pi(t,e,i,n){return t?t(e,i):new mi(i,n&&n.markersInheritOptions&&n)}function Li(t){return new v(t[1],t[0],t[2])}function Ti(t,e,i){for(var n,o=[],s=0,r=t.length;s<r;s++)n=e?Ti(t[s],e-1,i):(i||Li)(t[s]),o.push(n);return o}function Mi(t,e){return void 0!==(t=w(t)).alt?[i(t.lng,e),i(t.lat,e),i(t.alt,e)]:[i(t.lng,e),i(t.lat,e)]}function zi(t,e,i,n){for(var o=[],s=0,r=t.length;s<r;s++)o.push(e?zi(t[s],I(t[s])?0:e-1,i,n):Mi(t[s],n));return!e&&i&&0<o.length&&o.push(o[0].slice()),o}function Ci(t,e){return t.feature?l({},t.feature,{geometry:e}):Zi(e)}function Zi(t){return"Feature"===t.type||"FeatureCollection"===t.type?t:{type:"Feature",properties:{},geometry:t}}Tt={toGeoJSON:function(t){return Ci(this,{type:"Point",coordinates:Mi(this.getLatLng(),t)})}};function Si(t,e){return new wi(t,e)}mi.include(Tt),vi.include(Tt),gi.include(Tt),yi.include({toGeoJSON:function(t){var e=!I(this._latlngs);return Ci(this,{type:(e?"Multi":"")+"LineString",coordinates:zi(this._latlngs,e?1:0,!1,t)})}}),xi.include({toGeoJSON:function(t){var e=!I(this._latlngs),i=e&&!I(this._latlngs[0]),t=zi(this._latlngs,i?2:e?1:0,!0,t);return Ci(this,{type:(i?"Multi":"")+"Polygon",coordinates:t=e?t:[t]})}}),ui.include({toMultiPoint:function(e){var i=[];return this.eachLayer(function(t){i.push(t.toGeoJSON(e).geometry.coordinates)}),Ci(this,{type:"MultiPoint",coordinates:i})},toGeoJSON:function(e){var i,n,t=this.feature&&this.feature.geometry&&this.feature.geometry.type;return"MultiPoint"===t?this.toMultiPoint(e):(i="GeometryCollection"===t,n=[],this.eachLayer(function(t){t.toGeoJSON&&(t=t.toGeoJSON(e),i?n.push(t.geometry):"FeatureCollection"===(t=Zi(t)).type?n.push.apply(n,t.features):n.push(t))}),i?Ci(this,{geometries:n,type:"GeometryCollection"}):{type:"FeatureCollection",features:n})}});var Mt=Si,Ei=o.extend({options:{opacity:1,alt:"",interactive:!1,crossOrigin:!1,errorOverlayUrl:"",zIndex:1,className:""},initialize:function(t,e,i){this._url=t,this._bounds=g(e),c(this,i)},onAdd:function(){this._image||(this._initImage(),this.options.opacity<1&&this._updateOpacity()),this.options.interactive&&(M(this._image,"leaflet-interactive"),this.addInteractiveTarget(this._image)),this.getPane().appendChild(this._image),this._reset()},onRemove:function(){T(this._image),this.options.interactive&&this.removeInteractiveTarget(this._image)},setOpacity:function(t){return this.options.opacity=t,this._image&&this._updateOpacity(),this},setStyle:function(t){return t.opacity&&this.setOpacity(t.opacity),this},bringToFront:function(){return this._map&&fe(this._image),this},bringToBack:function(){return this._map&&ge(this._image),this},setUrl:function(t){return this._url=t,this._image&&(this._image.src=t),this},setBounds:function(t){return this._bounds=g(t),this._map&&this._reset(),this},getEvents:function(){var t={zoom:this._reset,viewreset:this._reset};return this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},setZIndex:function(t){return this.options.zIndex=t,this._updateZIndex(),this},getBounds:function(){return this._bounds},getElement:function(){return this._image},_initImage:function(){var t="IMG"===this._url.tagName,e=this._image=t?this._url:P("img");M(e,"leaflet-image-layer"),this._zoomAnimated&&M(e,"leaflet-zoom-animated"),this.options.className&&M(e,this.options.className),e.onselectstart=u,e.onmousemove=u,e.onload=a(this.fire,this,"load"),e.onerror=a(this._overlayOnError,this,"error"),!this.options.crossOrigin&&""!==this.options.crossOrigin||(e.crossOrigin=!0===this.options.crossOrigin?"":this.options.crossOrigin),this.options.zIndex&&this._updateZIndex(),t?this._url=e.src:(e.src=this._url,e.alt=this.options.alt)},_animateZoom:function(t){var e=this._map.getZoomScale(t.zoom),t=this._map._latLngBoundsToNewLayerBounds(this._bounds,t.zoom,t.center).min;be(this._image,t,e)},_reset:function(){var t=this._image,e=new f(this._map.latLngToLayerPoint(this._bounds.getNorthWest()),this._map.latLngToLayerPoint(this._bounds.getSouthEast())),i=e.getSize();Z(t,e.min),t.style.width=i.x+"px",t.style.height=i.y+"px"},_updateOpacity:function(){C(this._image,this.options.opacity)},_updateZIndex:function(){this._image&&void 0!==this.options.zIndex&&null!==this.options.zIndex&&(this._image.style.zIndex=this.options.zIndex)},_overlayOnError:function(){this.fire("error");var t=this.options.errorOverlayUrl;t&&this._url!==t&&(this._url=t,this._image.src=t)},getCenter:function(){return this._bounds.getCenter()}}),ki=Ei.extend({options:{autoplay:!0,loop:!0,keepAspectRatio:!0,muted:!1,playsInline:!0},_initImage:function(){var t="VIDEO"===this._url.tagName,e=this._image=t?this._url:P("video");if(M(e,"leaflet-image-layer"),this._zoomAnimated&&M(e,"leaflet-zoom-animated"),this.options.className&&M(e,this.options.className),e.onselectstart=u,e.onmousemove=u,e.onloadeddata=a(this.fire,this,"load"),t){for(var i=e.getElementsByTagName("source"),n=[],o=0;o<i.length;o++)n.push(i[o].src);this._url=0<i.length?n:[e.src]}else{d(this._url)||(this._url=[this._url]),!this.options.keepAspectRatio&&Object.prototype.hasOwnProperty.call(e.style,"objectFit")&&(e.style.objectFit="fill"),e.autoplay=!!this.options.autoplay,e.loop=!!this.options.loop,e.muted=!!this.options.muted,e.playsInline=!!this.options.playsInline;for(var s=0;s<this._url.length;s++){var r=P("source");r.src=this._url[s],e.appendChild(r)}}}});var Oi=Ei.extend({_initImage:function(){var t=this._image=this._url;M(t,"leaflet-image-layer"),this._zoomAnimated&&M(t,"leaflet-zoom-animated"),this.options.className&&M(t,this.options.className),t.onselectstart=u,t.onmousemove=u}});var Ai=o.extend({options:{interactive:!1,offset:[0,0],className:"",pane:void 0,content:""},initialize:function(t,e){t&&(t instanceof v||d(t))?(this._latlng=w(t),c(this,e)):(c(this,t),this._source=e),this.options.content&&(this._content=this.options.content)},openOn:function(t){return(t=arguments.length?t:this._source._map).hasLayer(this)||t.addLayer(this),this},close:function(){return this._map&&this._map.removeLayer(this),this},toggle:function(t){return this._map?this.close():(arguments.length?this._source=t:t=this._source,this._prepareOpen(),this.openOn(t._map)),this},onAdd:function(t){this._zoomAnimated=t._zoomAnimated,this._container||this._initLayout(),t._fadeAnimated&&C(this._container,0),clearTimeout(this._removeTimeout),this.getPane().appendChild(this._container),this.update(),t._fadeAnimated&&C(this._container,1),this.bringToFront(),this.options.interactive&&(M(this._container,"leaflet-interactive"),this.addInteractiveTarget(this._container))},onRemove:function(t){t._fadeAnimated?(C(this._container,0),this._removeTimeout=setTimeout(a(T,void 0,this._container),200)):T(this._container),this.options.interactive&&(z(this._container,"leaflet-interactive"),this.removeInteractiveTarget(this._container))},getLatLng:function(){return this._latlng},setLatLng:function(t){return this._latlng=w(t),this._map&&(this._updatePosition(),this._adjustPan()),this},getContent:function(){return this._content},setContent:function(t){return this._content=t,this.update(),this},getElement:function(){return this._container},update:function(){this._map&&(this._container.style.visibility="hidden",this._updateContent(),this._updateLayout(),this._updatePosition(),this._container.style.visibility="",this._adjustPan())},getEvents:function(){var t={zoom:this._updatePosition,viewreset:this._updatePosition};return this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},isOpen:function(){return!!this._map&&this._map.hasLayer(this)},bringToFront:function(){return this._map&&fe(this._container),this},bringToBack:function(){return this._map&&ge(this._container),this},_prepareOpen:function(t){if(!(i=this._source)._map)return!1;if(i instanceof ci){var e,i=null,n=this._source._layers;for(e in n)if(n[e]._map){i=n[e];break}if(!i)return!1;this._source=i}if(!t)if(i.getCenter)t=i.getCenter();else if(i.getLatLng)t=i.getLatLng();else{if(!i.getBounds)throw new Error("Unable to get source layer LatLng.");t=i.getBounds().getCenter()}return this.setLatLng(t),this._map&&this.update(),!0},_updateContent:function(){if(this._content){var t=this._contentNode,e="function"==typeof this._content?this._content(this._source||this):this._content;if("string"==typeof e)t.innerHTML=e;else{for(;t.hasChildNodes();)t.removeChild(t.firstChild);t.appendChild(e)}this.fire("contentupdate")}},_updatePosition:function(){var t,e,i;this._map&&(e=this._map.latLngToLayerPoint(this._latlng),t=m(this.options.offset),i=this._getAnchor(),this._zoomAnimated?Z(this._container,e.add(i)):t=t.add(e).add(i),e=this._containerBottom=-t.y,i=this._containerLeft=-Math.round(this._containerWidth/2)+t.x,this._container.style.bottom=e+"px",this._container.style.left=i+"px")},_getAnchor:function(){return[0,0]}}),Bi=(A.include({_initOverlay:function(t,e,i,n){var o=e;return o instanceof t||(o=new t(n).setContent(e)),i&&o.setLatLng(i),o}}),o.include({_initOverlay:function(t,e,i,n){var o=i;return o instanceof t?(c(o,n),o._source=this):(o=e&&!n?e:new t(n,this)).setContent(i),o}}),Ai.extend({options:{pane:"popupPane",offset:[0,7],maxWidth:300,minWidth:50,maxHeight:null,autoPan:!0,autoPanPaddingTopLeft:null,autoPanPaddingBottomRight:null,autoPanPadding:[5,5],keepInView:!1,closeButton:!0,autoClose:!0,closeOnEscapeKey:!0,className:""},openOn:function(t){return!(t=arguments.length?t:this._source._map).hasLayer(this)&&t._popup&&t._popup.options.autoClose&&t.removeLayer(t._popup),t._popup=this,Ai.prototype.openOn.call(this,t)},onAdd:function(t){Ai.prototype.onAdd.call(this,t),t.fire("popupopen",{popup:this}),this._source&&(this._source.fire("popupopen",{popup:this},!0),this._source instanceof fi||this._source.on("preclick",Ae))},onRemove:function(t){Ai.prototype.onRemove.call(this,t),t.fire("popupclose",{popup:this}),this._source&&(this._source.fire("popupclose",{popup:this},!0),this._source instanceof fi||this._source.off("preclick",Ae))},getEvents:function(){var t=Ai.prototype.getEvents.call(this);return(void 0!==this.options.closeOnClick?this.options.closeOnClick:this._map.options.closePopupOnClick)&&(t.preclick=this.close),this.options.keepInView&&(t.moveend=this._adjustPan),t},_initLayout:function(){var t="leaflet-popup",e=this._container=P("div",t+" "+(this.options.className||"")+" leaflet-zoom-animated"),i=this._wrapper=P("div",t+"-content-wrapper",e);this._contentNode=P("div",t+"-content",i),Ie(e),Be(this._contentNode),S(e,"contextmenu",Ae),this._tipContainer=P("div",t+"-tip-container",e),this._tip=P("div",t+"-tip",this._tipContainer),this.options.closeButton&&((i=this._closeButton=P("a",t+"-close-button",e)).setAttribute("role","button"),i.setAttribute("aria-label","Close popup"),i.href="#close",i.innerHTML='<span aria-hidden="true">&#215;</span>',S(i,"click",function(t){O(t),this.close()},this))},_updateLayout:function(){var t=this._contentNode,e=t.style,i=(e.width="",e.whiteSpace="nowrap",t.offsetWidth),i=Math.min(i,this.options.maxWidth),i=(i=Math.max(i,this.options.minWidth),e.width=i+1+"px",e.whiteSpace="",e.height="",t.offsetHeight),n=this.options.maxHeight,o="leaflet-popup-scrolled";(n&&n<i?(e.height=n+"px",M):z)(t,o),this._containerWidth=this._container.offsetWidth},_animateZoom:function(t){var t=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center),e=this._getAnchor();Z(this._container,t.add(e))},_adjustPan:function(){var t,e,i,n,o,s,r,a;this.options.autoPan&&(this._map._panAnim&&this._map._panAnim.stop(),this._autopanning?this._autopanning=!1:(t=this._map,e=parseInt(pe(this._container,"marginBottom"),10)||0,e=this._container.offsetHeight+e,a=this._containerWidth,(i=new p(this._containerLeft,-e-this._containerBottom))._add(Pe(this._container)),i=t.layerPointToContainerPoint(i),o=m(this.options.autoPanPadding),n=m(this.options.autoPanPaddingTopLeft||o),o=m(this.options.autoPanPaddingBottomRight||o),s=t.getSize(),r=0,i.x+a+o.x>s.x&&(r=i.x+a-s.x+o.x),i.x-r-n.x<(a=0)&&(r=i.x-n.x),i.y+e+o.y>s.y&&(a=i.y+e-s.y+o.y),i.y-a-n.y<0&&(a=i.y-n.y),(r||a)&&(this.options.keepInView&&(this._autopanning=!0),t.fire("autopanstart").panBy([r,a]))))},_getAnchor:function(){return m(this._source&&this._source._getPopupAnchor?this._source._getPopupAnchor():[0,0])}})),Ii=(A.mergeOptions({closePopupOnClick:!0}),A.include({openPopup:function(t,e,i){return this._initOverlay(Bi,t,e,i).openOn(this),this},closePopup:function(t){return(t=arguments.length?t:this._popup)&&t.close(),this}}),o.include({bindPopup:function(t,e){return this._popup=this._initOverlay(Bi,this._popup,t,e),this._popupHandlersAdded||(this.on({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!0),this},unbindPopup:function(){return this._popup&&(this.off({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!1,this._popup=null),this},openPopup:function(t){return this._popup&&(this instanceof ci||(this._popup._source=this),this._popup._prepareOpen(t||this._latlng)&&this._popup.openOn(this._map)),this},closePopup:function(){return this._popup&&this._popup.close(),this},togglePopup:function(){return this._popup&&this._popup.toggle(this),this},isPopupOpen:function(){return!!this._popup&&this._popup.isOpen()},setPopupContent:function(t){return this._popup&&this._popup.setContent(t),this},getPopup:function(){return this._popup},_openPopup:function(t){var e;this._popup&&this._map&&(Re(t),e=t.layer||t.target,this._popup._source!==e||e instanceof fi?(this._popup._source=e,this.openPopup(t.latlng)):this._map.hasLayer(this._popup)?this.closePopup():this.openPopup(t.latlng))},_movePopup:function(t){this._popup.setLatLng(t.latlng)},_onKeyPress:function(t){13===t.originalEvent.keyCode&&this._openPopup(t)}}),Ai.extend({options:{pane:"tooltipPane",offset:[0,0],direction:"auto",permanent:!1,sticky:!1,opacity:.9},onAdd:function(t){Ai.prototype.onAdd.call(this,t),this.setOpacity(this.options.opacity),t.fire("tooltipopen",{tooltip:this}),this._source&&(this.addEventParent(this._source),this._source.fire("tooltipopen",{tooltip:this},!0))},onRemove:function(t){Ai.prototype.onRemove.call(this,t),t.fire("tooltipclose",{tooltip:this}),this._source&&(this.removeEventParent(this._source),this._source.fire("tooltipclose",{tooltip:this},!0))},getEvents:function(){var t=Ai.prototype.getEvents.call(this);return this.options.permanent||(t.preclick=this.close),t},_initLayout:function(){var t="leaflet-tooltip "+(this.options.className||"")+" leaflet-zoom-"+(this._zoomAnimated?"animated":"hide");this._contentNode=this._container=P("div",t),this._container.setAttribute("role","tooltip"),this._container.setAttribute("id","leaflet-tooltip-"+h(this))},_updateLayout:function(){},_adjustPan:function(){},_setPosition:function(t){var e,i=this._map,n=this._container,o=i.latLngToContainerPoint(i.getCenter()),i=i.layerPointToContainerPoint(t),s=this.options.direction,r=n.offsetWidth,a=n.offsetHeight,h=m(this.options.offset),l=this._getAnchor(),i="top"===s?(e=r/2,a):"bottom"===s?(e=r/2,0):(e="center"===s?r/2:"right"===s?0:"left"===s?r:i.x<o.x?(s="right",0):(s="left",r+2*(h.x+l.x)),a/2);t=t.subtract(m(e,i,!0)).add(h).add(l),z(n,"leaflet-tooltip-right"),z(n,"leaflet-tooltip-left"),z(n,"leaflet-tooltip-top"),z(n,"leaflet-tooltip-bottom"),M(n,"leaflet-tooltip-"+s),Z(n,t)},_updatePosition:function(){var t=this._map.latLngToLayerPoint(this._latlng);this._setPosition(t)},setOpacity:function(t){this.options.opacity=t,this._container&&C(this._container,t)},_animateZoom:function(t){t=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center);this._setPosition(t)},_getAnchor:function(){return m(this._source&&this._source._getTooltipAnchor&&!this.options.sticky?this._source._getTooltipAnchor():[0,0])}})),Ri=(A.include({openTooltip:function(t,e,i){return this._initOverlay(Ii,t,e,i).openOn(this),this},closeTooltip:function(t){return t.close(),this}}),o.include({bindTooltip:function(t,e){return this._tooltip&&this.isTooltipOpen()&&this.unbindTooltip(),this._tooltip=this._initOverlay(Ii,this._tooltip,t,e),this._initTooltipInteractions(),this._tooltip.options.permanent&&this._map&&this._map.hasLayer(this)&&this.openTooltip(),this},unbindTooltip:function(){return this._tooltip&&(this._initTooltipInteractions(!0),this.closeTooltip(),this._tooltip=null),this},_initTooltipInteractions:function(t){var e,i;!t&&this._tooltipHandlersAdded||(e=t?"off":"on",i={remove:this.closeTooltip,move:this._moveTooltip},this._tooltip.options.permanent?i.add=this._openTooltip:(i.mouseover=this._openTooltip,i.mouseout=this.closeTooltip,i.click=this._openTooltip,this._map?this._addFocusListeners():i.add=this._addFocusListeners),this._tooltip.options.sticky&&(i.mousemove=this._moveTooltip),this[e](i),this._tooltipHandlersAdded=!t)},openTooltip:function(t){return this._tooltip&&(this instanceof ci||(this._tooltip._source=this),this._tooltip._prepareOpen(t)&&(this._tooltip.openOn(this._map),this.getElement?this._setAriaDescribedByOnLayer(this):this.eachLayer&&this.eachLayer(this._setAriaDescribedByOnLayer,this))),this},closeTooltip:function(){if(this._tooltip)return this._tooltip.close()},toggleTooltip:function(){return this._tooltip&&this._tooltip.toggle(this),this},isTooltipOpen:function(){return this._tooltip.isOpen()},setTooltipContent:function(t){return this._tooltip&&this._tooltip.setContent(t),this},getTooltip:function(){return this._tooltip},_addFocusListeners:function(){this.getElement?this._addFocusListenersOnLayer(this):this.eachLayer&&this.eachLayer(this._addFocusListenersOnLayer,this)},_addFocusListenersOnLayer:function(t){var e="function"==typeof t.getElement&&t.getElement();e&&(S(e,"focus",function(){this._tooltip._source=t,this.openTooltip()},this),S(e,"blur",this.closeTooltip,this))},_setAriaDescribedByOnLayer:function(t){t="function"==typeof t.getElement&&t.getElement();t&&t.setAttribute("aria-describedby",this._tooltip._container.id)},_openTooltip:function(t){var e;this._tooltip&&this._map&&(this._map.dragging&&this._map.dragging.moving()&&!this._openOnceFlag?(this._openOnceFlag=!0,(e=this)._map.once("moveend",function(){e._openOnceFlag=!1,e._openTooltip(t)})):(this._tooltip._source=t.layer||t.target,this.openTooltip(this._tooltip.options.sticky?t.latlng:void 0)))},_moveTooltip:function(t){var e=t.latlng;this._tooltip.options.sticky&&t.originalEvent&&(t=this._map.mouseEventToContainerPoint(t.originalEvent),t=this._map.containerPointToLayerPoint(t),e=this._map.layerPointToLatLng(t)),this._tooltip.setLatLng(e)}}),di.extend({options:{iconSize:[12,12],html:!1,bgPos:null,className:"leaflet-div-icon"},createIcon:function(t){var t=t&&"DIV"===t.tagName?t:document.createElement("div"),e=this.options;return e.html instanceof Element?(me(t),t.appendChild(e.html)):t.innerHTML=!1!==e.html?e.html:"",e.bgPos&&(e=m(e.bgPos),t.style.backgroundPosition=-e.x+"px "+-e.y+"px"),this._setIconStyles(t,"icon"),t},createShadow:function(){return null}}));di.Default=_i;var Ni=o.extend({options:{tileSize:256,opacity:1,updateWhenIdle:b.mobile,updateWhenZooming:!0,updateInterval:200,zIndex:1,bounds:null,minZoom:0,maxZoom:void 0,maxNativeZoom:void 0,minNativeZoom:void 0,noWrap:!1,pane:"tilePane",className:"",keepBuffer:2},initialize:function(t){c(this,t)},onAdd:function(){this._initContainer(),this._levels={},this._tiles={},this._resetView()},beforeAdd:function(t){t._addZoomLimit(this)},onRemove:function(t){this._removeAllTiles(),T(this._container),t._removeZoomLimit(this),this._container=null,this._tileZoom=void 0},bringToFront:function(){return this._map&&(fe(this._container),this._setAutoZIndex(Math.max)),this},bringToBack:function(){return this._map&&(ge(this._container),this._setAutoZIndex(Math.min)),this},getContainer:function(){return this._container},setOpacity:function(t){return this.options.opacity=t,this._updateOpacity(),this},setZIndex:function(t){return this.options.zIndex=t,this._updateZIndex(),this},isLoading:function(){return this._loading},redraw:function(){var t;return this._map&&(this._removeAllTiles(),(t=this._clampZoom(this._map.getZoom()))!==this._tileZoom&&(this._tileZoom=t,this._updateLevels()),this._update()),this},getEvents:function(){var t={viewprereset:this._invalidateAll,viewreset:this._resetView,zoom:this._resetView,moveend:this._onMoveEnd};return this.options.updateWhenIdle||(this._onMove||(this._onMove=j(this._onMoveEnd,this.options.updateInterval,this)),t.move=this._onMove),this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},createTile:function(){return document.createElement("div")},getTileSize:function(){var t=this.options.tileSize;return t instanceof p?t:new p(t,t)},_updateZIndex:function(){this._container&&void 0!==this.options.zIndex&&null!==this.options.zIndex&&(this._container.style.zIndex=this.options.zIndex)},_setAutoZIndex:function(t){for(var e,i=this.getPane().children,n=-t(-1/0,1/0),o=0,s=i.length;o<s;o++)e=i[o].style.zIndex,i[o]!==this._container&&e&&(n=t(n,+e));isFinite(n)&&(this.options.zIndex=n+t(-1,1),this._updateZIndex())},_updateOpacity:function(){if(this._map&&!b.ielt9){C(this._container,this.options.opacity);var t,e=+new Date,i=!1,n=!1;for(t in this._tiles){var o,s=this._tiles[t];s.current&&s.loaded&&(o=Math.min(1,(e-s.loaded)/200),C(s.el,o),o<1?i=!0:(s.active?n=!0:this._onOpaqueTile(s),s.active=!0))}n&&!this._noPrune&&this._pruneTiles(),i&&(r(this._fadeFrame),this._fadeFrame=x(this._updateOpacity,this))}},_onOpaqueTile:u,_initContainer:function(){this._container||(this._container=P("div","leaflet-layer "+(this.options.className||"")),this._updateZIndex(),this.options.opacity<1&&this._updateOpacity(),this.getPane().appendChild(this._container))},_updateLevels:function(){var t=this._tileZoom,e=this.options.maxZoom;if(void 0!==t){for(var i in this._levels)i=Number(i),this._levels[i].el.children.length||i===t?(this._levels[i].el.style.zIndex=e-Math.abs(t-i),this._onUpdateLevel(i)):(T(this._levels[i].el),this._removeTilesAtZoom(i),this._onRemoveLevel(i),delete this._levels[i]);var n=this._levels[t],o=this._map;return n||((n=this._levels[t]={}).el=P("div","leaflet-tile-container leaflet-zoom-animated",this._container),n.el.style.zIndex=e,n.origin=o.project(o.unproject(o.getPixelOrigin()),t).round(),n.zoom=t,this._setZoomTransform(n,o.getCenter(),o.getZoom()),u(n.el.offsetWidth),this._onCreateLevel(n)),this._level=n}},_onUpdateLevel:u,_onRemoveLevel:u,_onCreateLevel:u,_pruneTiles:function(){if(this._map){var t,e,i,n=this._map.getZoom();if(n>this.options.maxZoom||n<this.options.minZoom)this._removeAllTiles();else{for(t in this._tiles)(i=this._tiles[t]).retain=i.current;for(t in this._tiles)(i=this._tiles[t]).current&&!i.active&&(e=i.coords,this._retainParent(e.x,e.y,e.z,e.z-5)||this._retainChildren(e.x,e.y,e.z,e.z+2));for(t in this._tiles)this._tiles[t].retain||this._removeTile(t)}}},_removeTilesAtZoom:function(t){for(var e in this._tiles)this._tiles[e].coords.z===t&&this._removeTile(e)},_removeAllTiles:function(){for(var t in this._tiles)this._removeTile(t)},_invalidateAll:function(){for(var t in this._levels)T(this._levels[t].el),this._onRemoveLevel(Number(t)),delete this._levels[t];this._removeAllTiles(),this._tileZoom=void 0},_retainParent:function(t,e,i,n){var t=Math.floor(t/2),e=Math.floor(e/2),i=i-1,o=new p(+t,+e),o=(o.z=i,this._tileCoordsToKey(o)),o=this._tiles[o];return o&&o.active?o.retain=!0:(o&&o.loaded&&(o.retain=!0),n<i&&this._retainParent(t,e,i,n))},_retainChildren:function(t,e,i,n){for(var o=2*t;o<2*t+2;o++)for(var s=2*e;s<2*e+2;s++){var r=new p(o,s),r=(r.z=i+1,this._tileCoordsToKey(r)),r=this._tiles[r];r&&r.active?r.retain=!0:(r&&r.loaded&&(r.retain=!0),i+1<n&&this._retainChildren(o,s,i+1,n))}},_resetView:function(t){t=t&&(t.pinch||t.flyTo);this._setView(this._map.getCenter(),this._map.getZoom(),t,t)},_animateZoom:function(t){this._setView(t.center,t.zoom,!0,t.noUpdate)},_clampZoom:function(t){var e=this.options;return void 0!==e.minNativeZoom&&t<e.minNativeZoom?e.minNativeZoom:void 0!==e.maxNativeZoom&&e.maxNativeZoom<t?e.maxNativeZoom:t},_setView:function(t,e,i,n){var o=Math.round(e),o=void 0!==this.options.maxZoom&&o>this.options.maxZoom||void 0!==this.options.minZoom&&o<this.options.minZoom?void 0:this._clampZoom(o),s=this.options.updateWhenZooming&&o!==this._tileZoom;n&&!s||(this._tileZoom=o,this._abortLoading&&this._abortLoading(),this._updateLevels(),this._resetGrid(),void 0!==o&&this._update(t),i||this._pruneTiles(),this._noPrune=!!i),this._setZoomTransforms(t,e)},_setZoomTransforms:function(t,e){for(var i in this._levels)this._setZoomTransform(this._levels[i],t,e)},_setZoomTransform:function(t,e,i){var n=this._map.getZoomScale(i,t.zoom),e=t.origin.multiplyBy(n).subtract(this._map._getNewPixelOrigin(e,i)).round();b.any3d?be(t.el,e,n):Z(t.el,e)},_resetGrid:function(){var t=this._map,e=t.options.crs,i=this._tileSize=this.getTileSize(),n=this._tileZoom,o=this._map.getPixelWorldBounds(this._tileZoom);o&&(this._globalTileRange=this._pxBoundsToTileRange(o)),this._wrapX=e.wrapLng&&!this.options.noWrap&&[Math.floor(t.project([0,e.wrapLng[0]],n).x/i.x),Math.ceil(t.project([0,e.wrapLng[1]],n).x/i.y)],this._wrapY=e.wrapLat&&!this.options.noWrap&&[Math.floor(t.project([e.wrapLat[0],0],n).y/i.x),Math.ceil(t.project([e.wrapLat[1],0],n).y/i.y)]},_onMoveEnd:function(){this._map&&!this._map._animatingZoom&&this._update()},_getTiledPixelBounds:function(t){var e=this._map,i=e._animatingZoom?Math.max(e._animateToZoom,e.getZoom()):e.getZoom(),i=e.getZoomScale(i,this._tileZoom),t=e.project(t,this._tileZoom).floor(),e=e.getSize().divideBy(2*i);return new f(t.subtract(e),t.add(e))},_update:function(t){var e=this._map;if(e){var i=this._clampZoom(e.getZoom());if(void 0===t&&(t=e.getCenter()),void 0!==this._tileZoom){var n,e=this._getTiledPixelBounds(t),o=this._pxBoundsToTileRange(e),s=o.getCenter(),r=[],e=this.options.keepBuffer,a=new f(o.getBottomLeft().subtract([e,-e]),o.getTopRight().add([e,-e]));if(!(isFinite(o.min.x)&&isFinite(o.min.y)&&isFinite(o.max.x)&&isFinite(o.max.y)))throw new Error("Attempted to load an infinite number of tiles");for(n in this._tiles){var h=this._tiles[n].coords;h.z===this._tileZoom&&a.contains(new p(h.x,h.y))||(this._tiles[n].current=!1)}if(1<Math.abs(i-this._tileZoom))this._setView(t,i);else{for(var l=o.min.y;l<=o.max.y;l++)for(var u=o.min.x;u<=o.max.x;u++){var c,d=new p(u,l);d.z=this._tileZoom,this._isValidTile(d)&&((c=this._tiles[this._tileCoordsToKey(d)])?c.current=!0:r.push(d))}if(r.sort(function(t,e){return t.distanceTo(s)-e.distanceTo(s)}),0!==r.length){this._loading||(this._loading=!0,this.fire("loading"));for(var _=document.createDocumentFragment(),u=0;u<r.length;u++)this._addTile(r[u],_);this._level.el.appendChild(_)}}}}},_isValidTile:function(t){var e=this._map.options.crs;if(!e.infinite){var i=this._globalTileRange;if(!e.wrapLng&&(t.x<i.min.x||t.x>i.max.x)||!e.wrapLat&&(t.y<i.min.y||t.y>i.max.y))return!1}return!this.options.bounds||(e=this._tileCoordsToBounds(t),g(this.options.bounds).overlaps(e))},_keyToBounds:function(t){return this._tileCoordsToBounds(this._keyToTileCoords(t))},_tileCoordsToNwSe:function(t){var e=this._map,i=this.getTileSize(),n=t.scaleBy(i),i=n.add(i);return[e.unproject(n,t.z),e.unproject(i,t.z)]},_tileCoordsToBounds:function(t){t=this._tileCoordsToNwSe(t),t=new s(t[0],t[1]);return t=this.options.noWrap?t:this._map.wrapLatLngBounds(t)},_tileCoordsToKey:function(t){return t.x+":"+t.y+":"+t.z},_keyToTileCoords:function(t){var t=t.split(":"),e=new p(+t[0],+t[1]);return e.z=+t[2],e},_removeTile:function(t){var e=this._tiles[t];e&&(T(e.el),delete this._tiles[t],this.fire("tileunload",{tile:e.el,coords:this._keyToTileCoords(t)}))},_initTile:function(t){M(t,"leaflet-tile");var e=this.getTileSize();t.style.width=e.x+"px",t.style.height=e.y+"px",t.onselectstart=u,t.onmousemove=u,b.ielt9&&this.options.opacity<1&&C(t,this.options.opacity)},_addTile:function(t,e){var i=this._getTilePos(t),n=this._tileCoordsToKey(t),o=this.createTile(this._wrapCoords(t),a(this._tileReady,this,t));this._initTile(o),this.createTile.length<2&&x(a(this._tileReady,this,t,null,o)),Z(o,i),this._tiles[n]={el:o,coords:t,current:!0},e.appendChild(o),this.fire("tileloadstart",{tile:o,coords:t})},_tileReady:function(t,e,i){e&&this.fire("tileerror",{error:e,tile:i,coords:t});var n=this._tileCoordsToKey(t);(i=this._tiles[n])&&(i.loaded=+new Date,this._map._fadeAnimated?(C(i.el,0),r(this._fadeFrame),this._fadeFrame=x(this._updateOpacity,this)):(i.active=!0,this._pruneTiles()),e||(M(i.el,"leaflet-tile-loaded"),this.fire("tileload",{tile:i.el,coords:t})),this._noTilesToLoad()&&(this._loading=!1,this.fire("load"),b.ielt9||!this._map._fadeAnimated?x(this._pruneTiles,this):setTimeout(a(this._pruneTiles,this),250)))},_getTilePos:function(t){return t.scaleBy(this.getTileSize()).subtract(this._level.origin)},_wrapCoords:function(t){var e=new p(this._wrapX?H(t.x,this._wrapX):t.x,this._wrapY?H(t.y,this._wrapY):t.y);return e.z=t.z,e},_pxBoundsToTileRange:function(t){var e=this.getTileSize();return new f(t.min.unscaleBy(e).floor(),t.max.unscaleBy(e).ceil().subtract([1,1]))},_noTilesToLoad:function(){for(var t in this._tiles)if(!this._tiles[t].loaded)return!1;return!0}});var Di=Ni.extend({options:{minZoom:0,maxZoom:18,subdomains:"abc",errorTileUrl:"",zoomOffset:0,tms:!1,zoomReverse:!1,detectRetina:!1,crossOrigin:!1,referrerPolicy:!1},initialize:function(t,e){this._url=t,(e=c(this,e)).detectRetina&&b.retina&&0<e.maxZoom?(e.tileSize=Math.floor(e.tileSize/2),e.zoomReverse?(e.zoomOffset--,e.minZoom=Math.min(e.maxZoom,e.minZoom+1)):(e.zoomOffset++,e.maxZoom=Math.max(e.minZoom,e.maxZoom-1)),e.minZoom=Math.max(0,e.minZoom)):e.zoomReverse?e.minZoom=Math.min(e.maxZoom,e.minZoom):e.maxZoom=Math.max(e.minZoom,e.maxZoom),"string"==typeof e.subdomains&&(e.subdomains=e.subdomains.split("")),this.on("tileunload",this._onTileRemove)},setUrl:function(t,e){return this._url===t&&void 0===e&&(e=!0),this._url=t,e||this.redraw(),this},createTile:function(t,e){var i=document.createElement("img");return S(i,"load",a(this._tileOnLoad,this,e,i)),S(i,"error",a(this._tileOnError,this,e,i)),!this.options.crossOrigin&&""!==this.options.crossOrigin||(i.crossOrigin=!0===this.options.crossOrigin?"":this.options.crossOrigin),"string"==typeof this.options.referrerPolicy&&(i.referrerPolicy=this.options.referrerPolicy),i.alt="",i.src=this.getTileUrl(t),i},getTileUrl:function(t){var e={r:b.retina?"@2x":"",s:this._getSubdomain(t),x:t.x,y:t.y,z:this._getZoomForUrl()};return this._map&&!this._map.options.crs.infinite&&(t=this._globalTileRange.max.y-t.y,this.options.tms&&(e.y=t),e["-y"]=t),q(this._url,l(e,this.options))},_tileOnLoad:function(t,e){b.ielt9?setTimeout(a(t,this,null,e),0):t(null,e)},_tileOnError:function(t,e,i){var n=this.options.errorTileUrl;n&&e.getAttribute("src")!==n&&(e.src=n),t(i,e)},_onTileRemove:function(t){t.tile.onload=null},_getZoomForUrl:function(){var t=this._tileZoom,e=this.options.maxZoom;return(t=this.options.zoomReverse?e-t:t)+this.options.zoomOffset},_getSubdomain:function(t){t=Math.abs(t.x+t.y)%this.options.subdomains.length;return this.options.subdomains[t]},_abortLoading:function(){var t,e,i;for(t in this._tiles)this._tiles[t].coords.z!==this._tileZoom&&((i=this._tiles[t].el).onload=u,i.onerror=u,i.complete||(i.src=K,e=this._tiles[t].coords,T(i),delete this._tiles[t],this.fire("tileabort",{tile:i,coords:e})))},_removeTile:function(t){var e=this._tiles[t];if(e)return e.el.setAttribute("src",K),Ni.prototype._removeTile.call(this,t)},_tileReady:function(t,e,i){if(this._map&&(!i||i.getAttribute("src")!==K))return Ni.prototype._tileReady.call(this,t,e,i)}});function ji(t,e){return new Di(t,e)}var Hi=Di.extend({defaultWmsParams:{service:"WMS",request:"GetMap",layers:"",styles:"",format:"image/jpeg",transparent:!1,version:"1.1.1"},options:{crs:null,uppercase:!1},initialize:function(t,e){this._url=t;var i,n=l({},this.defaultWmsParams);for(i in e)i in this.options||(n[i]=e[i]);var t=(e=c(this,e)).detectRetina&&b.retina?2:1,o=this.getTileSize();n.width=o.x*t,n.height=o.y*t,this.wmsParams=n},onAdd:function(t){this._crs=this.options.crs||t.options.crs,this._wmsVersion=parseFloat(this.wmsParams.version);var e=1.3<=this._wmsVersion?"crs":"srs";this.wmsParams[e]=this._crs.code,Di.prototype.onAdd.call(this,t)},getTileUrl:function(t){var e=this._tileCoordsToNwSe(t),i=this._crs,i=_(i.project(e[0]),i.project(e[1])),e=i.min,i=i.max,e=(1.3<=this._wmsVersion&&this._crs===li?[e.y,e.x,i.y,i.x]:[e.x,e.y,i.x,i.y]).join(","),i=Di.prototype.getTileUrl.call(this,t);return i+U(this.wmsParams,i,this.options.uppercase)+(this.options.uppercase?"&BBOX=":"&bbox=")+e},setParams:function(t,e){return l(this.wmsParams,t),e||this.redraw(),this}});Di.WMS=Hi,ji.wms=function(t,e){return new Hi(t,e)};var Wi=o.extend({options:{padding:.1},initialize:function(t){c(this,t),h(this),this._layers=this._layers||{}},onAdd:function(){this._container||(this._initContainer(),M(this._container,"leaflet-zoom-animated")),this.getPane().appendChild(this._container),this._update(),this.on("update",this._updatePaths,this)},onRemove:function(){this.off("update",this._updatePaths,this),this._destroyContainer()},getEvents:function(){var t={viewreset:this._reset,zoom:this._onZoom,moveend:this._update,zoomend:this._onZoomEnd};return this._zoomAnimated&&(t.zoomanim=this._onAnimZoom),t},_onAnimZoom:function(t){this._updateTransform(t.center,t.zoom)},_onZoom:function(){this._updateTransform(this._map.getCenter(),this._map.getZoom())},_updateTransform:function(t,e){var i=this._map.getZoomScale(e,this._zoom),n=this._map.getSize().multiplyBy(.5+this.options.padding),o=this._map.project(this._center,e),n=n.multiplyBy(-i).add(o).subtract(this._map._getNewPixelOrigin(t,e));b.any3d?be(this._container,n,i):Z(this._container,n)},_reset:function(){for(var t in this._update(),this._updateTransform(this._center,this._zoom),this._layers)this._layers[t]._reset()},_onZoomEnd:function(){for(var t in this._layers)this._layers[t]._project()},_updatePaths:function(){for(var t in this._layers)this._layers[t]._update()},_update:function(){var t=this.options.padding,e=this._map.getSize(),i=this._map.containerPointToLayerPoint(e.multiplyBy(-t)).round();this._bounds=new f(i,i.add(e.multiplyBy(1+2*t)).round()),this._center=this._map.getCenter(),this._zoom=this._map.getZoom()}}),Fi=Wi.extend({options:{tolerance:0},getEvents:function(){var t=Wi.prototype.getEvents.call(this);return t.viewprereset=this._onViewPreReset,t},_onViewPreReset:function(){this._postponeUpdatePaths=!0},onAdd:function(){Wi.prototype.onAdd.call(this),this._draw()},_initContainer:function(){var t=this._container=document.createElement("canvas");S(t,"mousemove",this._onMouseMove,this),S(t,"click dblclick mousedown mouseup contextmenu",this._onClick,this),S(t,"mouseout",this._handleMouseOut,this),t._leaflet_disable_events=!0,this._ctx=t.getContext("2d")},_destroyContainer:function(){r(this._redrawRequest),delete this._ctx,T(this._container),k(this._container),delete this._container},_updatePaths:function(){if(!this._postponeUpdatePaths){for(var t in this._redrawBounds=null,this._layers)this._layers[t]._update();this._redraw()}},_update:function(){var t,e,i,n;this._map._animatingZoom&&this._bounds||(Wi.prototype._update.call(this),t=this._bounds,e=this._container,i=t.getSize(),n=b.retina?2:1,Z(e,t.min),e.width=n*i.x,e.height=n*i.y,e.style.width=i.x+"px",e.style.height=i.y+"px",b.retina&&this._ctx.scale(2,2),this._ctx.translate(-t.min.x,-t.min.y),this.fire("update"))},_reset:function(){Wi.prototype._reset.call(this),this._postponeUpdatePaths&&(this._postponeUpdatePaths=!1,this._updatePaths())},_initPath:function(t){this._updateDashArray(t);t=(this._layers[h(t)]=t)._order={layer:t,prev:this._drawLast,next:null};this._drawLast&&(this._drawLast.next=t),this._drawLast=t,this._drawFirst=this._drawFirst||this._drawLast},_addPath:function(t){this._requestRedraw(t)},_removePath:function(t){var e=t._order,i=e.next,e=e.prev;i?i.prev=e:this._drawLast=e,e?e.next=i:this._drawFirst=i,delete t._order,delete this._layers[h(t)],this._requestRedraw(t)},_updatePath:function(t){this._extendRedrawBounds(t),t._project(),t._update(),this._requestRedraw(t)},_updateStyle:function(t){this._updateDashArray(t),this._requestRedraw(t)},_updateDashArray:function(t){if("string"==typeof t.options.dashArray){for(var e,i=t.options.dashArray.split(/[, ]+/),n=[],o=0;o<i.length;o++){if(e=Number(i[o]),isNaN(e))return;n.push(e)}t.options._dashArray=n}else t.options._dashArray=t.options.dashArray},_requestRedraw:function(t){this._map&&(this._extendRedrawBounds(t),this._redrawRequest=this._redrawRequest||x(this._redraw,this))},_extendRedrawBounds:function(t){var e;t._pxBounds&&(e=(t.options.weight||0)+1,this._redrawBounds=this._redrawBounds||new f,this._redrawBounds.extend(t._pxBounds.min.subtract([e,e])),this._redrawBounds.extend(t._pxBounds.max.add([e,e])))},_redraw:function(){this._redrawRequest=null,this._redrawBounds&&(this._redrawBounds.min._floor(),this._redrawBounds.max._ceil()),this._clear(),this._draw(),this._redrawBounds=null},_clear:function(){var t,e=this._redrawBounds;e?(t=e.getSize(),this._ctx.clearRect(e.min.x,e.min.y,t.x,t.y)):(this._ctx.save(),this._ctx.setTransform(1,0,0,1,0,0),this._ctx.clearRect(0,0,this._container.width,this._container.height),this._ctx.restore())},_draw:function(){var t,e,i=this._redrawBounds;this._ctx.save(),i&&(e=i.getSize(),this._ctx.beginPath(),this._ctx.rect(i.min.x,i.min.y,e.x,e.y),this._ctx.clip()),this._drawing=!0;for(var n=this._drawFirst;n;n=n.next)t=n.layer,(!i||t._pxBounds&&t._pxBounds.intersects(i))&&t._updatePath();this._drawing=!1,this._ctx.restore()},_updatePoly:function(t,e){if(this._drawing){var i,n,o,s,r=t._parts,a=r.length,h=this._ctx;if(a){for(h.beginPath(),i=0;i<a;i++){for(n=0,o=r[i].length;n<o;n++)s=r[i][n],h[n?"lineTo":"moveTo"](s.x,s.y);e&&h.closePath()}this._fillStroke(h,t)}}},_updateCircle:function(t){var e,i,n,o;this._drawing&&!t._empty()&&(e=t._point,i=this._ctx,n=Math.max(Math.round(t._radius),1),1!=(o=(Math.max(Math.round(t._radiusY),1)||n)/n)&&(i.save(),i.scale(1,o)),i.beginPath(),i.arc(e.x,e.y/o,n,0,2*Math.PI,!1),1!=o&&i.restore(),this._fillStroke(i,t))},_fillStroke:function(t,e){var i=e.options;i.fill&&(t.globalAlpha=i.fillOpacity,t.fillStyle=i.fillColor||i.color,t.fill(i.fillRule||"evenodd")),i.stroke&&0!==i.weight&&(t.setLineDash&&t.setLineDash(e.options&&e.options._dashArray||[]),t.globalAlpha=i.opacity,t.lineWidth=i.weight,t.strokeStyle=i.color,t.lineCap=i.lineCap,t.lineJoin=i.lineJoin,t.stroke())},_onClick:function(t){for(var e,i,n=this._map.mouseEventToLayerPoint(t),o=this._drawFirst;o;o=o.next)(e=o.layer).options.interactive&&e._containsPoint(n)&&(("click"===t.type||"preclick"===t.type)&&this._map._draggableMoved(e)||(i=e));this._fireEvent(!!i&&[i],t)},_onMouseMove:function(t){var e;!this._map||this._map.dragging.moving()||this._map._animatingZoom||(e=this._map.mouseEventToLayerPoint(t),this._handleMouseHover(t,e))},_handleMouseOut:function(t){var e=this._hoveredLayer;e&&(z(this._container,"leaflet-interactive"),this._fireEvent([e],t,"mouseout"),this._hoveredLayer=null,this._mouseHoverThrottled=!1)},_handleMouseHover:function(t,e){if(!this._mouseHoverThrottled){for(var i,n,o=this._drawFirst;o;o=o.next)(i=o.layer).options.interactive&&i._containsPoint(e)&&(n=i);n!==this._hoveredLayer&&(this._handleMouseOut(t),n&&(M(this._container,"leaflet-interactive"),this._fireEvent([n],t,"mouseover"),this._hoveredLayer=n)),this._fireEvent(!!this._hoveredLayer&&[this._hoveredLayer],t),this._mouseHoverThrottled=!0,setTimeout(a(function(){this._mouseHoverThrottled=!1},this),32)}},_fireEvent:function(t,e,i){this._map._fireDOMEvent(e,i||e.type,t)},_bringToFront:function(t){var e,i,n=t._order;n&&(e=n.next,i=n.prev,e&&((e.prev=i)?i.next=e:e&&(this._drawFirst=e),n.prev=this._drawLast,(this._drawLast.next=n).next=null,this._drawLast=n,this._requestRedraw(t)))},_bringToBack:function(t){var e,i,n=t._order;n&&(e=n.next,(i=n.prev)&&((i.next=e)?e.prev=i:i&&(this._drawLast=i),n.prev=null,n.next=this._drawFirst,this._drawFirst.prev=n,this._drawFirst=n,this._requestRedraw(t)))}});function Ui(t){return b.canvas?new Fi(t):null}var Vi=function(){try{return document.namespaces.add("lvml","urn:schemas-microsoft-com:vml"),function(t){return document.createElement("<lvml:"+t+' class="lvml">')}}catch(t){}return function(t){return document.createElement("<"+t+' xmlns="urn:schemas-microsoft.com:vml" class="lvml">')}}(),zt={_initContainer:function(){this._container=P("div","leaflet-vml-container")},_update:function(){this._map._animatingZoom||(Wi.prototype._update.call(this),this.fire("update"))},_initPath:function(t){var e=t._container=Vi("shape");M(e,"leaflet-vml-shape "+(this.options.className||"")),e.coordsize="1 1",t._path=Vi("path"),e.appendChild(t._path),this._updateStyle(t),this._layers[h(t)]=t},_addPath:function(t){var e=t._container;this._container.appendChild(e),t.options.interactive&&t.addInteractiveTarget(e)},_removePath:function(t){var e=t._container;T(e),t.removeInteractiveTarget(e),delete this._layers[h(t)]},_updateStyle:function(t){var e=t._stroke,i=t._fill,n=t.options,o=t._container;o.stroked=!!n.stroke,o.filled=!!n.fill,n.stroke?(e=e||(t._stroke=Vi("stroke")),o.appendChild(e),e.weight=n.weight+"px",e.color=n.color,e.opacity=n.opacity,n.dashArray?e.dashStyle=d(n.dashArray)?n.dashArray.join(" "):n.dashArray.replace(/( *, *)/g," "):e.dashStyle="",e.endcap=n.lineCap.replace("butt","flat"),e.joinstyle=n.lineJoin):e&&(o.removeChild(e),t._stroke=null),n.fill?(i=i||(t._fill=Vi("fill")),o.appendChild(i),i.color=n.fillColor||n.color,i.opacity=n.fillOpacity):i&&(o.removeChild(i),t._fill=null)},_updateCircle:function(t){var e=t._point.round(),i=Math.round(t._radius),n=Math.round(t._radiusY||i);this._setPath(t,t._empty()?"M0 0":"AL "+e.x+","+e.y+" "+i+","+n+" 0,23592600")},_setPath:function(t,e){t._path.v=e},_bringToFront:function(t){fe(t._container)},_bringToBack:function(t){ge(t._container)}},qi=b.vml?Vi:ct,Gi=Wi.extend({_initContainer:function(){this._container=qi("svg"),this._container.setAttribute("pointer-events","none"),this._rootGroup=qi("g"),this._container.appendChild(this._rootGroup)},_destroyContainer:function(){T(this._container),k(this._container),delete this._container,delete this._rootGroup,delete this._svgSize},_update:function(){var t,e,i;this._map._animatingZoom&&this._bounds||(Wi.prototype._update.call(this),e=(t=this._bounds).getSize(),i=this._container,this._svgSize&&this._svgSize.equals(e)||(this._svgSize=e,i.setAttribute("width",e.x),i.setAttribute("height",e.y)),Z(i,t.min),i.setAttribute("viewBox",[t.min.x,t.min.y,e.x,e.y].join(" ")),this.fire("update"))},_initPath:function(t){var e=t._path=qi("path");t.options.className&&M(e,t.options.className),t.options.interactive&&M(e,"leaflet-interactive"),this._updateStyle(t),this._layers[h(t)]=t},_addPath:function(t){this._rootGroup||this._initContainer(),this._rootGroup.appendChild(t._path),t.addInteractiveTarget(t._path)},_removePath:function(t){T(t._path),t.removeInteractiveTarget(t._path),delete this._layers[h(t)]},_updatePath:function(t){t._project(),t._update()},_updateStyle:function(t){var e=t._path,t=t.options;e&&(t.stroke?(e.setAttribute("stroke",t.color),e.setAttribute("stroke-opacity",t.opacity),e.setAttribute("stroke-width",t.weight),e.setAttribute("stroke-linecap",t.lineCap),e.setAttribute("stroke-linejoin",t.lineJoin),t.dashArray?e.setAttribute("stroke-dasharray",t.dashArray):e.removeAttribute("stroke-dasharray"),t.dashOffset?e.setAttribute("stroke-dashoffset",t.dashOffset):e.removeAttribute("stroke-dashoffset")):e.setAttribute("stroke","none"),t.fill?(e.setAttribute("fill",t.fillColor||t.color),e.setAttribute("fill-opacity",t.fillOpacity),e.setAttribute("fill-rule",t.fillRule||"evenodd")):e.setAttribute("fill","none"))},_updatePoly:function(t,e){this._setPath(t,dt(t._parts,e))},_updateCircle:function(t){var e=t._point,i=Math.max(Math.round(t._radius),1),n="a"+i+","+(Math.max(Math.round(t._radiusY),1)||i)+" 0 1,0 ",e=t._empty()?"M0 0":"M"+(e.x-i)+","+e.y+n+2*i+",0 "+n+2*-i+",0 ";this._setPath(t,e)},_setPath:function(t,e){t._path.setAttribute("d",e)},_bringToFront:function(t){fe(t._path)},_bringToBack:function(t){ge(t._path)}});function Ki(t){return b.svg||b.vml?new Gi(t):null}b.vml&&Gi.include(zt),A.include({getRenderer:function(t){t=(t=t.options.renderer||this._getPaneRenderer(t.options.pane)||this.options.renderer||this._renderer)||(this._renderer=this._createRenderer());return this.hasLayer(t)||this.addLayer(t),t},_getPaneRenderer:function(t){var e;return"overlayPane"!==t&&void 0!==t&&(void 0===(e=this._paneRenderers[t])&&(e=this._createRenderer({pane:t}),this._paneRenderers[t]=e),e)},_createRenderer:function(t){return this.options.preferCanvas&&Ui(t)||Ki(t)}});var Yi=xi.extend({initialize:function(t,e){xi.prototype.initialize.call(this,this._boundsToLatLngs(t),e)},setBounds:function(t){return this.setLatLngs(this._boundsToLatLngs(t))},_boundsToLatLngs:function(t){return[(t=g(t)).getSouthWest(),t.getNorthWest(),t.getNorthEast(),t.getSouthEast()]}});Gi.create=qi,Gi.pointsToPath=dt,wi.geometryToLayer=bi,wi.coordsToLatLng=Li,wi.coordsToLatLngs=Ti,wi.latLngToCoords=Mi,wi.latLngsToCoords=zi,wi.getFeature=Ci,wi.asFeature=Zi,A.mergeOptions({boxZoom:!0});var _t=n.extend({initialize:function(t){this._map=t,this._container=t._container,this._pane=t._panes.overlayPane,this._resetStateTimeout=0,t.on("unload",this._destroy,this)},addHooks:function(){S(this._container,"mousedown",this._onMouseDown,this)},removeHooks:function(){k(this._container,"mousedown",this._onMouseDown,this)},moved:function(){return this._moved},_destroy:function(){T(this._pane),delete this._pane},_resetState:function(){this._resetStateTimeout=0,this._moved=!1},_clearDeferredResetState:function(){0!==this._resetStateTimeout&&(clearTimeout(this._resetStateTimeout),this._resetStateTimeout=0)},_onMouseDown:function(t){if(!t.shiftKey||1!==t.which&&1!==t.button)return!1;this._clearDeferredResetState(),this._resetState(),re(),Le(),this._startPoint=this._map.mouseEventToContainerPoint(t),S(document,{contextmenu:Re,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseMove:function(t){this._moved||(this._moved=!0,this._box=P("div","leaflet-zoom-box",this._container),M(this._container,"leaflet-crosshair"),this._map.fire("boxzoomstart")),this._point=this._map.mouseEventToContainerPoint(t);var t=new f(this._point,this._startPoint),e=t.getSize();Z(this._box,t.min),this._box.style.width=e.x+"px",this._box.style.height=e.y+"px"},_finish:function(){this._moved&&(T(this._box),z(this._container,"leaflet-crosshair")),ae(),Te(),k(document,{contextmenu:Re,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseUp:function(t){1!==t.which&&1!==t.button||(this._finish(),this._moved&&(this._clearDeferredResetState(),this._resetStateTimeout=setTimeout(a(this._resetState,this),0),t=new s(this._map.containerPointToLatLng(this._startPoint),this._map.containerPointToLatLng(this._point)),this._map.fitBounds(t).fire("boxzoomend",{boxZoomBounds:t})))},_onKeyDown:function(t){27===t.keyCode&&(this._finish(),this._clearDeferredResetState(),this._resetState())}}),Ct=(A.addInitHook("addHandler","boxZoom",_t),A.mergeOptions({doubleClickZoom:!0}),n.extend({addHooks:function(){this._map.on("dblclick",this._onDoubleClick,this)},removeHooks:function(){this._map.off("dblclick",this._onDoubleClick,this)},_onDoubleClick:function(t){var e=this._map,i=e.getZoom(),n=e.options.zoomDelta,i=t.originalEvent.shiftKey?i-n:i+n;"center"===e.options.doubleClickZoom?e.setZoom(i):e.setZoomAround(t.containerPoint,i)}})),Zt=(A.addInitHook("addHandler","doubleClickZoom",Ct),A.mergeOptions({dragging:!0,inertia:!0,inertiaDeceleration:3400,inertiaMaxSpeed:1/0,easeLinearity:.2,worldCopyJump:!1,maxBoundsViscosity:0}),n.extend({addHooks:function(){var t;this._draggable||(t=this._map,this._draggable=new Xe(t._mapPane,t._container),this._draggable.on({dragstart:this._onDragStart,drag:this._onDrag,dragend:this._onDragEnd},this),this._draggable.on("predrag",this._onPreDragLimit,this),t.options.worldCopyJump&&(this._draggable.on("predrag",this._onPreDragWrap,this),t.on("zoomend",this._onZoomEnd,this),t.whenReady(this._onZoomEnd,this))),M(this._map._container,"leaflet-grab leaflet-touch-drag"),this._draggable.enable(),this._positions=[],this._times=[]},removeHooks:function(){z(this._map._container,"leaflet-grab"),z(this._map._container,"leaflet-touch-drag"),this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},moving:function(){return this._draggable&&this._draggable._moving},_onDragStart:function(){var t,e=this._map;e._stop(),this._map.options.maxBounds&&this._map.options.maxBoundsViscosity?(t=g(this._map.options.maxBounds),this._offsetLimit=_(this._map.latLngToContainerPoint(t.getNorthWest()).multiplyBy(-1),this._map.latLngToContainerPoint(t.getSouthEast()).multiplyBy(-1).add(this._map.getSize())),this._viscosity=Math.min(1,Math.max(0,this._map.options.maxBoundsViscosity))):this._offsetLimit=null,e.fire("movestart").fire("dragstart"),e.options.inertia&&(this._positions=[],this._times=[])},_onDrag:function(t){var e,i;this._map.options.inertia&&(e=this._lastTime=+new Date,i=this._lastPos=this._draggable._absPos||this._draggable._newPos,this._positions.push(i),this._times.push(e),this._prunePositions(e)),this._map.fire("move",t).fire("drag",t)},_prunePositions:function(t){for(;1<this._positions.length&&50<t-this._times[0];)this._positions.shift(),this._times.shift()},_onZoomEnd:function(){var t=this._map.getSize().divideBy(2),e=this._map.latLngToLayerPoint([0,0]);this._initialWorldOffset=e.subtract(t).x,this._worldWidth=this._map.getPixelWorldBounds().getSize().x},_viscousLimit:function(t,e){return t-(t-e)*this._viscosity},_onPreDragLimit:function(){var t,e;this._viscosity&&this._offsetLimit&&(t=this._draggable._newPos.subtract(this._draggable._startPos),e=this._offsetLimit,t.x<e.min.x&&(t.x=this._viscousLimit(t.x,e.min.x)),t.y<e.min.y&&(t.y=this._viscousLimit(t.y,e.min.y)),t.x>e.max.x&&(t.x=this._viscousLimit(t.x,e.max.x)),t.y>e.max.y&&(t.y=this._viscousLimit(t.y,e.max.y)),this._draggable._newPos=this._draggable._startPos.add(t))},_onPreDragWrap:function(){var t=this._worldWidth,e=Math.round(t/2),i=this._initialWorldOffset,n=this._draggable._newPos.x,o=(n-e+i)%t+e-i,n=(n+e+i)%t-e-i,t=Math.abs(o+i)<Math.abs(n+i)?o:n;this._draggable._absPos=this._draggable._newPos.clone(),this._draggable._newPos.x=t},_onDragEnd:function(t){var e,i,n,o,s=this._map,r=s.options,a=!r.inertia||t.noInertia||this._times.length<2;s.fire("dragend",t),!a&&(this._prunePositions(+new Date),t=this._lastPos.subtract(this._positions[0]),a=(this._lastTime-this._times[0])/1e3,e=r.easeLinearity,a=(t=t.multiplyBy(e/a)).distanceTo([0,0]),i=Math.min(r.inertiaMaxSpeed,a),t=t.multiplyBy(i/a),n=i/(r.inertiaDeceleration*e),(o=t.multiplyBy(-n/2).round()).x||o.y)?(o=s._limitOffset(o,s.options.maxBounds),x(function(){s.panBy(o,{duration:n,easeLinearity:e,noMoveStart:!0,animate:!0})})):s.fire("moveend")}})),St=(A.addInitHook("addHandler","dragging",Zt),A.mergeOptions({keyboard:!0,keyboardPanDelta:80}),n.extend({keyCodes:{left:[37],right:[39],down:[40],up:[38],zoomIn:[187,107,61,171],zoomOut:[189,109,54,173]},initialize:function(t){this._map=t,this._setPanDelta(t.options.keyboardPanDelta),this._setZoomDelta(t.options.zoomDelta)},addHooks:function(){var t=this._map._container;t.tabIndex<=0&&(t.tabIndex="0"),S(t,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.on({focus:this._addHooks,blur:this._removeHooks},this)},removeHooks:function(){this._removeHooks(),k(this._map._container,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.off({focus:this._addHooks,blur:this._removeHooks},this)},_onMouseDown:function(){var t,e,i;this._focused||(i=document.body,t=document.documentElement,e=i.scrollTop||t.scrollTop,i=i.scrollLeft||t.scrollLeft,this._map._container.focus(),window.scrollTo(i,e))},_onFocus:function(){this._focused=!0,this._map.fire("focus")},_onBlur:function(){this._focused=!1,this._map.fire("blur")},_setPanDelta:function(t){for(var e=this._panKeys={},i=this.keyCodes,n=0,o=i.left.length;n<o;n++)e[i.left[n]]=[-1*t,0];for(n=0,o=i.right.length;n<o;n++)e[i.right[n]]=[t,0];for(n=0,o=i.down.length;n<o;n++)e[i.down[n]]=[0,t];for(n=0,o=i.up.length;n<o;n++)e[i.up[n]]=[0,-1*t]},_setZoomDelta:function(t){for(var e=this._zoomKeys={},i=this.keyCodes,n=0,o=i.zoomIn.length;n<o;n++)e[i.zoomIn[n]]=t;for(n=0,o=i.zoomOut.length;n<o;n++)e[i.zoomOut[n]]=-t},_addHooks:function(){S(document,"keydown",this._onKeyDown,this)},_removeHooks:function(){k(document,"keydown",this._onKeyDown,this)},_onKeyDown:function(t){if(!(t.altKey||t.ctrlKey||t.metaKey)){var e,i,n=t.keyCode,o=this._map;if(n in this._panKeys)o._panAnim&&o._panAnim._inProgress||(i=this._panKeys[n],t.shiftKey&&(i=m(i).multiplyBy(3)),o.options.maxBounds&&(i=o._limitOffset(m(i),o.options.maxBounds)),o.options.worldCopyJump?(e=o.wrapLatLng(o.unproject(o.project(o.getCenter()).add(i))),o.panTo(e)):o.panBy(i));else if(n in this._zoomKeys)o.setZoom(o.getZoom()+(t.shiftKey?3:1)*this._zoomKeys[n]);else{if(27!==n||!o._popup||!o._popup.options.closeOnEscapeKey)return;o.closePopup()}Re(t)}}})),Et=(A.addInitHook("addHandler","keyboard",St),A.mergeOptions({scrollWheelZoom:!0,wheelDebounceTime:40,wheelPxPerZoomLevel:60}),n.extend({addHooks:function(){S(this._map._container,"wheel",this._onWheelScroll,this),this._delta=0},removeHooks:function(){k(this._map._container,"wheel",this._onWheelScroll,this)},_onWheelScroll:function(t){var e=He(t),i=this._map.options.wheelDebounceTime,e=(this._delta+=e,this._lastMousePos=this._map.mouseEventToContainerPoint(t),this._startTime||(this._startTime=+new Date),Math.max(i-(+new Date-this._startTime),0));clearTimeout(this._timer),this._timer=setTimeout(a(this._performZoom,this),e),Re(t)},_performZoom:function(){var t=this._map,e=t.getZoom(),i=this._map.options.zoomSnap||0,n=(t._stop(),this._delta/(4*this._map.options.wheelPxPerZoomLevel)),n=4*Math.log(2/(1+Math.exp(-Math.abs(n))))/Math.LN2,i=i?Math.ceil(n/i)*i:n,n=t._limitZoom(e+(0<this._delta?i:-i))-e;this._delta=0,this._startTime=null,n&&("center"===t.options.scrollWheelZoom?t.setZoom(e+n):t.setZoomAround(this._lastMousePos,e+n))}})),kt=(A.addInitHook("addHandler","scrollWheelZoom",Et),A.mergeOptions({tapHold:b.touchNative&&b.safari&&b.mobile,tapTolerance:15}),n.extend({addHooks:function(){S(this._map._container,"touchstart",this._onDown,this)},removeHooks:function(){k(this._map._container,"touchstart",this._onDown,this)},_onDown:function(t){var e;clearTimeout(this._holdTimeout),1===t.touches.length&&(e=t.touches[0],this._startPos=this._newPos=new p(e.clientX,e.clientY),this._holdTimeout=setTimeout(a(function(){this._cancel(),this._isTapValid()&&(S(document,"touchend",O),S(document,"touchend touchcancel",this._cancelClickPrevent),this._simulateEvent("contextmenu",e))},this),600),S(document,"touchend touchcancel contextmenu",this._cancel,this),S(document,"touchmove",this._onMove,this))},_cancelClickPrevent:function t(){k(document,"touchend",O),k(document,"touchend touchcancel",t)},_cancel:function(){clearTimeout(this._holdTimeout),k(document,"touchend touchcancel contextmenu",this._cancel,this),k(document,"touchmove",this._onMove,this)},_onMove:function(t){t=t.touches[0];this._newPos=new p(t.clientX,t.clientY)},_isTapValid:function(){return this._newPos.distanceTo(this._startPos)<=this._map.options.tapTolerance},_simulateEvent:function(t,e){t=new MouseEvent(t,{bubbles:!0,cancelable:!0,view:window,screenX:e.screenX,screenY:e.screenY,clientX:e.clientX,clientY:e.clientY});t._simulated=!0,e.target.dispatchEvent(t)}})),Ot=(A.addInitHook("addHandler","tapHold",kt),A.mergeOptions({touchZoom:b.touch,bounceAtZoomLimits:!0}),n.extend({addHooks:function(){M(this._map._container,"leaflet-touch-zoom"),S(this._map._container,"touchstart",this._onTouchStart,this)},removeHooks:function(){z(this._map._container,"leaflet-touch-zoom"),k(this._map._container,"touchstart",this._onTouchStart,this)},_onTouchStart:function(t){var e,i,n=this._map;!t.touches||2!==t.touches.length||n._animatingZoom||this._zooming||(e=n.mouseEventToContainerPoint(t.touches[0]),i=n.mouseEventToContainerPoint(t.touches[1]),this._centerPoint=n.getSize()._divideBy(2),this._startLatLng=n.containerPointToLatLng(this._centerPoint),"center"!==n.options.touchZoom&&(this._pinchStartLatLng=n.containerPointToLatLng(e.add(i)._divideBy(2))),this._startDist=e.distanceTo(i),this._startZoom=n.getZoom(),this._moved=!1,this._zooming=!0,n._stop(),S(document,"touchmove",this._onTouchMove,this),S(document,"touchend touchcancel",this._onTouchEnd,this),O(t))},_onTouchMove:function(t){if(t.touches&&2===t.touches.length&&this._zooming){var e=this._map,i=e.mouseEventToContainerPoint(t.touches[0]),n=e.mouseEventToContainerPoint(t.touches[1]),o=i.distanceTo(n)/this._startDist;if(this._zoom=e.getScaleZoom(o,this._startZoom),!e.options.bounceAtZoomLimits&&(this._zoom<e.getMinZoom()&&o<1||this._zoom>e.getMaxZoom()&&1<o)&&(this._zoom=e._limitZoom(this._zoom)),"center"===e.options.touchZoom){if(this._center=this._startLatLng,1==o)return}else{i=i._add(n)._divideBy(2)._subtract(this._centerPoint);if(1==o&&0===i.x&&0===i.y)return;this._center=e.unproject(e.project(this._pinchStartLatLng,this._zoom).subtract(i),this._zoom)}this._moved||(e._moveStart(!0,!1),this._moved=!0),r(this._animRequest);n=a(e._move,e,this._center,this._zoom,{pinch:!0,round:!1},void 0);this._animRequest=x(n,this,!0),O(t)}},_onTouchEnd:function(){this._moved&&this._zooming?(this._zooming=!1,r(this._animRequest),k(document,"touchmove",this._onTouchMove,this),k(document,"touchend touchcancel",this._onTouchEnd,this),this._map.options.zoomAnimation?this._map._animateZoom(this._center,this._map._limitZoom(this._zoom),!0,this._map.options.zoomSnap):this._map._resetView(this._center,this._map._limitZoom(this._zoom))):this._zooming=!1}})),Xi=(A.addInitHook("addHandler","touchZoom",Ot),A.BoxZoom=_t,A.DoubleClickZoom=Ct,A.Drag=Zt,A.Keyboard=St,A.ScrollWheelZoom=Et,A.TapHold=kt,A.TouchZoom=Ot,t.Bounds=f,t.Browser=b,t.CRS=ot,t.Canvas=Fi,t.Circle=vi,t.CircleMarker=gi,t.Class=et,t.Control=B,t.DivIcon=Ri,t.DivOverlay=Ai,t.DomEvent=mt,t.DomUtil=pt,t.Draggable=Xe,t.Evented=it,t.FeatureGroup=ci,t.GeoJSON=wi,t.GridLayer=Ni,t.Handler=n,t.Icon=di,t.ImageOverlay=Ei,t.LatLng=v,t.LatLngBounds=s,t.Layer=o,t.LayerGroup=ui,t.LineUtil=vt,t.Map=A,t.Marker=mi,t.Mixin=ft,t.Path=fi,t.Point=p,t.PolyUtil=gt,t.Polygon=xi,t.Polyline=yi,t.Popup=Bi,t.PosAnimation=Fe,t.Projection=wt,t.Rectangle=Yi,t.Renderer=Wi,t.SVG=Gi,t.SVGOverlay=Oi,t.TileLayer=Di,t.Tooltip=Ii,t.Transformation=at,t.Util=tt,t.VideoOverlay=ki,t.bind=a,t.bounds=_,t.canvas=Ui,t.circle=function(t,e,i){return new vi(t,e,i)},t.circleMarker=function(t,e){return new gi(t,e)},t.control=Ue,t.divIcon=function(t){return new Ri(t)},t.extend=l,t.featureGroup=function(t,e){return new ci(t,e)},t.geoJSON=Si,t.geoJson=Mt,t.gridLayer=function(t){return new Ni(t)},t.icon=function(t){return new di(t)},t.imageOverlay=function(t,e,i){return new Ei(t,e,i)},t.latLng=w,t.latLngBounds=g,t.layerGroup=function(t,e){return new ui(t,e)},t.map=function(t,e){return new A(t,e)},t.marker=function(t,e){return new mi(t,e)},t.point=m,t.polygon=function(t,e){return new xi(t,e)},t.polyline=function(t,e){return new yi(t,e)},t.popup=function(t,e){return new Bi(t,e)},t.rectangle=function(t,e){return new Yi(t,e)},t.setOptions=c,t.stamp=h,t.svg=Ki,t.svgOverlay=function(t,e,i){return new Oi(t,e,i)},t.tileLayer=ji,t.tooltip=function(t,e){return new Ii(t,e)},t.transformation=ht,t.version="1.9.4",t.videoOverlay=function(t,e,i){return new ki(t,e,i)},window.L);t.noConflict=function(){return window.L=Xi,this},window.L=t});
//# sourceMappingURL=leaflet.js.map
````

## 📄 `web/vendor/leaflet/leaflet.css`

````css
/* required styles */

.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
	position: absolute;
	left: 0;
	top: 0;
	}
.leaflet-container {
	overflow: hidden;
	}
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
	-webkit-user-select: none;
	   -moz-user-select: none;
	        user-select: none;
	  -webkit-user-drag: none;
	}
/* Prevents IE11 from highlighting tiles in blue */
.leaflet-tile::selection {
	background: transparent;
}
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */
.leaflet-safari .leaflet-tile {
	image-rendering: -webkit-optimize-contrast;
	}
/* hack that prevents hw layers "stretching" when loading new tiles */
.leaflet-safari .leaflet-tile-container {
	width: 1600px;
	height: 1600px;
	-webkit-transform-origin: 0 0;
	}
.leaflet-marker-icon,
.leaflet-marker-shadow {
	display: block;
	}
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */
.leaflet-container .leaflet-overlay-pane svg {
	max-width: none !important;
	max-height: none !important;
	}
.leaflet-container .leaflet-marker-pane img,
.leaflet-container .leaflet-shadow-pane img,
.leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer,
.leaflet-container .leaflet-tile {
	max-width: none !important;
	max-height: none !important;
	width: auto;
	padding: 0;
	}

.leaflet-container img.leaflet-tile {
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */
	mix-blend-mode: plus-lighter;
}

.leaflet-container.leaflet-touch-zoom {
	-ms-touch-action: pan-x pan-y;
	touch-action: pan-x pan-y;
	}
.leaflet-container.leaflet-touch-drag {
	-ms-touch-action: pinch-zoom;
	/* Fallback for FF which doesn't support pinch-zoom */
	touch-action: none;
	touch-action: pinch-zoom;
}
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {
	-ms-touch-action: none;
	touch-action: none;
}
.leaflet-container {
	-webkit-tap-highlight-color: transparent;
}
.leaflet-container a {
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);
}
.leaflet-tile {
	filter: inherit;
	visibility: hidden;
	}
.leaflet-tile-loaded {
	visibility: inherit;
	}
.leaflet-zoom-box {
	width: 0;
	height: 0;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	z-index: 800;
	}
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */
.leaflet-overlay-pane svg {
	-moz-user-select: none;
	}

.leaflet-pane         { z-index: 400; }

.leaflet-tile-pane    { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane  { z-index: 500; }
.leaflet-marker-pane  { z-index: 600; }
.leaflet-tooltip-pane   { z-index: 650; }
.leaflet-popup-pane   { z-index: 700; }

.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg    { z-index: 200; }

.leaflet-vml-shape {
	width: 1px;
	height: 1px;
	}
.lvml {
	behavior: url(#default#VML);
	display: inline-block;
	position: absolute;
	}


/* control positioning */

.leaflet-control {
	position: relative;
	z-index: 800;
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}
.leaflet-top,
.leaflet-bottom {
	position: absolute;
	z-index: 1000;
	pointer-events: none;
	}
.leaflet-top {
	top: 0;
	}
.leaflet-right {
	right: 0;
	}
.leaflet-bottom {
	bottom: 0;
	}
.leaflet-left {
	left: 0;
	}
.leaflet-control {
	float: left;
	clear: both;
	}
.leaflet-right .leaflet-control {
	float: right;
	}
.leaflet-top .leaflet-control {
	margin-top: 10px;
	}
.leaflet-bottom .leaflet-control {
	margin-bottom: 10px;
	}
.leaflet-left .leaflet-control {
	margin-left: 10px;
	}
.leaflet-right .leaflet-control {
	margin-right: 10px;
	}


/* zoom and fade animations */

.leaflet-fade-anim .leaflet-popup {
	opacity: 0;
	-webkit-transition: opacity 0.2s linear;
	   -moz-transition: opacity 0.2s linear;
	        transition: opacity 0.2s linear;
	}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
	opacity: 1;
	}
.leaflet-zoom-animated {
	-webkit-transform-origin: 0 0;
	    -ms-transform-origin: 0 0;
	        transform-origin: 0 0;
	}
svg.leaflet-zoom-animated {
	will-change: transform;
}

.leaflet-zoom-anim .leaflet-zoom-animated {
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);
	}
.leaflet-zoom-anim .leaflet-tile,
.leaflet-pan-anim .leaflet-tile {
	-webkit-transition: none;
	   -moz-transition: none;
	        transition: none;
	}

.leaflet-zoom-anim .leaflet-zoom-hide {
	visibility: hidden;
	}


/* cursors */

.leaflet-interactive {
	cursor: pointer;
	}
.leaflet-grab {
	cursor: -webkit-grab;
	cursor:    -moz-grab;
	cursor:         grab;
	}
.leaflet-crosshair,
.leaflet-crosshair .leaflet-interactive {
	cursor: crosshair;
	}
.leaflet-popup-pane,
.leaflet-control {
	cursor: auto;
	}
.leaflet-dragging .leaflet-grab,
.leaflet-dragging .leaflet-grab .leaflet-interactive,
.leaflet-dragging .leaflet-marker-draggable {
	cursor: move;
	cursor: -webkit-grabbing;
	cursor:    -moz-grabbing;
	cursor:         grabbing;
	}

/* marker & overlays interactivity */
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-image-layer,
.leaflet-pane > svg path,
.leaflet-tile-container {
	pointer-events: none;
	}

.leaflet-marker-icon.leaflet-interactive,
.leaflet-image-layer.leaflet-interactive,
.leaflet-pane > svg path.leaflet-interactive,
svg.leaflet-image-layer.leaflet-interactive path {
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}

/* visual tweaks */

.leaflet-container {
	background: #ddd;
	outline-offset: 1px;
	}
.leaflet-container a {
	color: #0078A8;
	}
.leaflet-zoom-box {
	border: 2px dotted #38f;
	background: rgba(255,255,255,0.5);
	}


/* general typography */
.leaflet-container {
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-size: 0.75rem;
	line-height: 1.5;
	}


/* general toolbar styles */

.leaflet-bar {
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);
	border-radius: 4px;
	}
.leaflet-bar a {
	background-color: #fff;
	border-bottom: 1px solid #ccc;
	width: 26px;
	height: 26px;
	line-height: 26px;
	display: block;
	text-align: center;
	text-decoration: none;
	color: black;
	}
.leaflet-bar a,
.leaflet-control-layers-toggle {
	background-position: 50% 50%;
	background-repeat: no-repeat;
	display: block;
	}
.leaflet-bar a:hover,
.leaflet-bar a:focus {
	background-color: #f4f4f4;
	}
.leaflet-bar a:first-child {
	border-top-left-radius: 4px;
	border-top-right-radius: 4px;
	}
.leaflet-bar a:last-child {
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
	border-bottom: none;
	}
.leaflet-bar a.leaflet-disabled {
	cursor: default;
	background-color: #f4f4f4;
	color: #bbb;
	}

.leaflet-touch .leaflet-bar a {
	width: 30px;
	height: 30px;
	line-height: 30px;
	}
.leaflet-touch .leaflet-bar a:first-child {
	border-top-left-radius: 2px;
	border-top-right-radius: 2px;
	}
.leaflet-touch .leaflet-bar a:last-child {
	border-bottom-left-radius: 2px;
	border-bottom-right-radius: 2px;
	}

/* zoom control */

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
	font: bold 18px 'Lucida Console', Monaco, monospace;
	text-indent: 1px;
	}

.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {
	font-size: 22px;
	}


/* layers control */

.leaflet-control-layers {
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);
	background: #fff;
	border-radius: 5px;
	}
.leaflet-control-layers-toggle {
	background-image: url(images/layers.png);
	width: 36px;
	height: 36px;
	}
.leaflet-retina .leaflet-control-layers-toggle {
	background-image: url(images/layers-2x.png);
	background-size: 26px 26px;
	}
.leaflet-touch .leaflet-control-layers-toggle {
	width: 44px;
	height: 44px;
	}
.leaflet-control-layers .leaflet-control-layers-list,
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {
	display: none;
	}
.leaflet-control-layers-expanded .leaflet-control-layers-list {
	display: block;
	position: relative;
	}
.leaflet-control-layers-expanded {
	padding: 6px 10px 6px 6px;
	color: #333;
	background: #fff;
	}
.leaflet-control-layers-scrollbar {
	overflow-y: scroll;
	overflow-x: hidden;
	padding-right: 5px;
	}
.leaflet-control-layers-selector {
	margin-top: 2px;
	position: relative;
	top: 1px;
	}
.leaflet-control-layers label {
	display: block;
	font-size: 13px;
	font-size: 1.08333em;
	}
.leaflet-control-layers-separator {
	height: 0;
	border-top: 1px solid #ddd;
	margin: 5px -10px 5px -6px;
	}

/* Default icon URLs */
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */
	background-image: url(images/marker-icon.png);
	}


/* attribution and scale controls */

.leaflet-container .leaflet-control-attribution {
	background: #fff;
	background: rgba(255, 255, 255, 0.8);
	margin: 0;
	}
.leaflet-control-attribution,
.leaflet-control-scale-line {
	padding: 0 5px;
	color: #333;
	line-height: 1.4;
	}
.leaflet-control-attribution a {
	text-decoration: none;
	}
.leaflet-control-attribution a:hover,
.leaflet-control-attribution a:focus {
	text-decoration: underline;
	}
.leaflet-attribution-flag {
	display: inline !important;
	vertical-align: baseline !important;
	width: 1em;
	height: 0.6669em;
	}
.leaflet-left .leaflet-control-scale {
	margin-left: 5px;
	}
.leaflet-bottom .leaflet-control-scale {
	margin-bottom: 5px;
	}
.leaflet-control-scale-line {
	border: 2px solid #777;
	border-top: none;
	line-height: 1.1;
	padding: 2px 5px 1px;
	white-space: nowrap;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	background: rgba(255, 255, 255, 0.8);
	text-shadow: 1px 1px #fff;
	}
.leaflet-control-scale-line:not(:first-child) {
	border-top: 2px solid #777;
	border-bottom: none;
	margin-top: -2px;
	}
.leaflet-control-scale-line:not(:first-child):not(:last-child) {
	border-bottom: 2px solid #777;
	}

.leaflet-touch .leaflet-control-attribution,
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	box-shadow: none;
	}
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	border: 2px solid rgba(0,0,0,0.2);
	background-clip: padding-box;
	}


/* popup */

.leaflet-popup {
	position: absolute;
	text-align: center;
	margin-bottom: 20px;
	}
.leaflet-popup-content-wrapper {
	padding: 1px;
	text-align: left;
	border-radius: 12px;
	}
.leaflet-popup-content {
	margin: 13px 24px 13px 20px;
	line-height: 1.3;
	font-size: 13px;
	font-size: 1.08333em;
	min-height: 1px;
	}
.leaflet-popup-content p {
	margin: 17px 0;
	margin: 1.3em 0;
	}
.leaflet-popup-tip-container {
	width: 40px;
	height: 20px;
	position: absolute;
	left: 50%;
	margin-top: -1px;
	margin-left: -20px;
	overflow: hidden;
	pointer-events: none;
	}
.leaflet-popup-tip {
	width: 17px;
	height: 17px;
	padding: 1px;

	margin: -10px auto 0;
	pointer-events: auto;

	-webkit-transform: rotate(45deg);
	   -moz-transform: rotate(45deg);
	    -ms-transform: rotate(45deg);
	        transform: rotate(45deg);
	}
.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
	background: white;
	color: #333;
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);
	}
.leaflet-container a.leaflet-popup-close-button {
	position: absolute;
	top: 0;
	right: 0;
	border: none;
	text-align: center;
	width: 24px;
	height: 24px;
	font: 16px/24px Tahoma, Verdana, sans-serif;
	color: #757575;
	text-decoration: none;
	background: transparent;
	}
.leaflet-container a.leaflet-popup-close-button:hover,
.leaflet-container a.leaflet-popup-close-button:focus {
	color: #585858;
	}
.leaflet-popup-scrolled {
	overflow: auto;
	}

.leaflet-oldie .leaflet-popup-content-wrapper {
	-ms-zoom: 1;
	}
.leaflet-oldie .leaflet-popup-tip {
	width: 24px;
	margin: 0 auto;

	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);
	}

.leaflet-oldie .leaflet-control-zoom,
.leaflet-oldie .leaflet-control-layers,
.leaflet-oldie .leaflet-popup-content-wrapper,
.leaflet-oldie .leaflet-popup-tip {
	border: 1px solid #999;
	}


/* div icon */

.leaflet-div-icon {
	background: #fff;
	border: 1px solid #666;
	}


/* Tooltip */
/* Base styles for the element that has a tooltip */
.leaflet-tooltip {
	position: absolute;
	padding: 6px;
	background-color: #fff;
	border: 1px solid #fff;
	border-radius: 3px;
	color: #222;
	white-space: nowrap;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	pointer-events: none;
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);
	}
.leaflet-tooltip.leaflet-interactive {
	cursor: pointer;
	pointer-events: auto;
	}
.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	position: absolute;
	pointer-events: none;
	border: 6px solid transparent;
	background: transparent;
	content: "";
	}

/* Directions */

.leaflet-tooltip-bottom {
	margin-top: 6px;
}
.leaflet-tooltip-top {
	margin-top: -6px;
}
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-top:before {
	left: 50%;
	margin-left: -6px;
	}
.leaflet-tooltip-top:before {
	bottom: 0;
	margin-bottom: -12px;
	border-top-color: #fff;
	}
.leaflet-tooltip-bottom:before {
	top: 0;
	margin-top: -12px;
	margin-left: -6px;
	border-bottom-color: #fff;
	}
.leaflet-tooltip-left {
	margin-left: -6px;
}
.leaflet-tooltip-right {
	margin-left: 6px;
}
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	top: 50%;
	margin-top: -6px;
	}
.leaflet-tooltip-left:before {
	right: 0;
	margin-right: -12px;
	border-left-color: #fff;
	}
.leaflet-tooltip-right:before {
	left: 0;
	margin-left: -12px;
	border-right-color: #fff;
	}

/* Printing */

@media print {
	/* Prevent printers from removing background-images of controls. */
	.leaflet-control {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		}
	}
````

---

# BINARY FILES (base64)

## 📄 `web/icons/icon-192.png` (app icon — decode this one)

Decode the base64 below to `web/icons/icon-192.png`. The other icon files
(`icon-512.png`, `apple-touch-icon.png`, `icon-maskable-512.png`) can be simple
resized copies of this file (512×512, 180×180, 512×512) — or download the originals
from the project ZIP. Example decode command:

```bash
python3 -c "import base64;open('web/icons/icon-192.png','wb').write(base64.b64decode('PASTE_B64_HERE'))"
```

````
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
````

Leaflet marker PNGs under `web/vendor/leaflet/images/` are OPTIONAL — the app draws its
markers as inline divIcons. If you want them, any small pin PNG works, or fetch Leaflet
1.9.x images from unpkg. WITHOUT them the app still runs and looks identical except one
default map marker in the registration map.

---

# END OF SOURCE CODE

Total: 43 code files + 2 Leaflet vendor files + 1 base64 image.
NOTE: binary assets (app icons, Play Store feature graphic) live in the project ZIP
under web/icons/ and mobile/store-assets/ — copy them from there (or regenerate).
If anything is unclear, the running app behaviour is the source of truth:
search → provider profile → call/WhatsApp → OTP login → favourites → reviews →
provider registration → provider dashboard → admin panel (verify/bulk CSV/analytics).
