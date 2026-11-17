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
