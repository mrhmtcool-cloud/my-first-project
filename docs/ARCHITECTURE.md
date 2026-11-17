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
