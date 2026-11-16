-- Migration 0004: Price Drop Subscriptions & Triggered Notifications

CREATE TABLE IF NOT EXISTS price_drop_subscriptions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  email TEXT NOT NULL,
  subscribed_price_pkr INTEGER NOT NULL,
  last_notified_price_pkr INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at INTEGER NOT NULL,
  triggered_at INTEGER,
  UNIQUE(product_id, email),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_drop_subs_product ON price_drop_subscriptions(product_id, status);

CREATE TABLE IF NOT EXISTS price_drop_notifications (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  email TEXT NOT NULL,
  old_price_pkr INTEGER NOT NULL,
  new_price_pkr INTEGER NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  FOREIGN KEY (subscription_id) REFERENCES price_drop_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_drop_notif_created ON price_drop_notifications(created_at DESC);
