-- D1 Schema for Allison Walker Ceramics site
-- Run this in Cloudflare D1 console or via wrangler d1 execute

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  weight_oz REAL DEFAULT 16,
  category TEXT DEFAULT 'mug',
  photos TEXT, -- JSON array of R2 keys e.g. ["photo1.jpg", "photo2.jpg"]
  status TEXT DEFAULT 'available' CHECK(status IN ('available', 'sold', 'reserved')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  caption TEXT,
  photo_key TEXT NOT NULL,
  collection TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Seed some settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('home_intro', 'I create functional ceramic dinnerware with the goal of bringing people together and infusing a sense of celebration into everyday life. Bright colors, glitter, and bold shapes inspired by Lisa Frank and 80s/90s fashion.'),
  ('about_text', 'Allison Walker is a ceramic artist based in Overland Park, KS. Her work features bright glazes and glittery resin details that bring joy to everyday moments.'),
  ('policies_text', 'All pieces are food safe, microwave and dishwasher safe unless noted. Care: hand wash preferred for longevity of resin details. Returns accepted within 14 days if unused. Shipping breakage: please photograph and contact within 48 hours.'),
  ('shipping_tiers', '[{"max_items":1,"price":8},{"max_items":3,"price":12},{"max_items":6,"price":18},{"max_items":999,"price":25}]'),
  ('local_pickup', 'Free local pickup available in Overland Park, KS area. Select at checkout.'),
  ('custom_info', 'Custom orders welcome! Typical turnaround 4-6 weeks. Deposits via Stripe payment link after we discuss details.');
