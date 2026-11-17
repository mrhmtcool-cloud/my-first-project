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
