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
