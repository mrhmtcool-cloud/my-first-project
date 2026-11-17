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
