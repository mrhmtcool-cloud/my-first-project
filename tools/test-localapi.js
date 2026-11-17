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
