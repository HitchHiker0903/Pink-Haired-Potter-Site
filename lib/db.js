// Database setup + shared queries (Cloudflare D1).
// Tables are created automatically on first request, so no console/SQL steps are needed.

import { DEFAULT_CONTENT, DEFAULT_GALLERY, DEFAULT_SHIPPING } from './defaults.js';
import { uid, parseImages } from './util.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS items (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     price_cents INTEGER NOT NULL,
     weight_lbs REAL NOT NULL DEFAULT 2,
     stock INTEGER NOT NULL DEFAULT 1,
     category TEXT NOT NULL DEFAULT '',
     images TEXT NOT NULL DEFAULT '[]',
     featured INTEGER NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'active',
     sort INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS reservations (
     session_id TEXT NOT NULL,
     item_id TEXT NOT NULL,
     qty INTEGER NOT NULL,
     title TEXT,
     price_cents INTEGER,
     expires_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_res_item ON reservations(item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_res_session ON reservations(session_id)`,
  `CREATE TABLE IF NOT EXISTS gallery (
     id TEXT PRIMARY KEY,
     url TEXT NOT NULL,
     caption TEXT NOT NULL DEFAULT '',
     collection TEXT NOT NULL DEFAULT '',
     sort INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS content (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (
     id TEXT PRIMARY KEY,
     session_id TEXT UNIQUE NOT NULL,
     created_at INTEGER NOT NULL,
     email TEXT, name TEXT, phone TEXT,
     fulfillment TEXT NOT NULL,
     shipping_address TEXT,
     items TEXT NOT NULL,
     subtotal_cents INTEGER, shipping_cents INTEGER, tax_cents INTEGER, total_cents INTEGER,
     est_zip TEXT,
     zip_mismatch INTEGER NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'new',
     notes TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS custom_requests (
     id TEXT PRIMARY KEY,
     created_at INTEGER NOT NULL,
     name TEXT, email TEXT, phone TEXT,
     piece_type TEXT, size TEXT, colors TEXT, quantity TEXT,
     deadline TEXT, budget TEXT, details TEXT,
     photo_key TEXT,
     status TEXT NOT NULL DEFAULT 'new',
     notes TEXT NOT NULL DEFAULT '',
     deposit_url TEXT, deposit_link_id TEXT,
     deposit_amount_cents INTEGER,
     deposit_paid INTEGER NOT NULL DEFAULT 0)`,
];

let ready = false;

export async function ensureSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s.replace(/\s+/g, ' '))));
  const seeded = await db.prepare(`SELECT value FROM content WHERE key='meta_seeded'`).first();
  if (!seeded) {
    const now = Date.now();
    const stmts = Object.entries(DEFAULT_CONTENT).map(([k, v]) =>
      db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)').bind(k, v)
    );
    DEFAULT_GALLERY.forEach((g, i) =>
      stmts.push(
        db
          .prepare('INSERT INTO gallery (id, url, caption, collection, sort, created_at) VALUES (?,?,?,?,?,?)')
          .bind(uid(), g.url, g.caption, g.collection, i, now - i)
      )
    );
    stmts.push(db.prepare(`INSERT OR REPLACE INTO content (key, value) VALUES ('meta_seeded', '1')`));
    await db.batch(stmts);
  }
  ready = true;
}

export async function getContent(db, { includePrivate = false } = {}) {
  const { results } = await db.prepare('SELECT key, value FROM content').all();
  const out = {};
  for (const r of results) {
    if (r.key.startsWith('meta_')) continue;
    if (!includePrivate && r.key.startsWith('private_')) continue;
    out[r.key] = r.value;
  }
  return out;
}

export async function getShippingSettings(db) {
  const row = await db.prepare(`SELECT value FROM content WHERE key='shipping'`).first();
  let s = {};
  try {
    s = JSON.parse(row?.value || '{}');
  } catch {}
  return { ...DEFAULT_SHIPPING, ...s };
}

// Items + how many are still buyable (stock minus active checkout holds).
const ITEM_SELECT = `SELECT i.*, i.stock - COALESCE(
    (SELECT SUM(r.qty) FROM reservations r WHERE r.item_id = i.id AND r.expires_at > ?), 0) AS available
  FROM items i`;

export function shapeItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_cents: row.price_cents,
    weight_lbs: row.weight_lbs,
    stock: row.stock,
    available: Math.max(0, row.available ?? row.stock),
    category: row.category,
    images: parseImages(row.images),
    featured: !!row.featured,
    status: row.status,
    sort: row.sort,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listShopItems(db) {
  const { results } = await db
    .prepare(`${ITEM_SELECT} WHERE i.status = 'active' AND i.stock > 0 ORDER BY i.sort ASC, i.created_at DESC`)
    .bind(Date.now())
    .all();
  return results.map(shapeItem);
}

export async function getItemsByIds(db, ids) {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(',');
  const { results } = await db
    .prepare(`${ITEM_SELECT} WHERE i.id IN (${marks})`)
    .bind(Date.now(), ...ids)
    .all();
  return results.map(shapeItem);
}

export async function getItem(db, id) {
  const row = await db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).bind(Date.now(), id).first();
  return shapeItem(row);
}
