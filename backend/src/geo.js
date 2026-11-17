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
