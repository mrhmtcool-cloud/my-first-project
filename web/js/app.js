/**
 * app.js — Labors Near Me SPA (vanilla JS, no build step — tiny payload for 2G/3G).
 * Hash router + views: Home, Search (list/map), Provider Detail, Auth, Favorites,
 * Account, Provider Registration (3 steps), Provider Dashboard, Admin Panel.
 */
'use strict';

/* ═══════════════ STATE ═══════════════ */
const S = {
  cats: [], cities: [], states: [],
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
    const [cats, cities, states] = await Promise.all([
      API.get('/categories'), API.get('/cities'), API.get('/states').catch(() => []),
    ]);
    S.cats = cats; S.cities = cities; S.states = states;
  } catch (e) { console.error('meta load failed', e); }
  if (API.user) refreshFavorites();
  window.addEventListener('hashchange', route);
  route();
  // (service worker hataya gaya — purana cache problem karta tha; sw.js ab sirf cleaner hai)
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
    case 'about': return viewAbout(view);
    case 'contact': return viewContact(view);
    case 'feedback': return viewFeedback(view);
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
      <span class="cat-ico" style="background:${CAT_COLORS[c.id] || '#F59E0B'}">${catIconHtml(c.icon, c.iconImage)}</span>
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
      html: `<div class="pin-dot" style="background:${color}">${catIconHtml(p.categoryIcon, p.categoryIconImage)}</div>`,
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
          <div class="card-sub">${p.customService ? esc(p.customService) + ' · ' : ''}${esc(locName(p.categoryNameEn, p.categoryNameHi))}${p.subcategoryNameEn ? ' · ' + esc(locName(p.subcategoryNameEn, p.subcategoryNameHi)) : ''}</div>
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
    ${p.gallery && p.gallery.length ? `<div class="panel"><h4>📸 ${t('gallery_of')}</h4>
      <div class="gallery-grid">${p.gallery.map((g) => `<div class="gallery-item"><img src="${g}" alt="" loading="lazy"></div>`).join('')}</div></div>` : ''}
    ${p.videoLinks && p.videoLinks.length ? `<div class="panel"><h4>🎥 ${t('videos_l')}</h4>
      <div class="gallery-grid">${p.videoLinks.map((v) => `
        <a class="gallery-item video-thumb" href="https://www.youtube.com/watch?v=${esc(v.videoId)}" target="_blank" rel="noopener">
          <img src="${ytThumb(v.videoId)}" alt="" loading="lazy"><span class="play-badge">▶</span></a>`).join('')}</div></div>` : ''}
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
      icon: L.divIcon({ className: '', html: `<div class="pin-dot" style="background:${color}">${catIconHtml(p.categoryIcon, p.categoryIconImage)}</div>`, iconSize: [34, 34], iconAnchor: [17, 30] }),
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
          <button class="btn btn-ghost btn-block" id="google-go">${LnmFirebase.configured ? t('google_real') : t('google_login')}</button>
        </div>
      </div>
    </div>`;
  let step = 1;
  let fbConfirmation = null; // Firebase phone auth confirmation (real OTP mode)
  document.getElementById('login-go').onclick = async () => {
    const phone = document.getElementById('login-phone').value.replace(/\D/g, '').slice(-10);
    if (step === 1) {
      try {
        if (LnmFirebase.configured) {
          // 🔥 REAL OTP — Firebase Phone Auth (SMS asli me jaata hai)
          fbConfirmation = await LnmFirebase.phoneStart('+91' + phone, document.getElementById('login-go'));
          toast(t('otp_sent'));
        } else {
          await API.post('/auth/request-otp', { phone });
          toast(t('otp_sent'));
        }
        step = 2;
        document.getElementById('login-step2').style.display = 'block';
        document.getElementById('login-go').textContent = t('verify');
        document.getElementById('login-otp').value = LnmFirebase.configured ? '' : '123456';
      } catch (e) { toast(e.data?.hint || t('error_gen')); }
    } else {
      try {
        let r;
        if (LnmFirebase.configured && fbConfirmation) {
          r = await LnmFirebase.phoneVerify(fbConfirmation, document.getElementById('login-otp').value);
        } else {
          r = await API.post('/auth/verify-otp', {
            phone, code: document.getElementById('login-otp').value,
            name: document.getElementById('login-name').value, cityId: S.cityId,
          });
        }
        API.token = r.token; API.user = r.user;
        toast('✓ ' + r.user.name);
        await refreshFavorites();
        history.back();
      } catch (e) { toast(t('error_gen')); }
    }
  };
  document.getElementById('google-go').onclick = async () => {
    try {
      let r;
      if (LnmFirebase.configured) {
        r = await LnmFirebase.google(); // 🔥 REAL Google login
      } else {
        toast(t('firebase_off'));
        r = await API.post('/auth/google', { name: 'Google User', email: 'demo.user@gmail.com' });
      }
      API.token = r.token; API.user = r.user;
      toast('✓ ' + r.user.name);
      await refreshFavorites();
      history.back();
    } catch (e) { toast(e.data?.hint || t('error_gen')); }
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
      <div style="width:72px;height:72px;margin:6px auto;border-radius:50%;background:var(--amber-soft);display:grid;place-items:center;overflow:hidden">
        ${u && u.photo ? `<img src="${u.photo}" style="width:72px;height:72px;object-fit:cover" alt="">` : icon('user', 'ic ic-lg')}
      </div>
      ${u ? `<h3 style="margin:6px 0 2px">${esc(u.name)}</h3>
          <div class="muted">+91 ${esc(u.phone || '—')} · ${u.role}</div>
          ${u.bio ? `<div class="tiny" style="margin-top:4px">${esc(u.bio)}</div>` : ''}
          ${(u.state || u.district) ? `<div class="tiny muted">📍 ${esc([u.district, u.state].filter(Boolean).join(', '))}</div>` : ''}`
          : `<h3 style="margin:6px 0">${t('my_account')}</h3><a class="btn btn-primary" href="#/login">${t('login')}</a>`}
    </div>
    ${u ? `
    <div class="panel">
      <div class="section-title" style="margin:0 0 10px">👤 ${t('my_profile')}</div>
      <div class="form">
        <div class="field"><label class="label">${t('name_l')}</label>
          <input class="input" id="p-name" value="${esc(u.name || '')}"></div>
        <div class="field"><label class="label">${t('bio_l')}</label>
          <input class="input" id="p-bio" maxlength="200" value="${esc(u.bio || '')}"></div>
        <div class="field"><label class="label">${t('about_me')}</label>
          <textarea class="textarea" id="p-about" maxlength="500">${esc(u.about || '')}</textarea></div>
        <div class="field"><label class="label">${t('address_opt')}</label>
          <input class="input" id="p-addr" value="${esc(u.address || '')}"></div>
        <div class="row-2">
          <div class="field"><label class="label">${t('state_l')}</label>
            <select class="select" id="p-state"><option value="">${t('select_state')}</option>
              ${(S.states || []).map((s) => `<option value="${esc(s.state)}" ${u.state === s.state ? 'selected' : ''}>${esc(s.state)}</option>`).join('')}
            </select></div>
          <div class="field"><label class="label">${t('district_l')}</label>
            <select class="select" id="p-district"><option value="">${t('select_district')}</option>
              ${((((S.states || []).find((s) => s.state === u.state) || {}).districts) || []).map((x) => `<option value="${esc(x)}" ${u.district === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
            </select></div>
        </div>
        <div class="field"><label class="label">${t('photo_l')}</label>
          <label class="photo-drop" for="p-photo">${icon('upload', 'ic ic-lg')}<b>${t('add_photo')}</b></label>
          <input type="file" id="p-photo" accept="image/*" hidden></div>
        <button class="btn btn-primary btn-block" id="p-save">${t('save_changes')}</button>
      </div>
    </div>` : ''}
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
    <div class="panel">
      <a class="cta-card" href="#/about" style="margin:0 0 10px">
        <span class="cat-ico" style="background:var(--amber);width:44px;height:44px">ℹ️</span>
        <div><b>${t('about_us')}</b></div>${icon('chevron')}</a>
      <a class="cta-card" href="#/contact">
        <span class="cat-ico" style="background:var(--ink);width:44px;height:44px">📞</span>
        <div><b>${t('contact_us')}</b></div>${icon('chevron')}</a>
      <a class="cta-card" href="#/feedback" style="margin-top:10px">
        <span class="cat-ico" style="background:#059669;width:44px;height:44px">💬</span>
        <div><b>${t('feedback')}</b></div>${icon('chevron')}</a>
    </div>
    <button class="btn btn-ghost btn-block" id="acc-share">${icon('share')} ${t('share_app2')}</button>
    ${u ? `<button class="btn btn-danger btn-block" id="logout">${t('logout')}</button>` : ''}
    <p class="tiny" style="text-align:center;margin-top:18px">Labors Near Me · Made for India 🇮🇳<br>Demo build — admin login: phone 9000000001, OTP 123456</p>
  `;
  document.getElementById('acc-city').onclick = openCityModal;
  document.getElementById('acc-share').onclick = () => shareAppOrProvider(null);
  const lo = document.getElementById('logout');
  if (lo) lo.onclick = async () => {
    try { await API.post('/auth/logout'); } catch (e) {}
    API.token = ''; API.user = null; S.favorites = new Set();
    toast('✓'); route(true);
  };
  // 👤 Profile edit (name, bio, about, address, state, district, photo)
  if (u) {
    const pState = document.getElementById('p-state');
    pState.onchange = () => {
      const st = (S.states || []).find((s) => s.state === pState.value);
      document.getElementById('p-district').innerHTML = '<option value="">' + t('select_district') + '</option>'
        + ((st && st.districts) || []).map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
    };
    let newPhoto;
    document.getElementById('p-photo').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      newPhoto = await imgToDataUrl(file, 480, 0.8);
      toast('📷 ✓');
    };
    document.getElementById('p-save').onclick = async () => {
      try {
        const body = {
          name: document.getElementById('p-name').value,
          bio: document.getElementById('p-bio').value,
          about: document.getElementById('p-about').value,
          address: document.getElementById('p-addr').value,
          state: document.getElementById('p-state').value,
          district: document.getElementById('p-district').value,
        };
        if (newPhoto) body.photo = newPhoto;
        const r = await API.put('/me/profile', body);
        API.user = r.user;
        toast(t('profile_saved'));
        route(true);
      } catch (e) { toast(e.data?.hint || t('error_gen')); }
    };
  }
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
  // PAN India: state → district dropdowns
  const stateOpts = (S.states || []).map((s) => `<option value="${esc(s.state)}" ${d.state === s.state ? 'selected' : ''}>${esc(s.state)}</option>`).join('');
  const curState = (S.states || []).find((s) => s.state === d.state);
  const districtOpts = ((curState && curState.districts) || []).map((x) => `<option value="${esc(x)}" ${d.district === x ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const isOthers = d.categoryId === 'others';

  let formHtml = '';
  if (step === 1) {
    formHtml = `
      <div class="field"><label class="label">${t('name_l')} *</label>
        <input class="input" id="r-name" value="${esc(d.name || '')}" placeholder="${t('name_l')}"></div>
      <div class="field"><label class="label">${t('business_name')}</label>
        <input class="input" id="r-biz" value="${esc(d.businessName || '')}"></div>
      <div class="field"><label class="label">${t('category')} *</label>
        <select class="select" id="r-cat">${catOpts}</select></div>
      ${isOthers ? `<div class="field"><label class="label">${t('custom_service')} *</label>
        <input class="input" id="r-custom" value="${esc(d.customService || '')}" placeholder="${t('custom_service_ph')}">
        <div class="hint">${t('custom_service_hint')}</div></div>` : `<div class="field"><label class="label">${t('subcategory')}</label>
        <select class="select" id="r-sub">${subOpts}</select></div>`}
      <div class="row-2">
        <div class="field"><label class="label">${t('phone')} *</label>
          <input class="input" id="r-phone" type="tel" inputmode="numeric" maxlength="10" value="${esc(d.phone || '')}"></div>
        <div class="field"><label class="label">${t('whatsapp_l')}</label>
          <input class="input" id="r-wa" type="tel" inputmode="numeric" maxlength="10" value="${esc(d.whatsapp || '')}"></div>
      </div>`;
  } else if (step === 2) {
    formHtml = `
      <div class="row-2">
        <div class="field"><label class="label">${t('state_l')} *</label>
          <select class="select" id="r-state"><option value="">${t('select_state')}</option>${stateOpts}</select></div>
        <div class="field"><label class="label">${t('district_l')}</label>
          <select class="select" id="r-district"><option value="">${t('select_district')}</option>${districtOpts}</select></div>
      </div>
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
      <div class="field"><label class="label">📸 ${t('work_photos')}</label>
        <label class="photo-drop" for="r-gallery">${icon('upload', 'ic ic-lg')}
          <b>${t('add_photo')}</b><span class="hint">${t('photos_hint')}</span></label>
        <input type="file" id="r-gallery" accept="image/*" multiple hidden>
        <div id="gallery-prev" class="gallery-grid"></div>
      </div>
      <div class="field"><label class="label">🎥 ${t('videos_l')}</label>
        <div style="display:flex;gap:8px">
          <input class="input" id="r-video" placeholder="https://youtube.com/watch?v=…">
          <button class="btn btn-ghost" id="r-video-add" type="button">${t('add_video')}</button>
        </div>
        <div class="hint">${t('video_hint')}</div>
        <div id="video-list"></div>
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
    if (step === 1) Object.assign(d, { name: g('r-name'), businessName: g('r-biz'), categoryId: g('r-cat'), subcategory: g('r-sub'), customService: g('r-custom'), phone: g('r-phone'), whatsapp: g('r-wa') });
    if (step === 2) Object.assign(d, { state: g('r-state'), district: g('r-district'), cityId: g('r-city'), address: g('r-addr'), area: g('r-area'), pincode: g('r-pin') });
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
    // 🗺️ PAN India: state change → district list refresh
    document.getElementById('r-state').onchange = (e) => {
      d.state = e.target.value; delete d.district; capture(); viewRegister(view);
    };
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
    // 📸 work gallery (multi-photo, resized)
    d.gallery = d.gallery || [];
    d.videoLinks = d.videoLinks || [];
    const renderGallery = () => {
      document.getElementById('gallery-prev').innerHTML = d.gallery.map((g, i) =>
        `<div class="gallery-item"><img src="${g}" alt=""><button type="button" class="gallery-x" data-i="${i}">✕</button></div>`).join('');
      document.querySelectorAll('.gallery-x').forEach((b) => b.onclick = () => { d.gallery.splice(Number(b.dataset.i), 1); renderGallery(); });
    };
    renderGallery();
    document.getElementById('r-gallery').onchange = async (e) => {
      for (const file of [...e.target.files]) {
        if (d.gallery.length >= 6) { toast('⚠️ 6 ' + t('photos_hint')); break; }
        try { d.gallery.push(await imgToDataUrl(file, 1600, 0.72)); } catch (err) {}
      }
      e.target.value = '';
      renderGallery();
    };
    // 🎥 YouTube links
    const renderVideos = () => {
      document.getElementById('video-list').innerHTML = d.videoLinks.map((v, i) =>
        `<div class="kv"><span class="k">▶</span><span style="flex:1;font-size:.85rem;overflow:hidden;text-overflow:ellipsis">${esc(v.url)}</span>
         <button type="button" class="btn btn-ghost btn-sm" data-vi="${i}">✕</button></div>`).join('');
      document.querySelectorAll('[data-vi]').forEach((b) => b.onclick = () => { d.videoLinks.splice(Number(b.dataset.vi), 1); renderVideos(); });
    };
    renderVideos();
    document.getElementById('r-video-add').onclick = () => {
      const url = document.getElementById('r-video').value.trim();
      const vid = ytVideoId(url);
      if (!vid) return toast('⚠️ ' + t('video_hint'));
      if (d.videoLinks.length >= 5) return toast('⚠️ 5');
      d.videoLinks.push({ url, videoId: vid });
      document.getElementById('r-video').value = '';
      renderVideos();
    };
  }

  const back = document.getElementById('r-back');
  if (back) back.onclick = () => { capture(); S.regStep--; viewRegister(view); };

  document.getElementById('r-next').onclick = () => {
    capture();
    if (step === 1 && (!d.name || !d.phone || d.phone.length < 10)) return toast('⚠️ ' + t('phone') + ' / ' + t('name_l'));
    if (step === 1 && d.categoryId === 'others' && !(d.customService || '').trim()) return toast('⚠️ ' + t('custom_service'));
    if (step === 2 && !d.state) return toast('⚠️ ' + t('state_l'));
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
    toast(e.data?.hint || t('error_gen'));
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
        ${p.categoryId === 'others' ? `<div class="field" style="margin-top:10px"><label class="label">${t('custom_service')}</label>
          <input class="input" id="e-custom" value="${esc(p.customService || '')}" placeholder="${t('custom_service_ph')}"></div>` : ''}
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
        <div class="field" style="margin-top:10px"><label class="label">📸 ${t('work_photos')}</label>
          <div id="e-gallery" class="gallery-grid"></div>
          <label class="photo-drop" for="e-gallery-file">${icon('upload')}<b>${t('add_photo')}</b><span class="hint">${t('photos_hint')}</span></label>
          <input type="file" id="e-gallery-file" accept="image/*" multiple hidden>
        </div>
        <div class="field" style="margin-top:10px"><label class="label">🎥 ${t('videos_l')}</label>
          <div style="display:flex;gap:8px">
            <input class="input" id="e-video" placeholder="https://youtube.com/watch?v=…">
            <button class="btn btn-ghost" id="e-video-add" type="button">${t('add_video')}</button>
          </div>
          <div class="hint">${t('video_hint')}</div>
          <div id="e-video-list"></div>
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

  // 📸 Gallery management (turant upload/delete — save ki zaroorat nahi)
  let gallery = (p.gallery || []).slice();
  const renderGallery = () => {
    document.getElementById('e-gallery').innerHTML = gallery.map((g, i) =>
      `<div class="gallery-item"><img src="${g}" alt=""><button type="button" class="gallery-x" data-gi="${i}">✕</button></div>`).join('') || '<div class="hint">—</div>';
    document.querySelectorAll('[data-gi]').forEach((b) => b.onclick = async () => {
      if (!confirm(t('delete'))) return;
      const idx = Number(b.dataset.gi);
      try {
        await API.del(`/me/providers/${id}/gallery/${idx}`);
        gallery.splice(idx, 1); renderGallery(); toast('🗑');
      } catch (e) { toast(t('error_gen')); }
    });
  };
  renderGallery();
  document.getElementById('e-gallery-file').onchange = async (e) => {
    for (const file of [...e.target.files]) {
      if (gallery.length >= 6) { toast('⚠️ 6'); break; }
      try {
        const url = await imgToDataUrl(file, 1600, 0.72);
        await API.post(`/me/providers/${id}/gallery`, { photo: url });
        gallery.push(url);
      } catch (err) { toast(err.data?.hint || t('error_gen')); }
    }
    e.target.value = '';
    renderGallery();
  };

  // 🎥 Video links (save ke time PUT honge)
  let videos = (p.videoLinks || []).slice();
  const renderVideos = () => {
    document.getElementById('e-video-list').innerHTML = videos.map((v, i) =>
      `<div class="kv"><span class="k">▶</span><span style="flex:1;font-size:.85rem;overflow:hidden;text-overflow:ellipsis">${esc(v.url)}</span>
       <button type="button" class="btn btn-ghost btn-sm" data-evi="${i}">✕</button></div>`).join('');
    document.querySelectorAll('[data-evi]').forEach((b) => b.onclick = () => { videos.splice(Number(b.dataset.evi), 1); renderVideos(); });
  };
  renderVideos();
  document.getElementById('e-video-add').onclick = () => {
    const url = document.getElementById('e-video').value.trim();
    const vid = ytVideoId(url);
    if (!vid) return toast('⚠️ ' + t('video_hint'));
    if (videos.length >= 5) return toast('⚠️ 5');
    videos.push({ url, videoId: vid });
    document.getElementById('e-video').value = '';
    renderVideos();
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
      videoLinks: videos,
    };
    const customEl = document.getElementById('e-custom');
    if (customEl) body.customService = customEl.value;
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
  const tabs = ['overview', 'providers', 'categories', 'reports', 'users', 'feedback'];
  const tabLabel = { overview: 'a_overview', providers: 'a_providers', categories: 'a_categories', reports: 'a_reports', users: 'users_tab', feedback: 'feedback' };
  view.innerHTML = `
    <h2 style="margin:4px 0 12px">${t('admin_title')} 🛡️</h2>
    <div class="admin-tabs">
      ${tabs.map((x) => `<button class="chip ${S.adminTab === x ? 'active' : ''}" onclick="location.hash='#/admin/${x}'">${t(tabLabel[x])}</button>`).join('')}
    </div>
    <div id="admin-body">${skeletons(2)}</div>`;

  const body = document.getElementById('admin-body');
  try {
    if (S.adminTab === 'overview') await adminOverview(body);
    else if (S.adminTab === 'providers') await adminProviders(body);
    else if (S.adminTab === 'categories') await adminCategories(body);
    else if (S.adminTab === 'users') await adminUsers(body);
    else if (S.adminTab === 'feedback') await adminFeedback(body);
    else await adminReports(body);
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><p>${t('error_gen')}</p></div>`;
  }
  window.scrollTo(0, 0);
}

/* ─── Admin: FEEDBACK inbox (app improvement) 💬 ─── */
async function adminFeedback(body) {
  const rows = await API.get('/admin/feedback');
  body.innerHTML = `
    <div class="hint" style="margin-bottom:10px">💬 Users/providers ka feedback — yahan se naye ideas milte hain!</div>
    ${rows.length ? rows.map((f) => `
      <div class="admin-row">
        <div class="grow">
          <b>${esc(f.userName || f.name || 'Anonymous')}</b>
          <span class="badge badge-open">${f.type === 'provider' ? t('fb_provider') : f.type === 'user' ? t('fb_user') : t('fb_other')}</span>
          <span class="stars">★${f.rating || 5}</span>
          ${f.status === 'new' ? '<span class="badge badge-pending">NEW</span>' : '<span class="badge badge-verified">✓</span>'}<br>
          <span class="tiny">${esc(f.contact || '')} · ${timeAgo(f.createdAt)}</span>
          <div class="muted" style="margin-top:4px">${esc(f.message)}</div>
        </div>
        ${f.status === 'new' ? `<button class="btn btn-primary btn-sm" data-fbread="${f.id}">${t('resolve')}</button>` : ''}
      </div>`).join('') : `<div class="empty-state">${icon('user')}<p>— ${t('no_reports')} —</p></div>`}`;
  body.querySelectorAll('[data-fbread]').forEach((b) => b.onclick = async () => {
    await API.post(`/admin/feedback/${b.dataset.fbread}/resolve`);
    viewAdmin(document.getElementById('view'), 'feedback');
  });
}

/* ─── Admin: USER MODERATION (block / suspend / delete) 🛡️ ─── */
async function adminUsers(body) {
  const users = await API.get('/admin/users');
  const statusBadge = (s) => s === 'active' ? `<span class="badge badge-verified">${t('status_active')}</span>`
    : s === 'suspended' ? `<span class="badge badge-pending">⏸ ${t('status_suspended')}</span>`
    : s === 'blocked' ? `<span class="badge badge-rejected">🚫 ${t('status_blocked')}</span>`
    : `<span class="badge badge-rejected">🗑 ${t('status_deleted')}</span>`;
  body.innerHTML = `
    <div class="hint" style="margin-bottom:10px">🛡️ Abuse / harassment / galat content par: Suspend (temporary), Block, ya Delete karein.</div>
    ${users.map((u) => `
      <div class="admin-row">
        <div class="grow">
          <b>${esc(u.name)}</b> ${statusBadge(u.status)} ${u.role === 'admin' ? '<span class="badge badge-verified">ADMIN</span>' : ''}<br>
          <span class="tiny">+91 ${esc(u.phone || '—')}${u.googleEmail ? ' · ' + esc(u.googleEmail) : ''} · ${u.providerCount} listings · joined ${timeAgo(u.createdAt)}</span>
        </div>
        ${u.role === 'admin' ? '' : `
          ${u.status === 'active' ? `
            <button class="btn btn-ghost btn-sm" data-suspend="${u.id}">${t('suspend')}</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--red)" data-block="${u.id}">${t('block')}</button>`
          : `<button class="btn btn-primary btn-sm" data-activate="${u.id}">${t('activate')}</button>`}
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" data-deluser="${u.id}">${t('delete_user')}</button>`}
      </div>`).join('')}`;
  body.querySelectorAll('[data-suspend]').forEach((b) => b.onclick = async () => {
    if (!confirm(t('confirm_suspend'))) return;
    await API.post(`/admin/users/${b.dataset.suspend}/status`, { status: 'suspended' });
    toast(t('user_moderated')); viewAdmin(document.getElementById('view'), 'users');
  });
  body.querySelectorAll('[data-block]').forEach((b) => b.onclick = async () => {
    if (!confirm(t('confirm_block'))) return;
    await API.post(`/admin/users/${b.dataset.block}/status`, { status: 'blocked' });
    toast(t('user_moderated')); viewAdmin(document.getElementById('view'), 'users');
  });
  body.querySelectorAll('[data-activate]').forEach((b) => b.onclick = async () => {
    await API.post(`/admin/users/${b.dataset.activate}/status`, { status: 'active' });
    toast(t('user_moderated')); viewAdmin(document.getElementById('view'), 'users');
  });
  body.querySelectorAll('[data-deluser]').forEach((b) => b.onclick = async () => {
    if (!confirm(t('confirm_delete_user'))) return;
    await API.del(`/admin/users/${b.dataset.deluser}`);
    toast(t('user_moderated')); viewAdmin(document.getElementById('view'), 'users');
  });
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
        <span class="cat-ico" style="background:${CAT_COLORS[c.id] || '#F59E0B'};width:38px;height:38px">${catIconHtml(c.icon, c.iconImage)}</span>
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

/* ───────────── ABOUT US + CONTACT US (app developers ke liye) ───────────── */
function viewAbout(view) {
  view.innerHTML = `
    <div class="panel">
      <h2 style="margin:0 0 8px">ℹ️ ${t('about_us')}</h2>
      <p><b>Labors Near Me</b> — Bharat ke har sheher me kaam karne wale bharosemand logon ko dhoondhne ka aasaan tareeka. 🇮🇳</p>
      <p class="muted">Electrician, plumber, tailor, doctor, driver — jo chahiye, apne aas-paas GPS se ya city/state chun kar. Seedha call, WhatsApp, directions. Koi commission nahi, koi beech ka aadmi nahi.</p>
      <ul style="padding-left:18px;line-height:2">
        <li>🎯 Hyperlocal search — distance ke hisaab se</li>
        <li>✅ Verified providers + asli reviews</li>
        <li>📱 Low bandwidth — 2G/3G par bhi tez</li>
        <li>🗣️ Hindi + English</li>
        <li>🆓 Providers ke liye listing bilkul FREE</li>
      </ul>
      <p class="tiny muted">Version 2.0 · Made in India with ❤️</p>
    </div>
    <a class="btn btn-primary btn-block" href="#/contact">${t('contact_us')}</a>`;
  window.scrollTo(0, 0);
}

function viewFeedback(view) {
  view.innerHTML = `
    <div class="panel">
      <h2 style="margin:0 0 8px">${t('feedback_title')}</h2>
      <p class="muted">${t('feedback_sub')}</p>
      <div class="form">
        <div class="row-2">
          <div class="field"><label class="label">${t('name_l')}</label>
            <input class="input" id="fb-name" value="${esc((API.user || {}).name || '')}"></div>
          <div class="field"><label class="label">${t('phone')} / Email</label>
            <input class="input" id="fb-contact" value="${esc((API.user || {}).phone || '')}"></div>
        </div>
        <div class="field"><label class="label">${t('fb_type')}</label>
          <select class="select" id="fb-type">
            <option value="user">${t('fb_user')}</option>
            <option value="provider">${t('fb_provider')}</option>
            <option value="other">${t('fb_other')}</option>
          </select></div>
        <div class="field"><label class="label">⭐ ${t('fb_rating')}</label>
          ${starInput('fb-rating')}</div>
        <div class="field"><label class="label">${t('fb_msg')} *</label>
          <textarea class="textarea" id="fb-msg" rows="5"></textarea></div>
        <button class="btn btn-primary btn-block" id="fb-send">${t('submit')}</button>
      </div>
    </div>
    <button class="btn btn-ghost btn-block" id="fb-share">${icon('share')} ${t('share_app2')}</button>`;
  bindStarInput(view);
  document.getElementById('fb-share').onclick = () => shareAppOrProvider(null);
  document.getElementById('fb-send').onclick = async () => {
    const message = document.getElementById('fb-msg').value.trim();
    if (message.length < 5) return toast('⚠️ ' + t('fb_msg'));
    const rating = Number(view.querySelector('[data-star-input]')?.dataset.val || 5);
    try {
      await API.post('/feedback', {
        message, rating,
        name: document.getElementById('fb-name').value,
        contact: document.getElementById('fb-contact').value,
        type: document.getElementById('fb-type').value,
      });
      toast(t('fb_sent'));
      document.getElementById('fb-msg').value = '';
    } catch (e) { toast(e.data?.hint || t('error_gen')); }
  };
  window.scrollTo(0, 0);
}

function viewContact(view) {
  view.innerHTML = `
    <div class="panel">
      <h2 style="margin:0 0 8px">📞 ${t('contact_us')}</h2>
      <p class="muted">Koi sawal, suggestion, ya complaint? Humein bataiye.</p>
      <div class="form">
        <div class="field"><label class="label">${t('name_l')}</label>
          <input class="input" id="c-name" value="${esc((API.user || {}).name || '')}"></div>
        <div class="field"><label class="label">${t('phone')} / Email</label>
          <input class="input" id="c-contact" value="${esc((API.user || {}).phone || '')}"></div>
        <div class="field"><label class="label">${t('your_msg')}</label>
          <textarea class="textarea" id="c-msg" rows="4"></textarea></div>
        <button class="btn btn-primary btn-block" id="c-send">${t('submit')}</button>
      </div>
    </div>
    <div class="panel">
      <div class="kv"><span class="k">✉️</span><span>support@laborsnearme.in</span></div>
      <div class="kv"><span class="k">📍</span><span>Indore, Madhya Pradesh, India</span></div>
      <div class="kv"><span class="k">⏰</span><span>Mon–Sat · 10 AM – 7 PM</span></div>
    </div>`;
  document.getElementById('c-send').onclick = async () => {
    const msg = document.getElementById('c-msg').value.trim();
    if (!msg) return toast('⚠️ ' + t('your_msg'));
    try {
      await API.post('/reports', { targetType: 'user', targetId: 'platform', reason: 'CONTACT: ' + msg.slice(0, 200) });
    } catch (e) {}
    toast(t('contact_sent'));
    document.getElementById('c-msg').value = '';
  };
  window.scrollTo(0, 0);
}
