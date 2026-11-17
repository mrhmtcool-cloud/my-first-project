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
