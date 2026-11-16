-- Migration 0001: Expensive Store D1 SQLite Schema

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '/images/img_cat_electronics.jpg',
  is_featured INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  regular_price_pkr INTEGER NOT NULL CHECK (regular_price_pkr > 0),
  discount_price_pkr INTEGER,
  description TEXT NOT NULL DEFAULT '',
  specifications TEXT NOT NULL DEFAULT '',
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_on_sale INTEGER NOT NULL DEFAULT 0,
  is_best_seller INTEGER NOT NULL DEFAULT 0,
  is_new_arrival INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_available);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS orders (
  order_number TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  city TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  order_notes TEXT NOT NULL DEFAULT '',
  subtotal_pkr INTEGER NOT NULL,
  delivery_fee_pkr INTEGER NOT NULL,
  discount_total_pkr INTEGER NOT NULL DEFAULT 0,
  total_pkr INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH ON DELIVERY',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price_pkr INTEGER NOT NULL,
  original_price_pkr INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_pkr INTEGER NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (order_number) REFERENCES orders(order_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_number);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (order_number) REFERENCES orders(order_number) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Expensive Store',
  tagline TEXT NOT NULL DEFAULT 'Shop Smart, Pay Less.',
  logo_url TEXT NOT NULL DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT 'Smart Choices. Everyday Value.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Curated essentials delivered nationwide across Pakistan with Cash on Delivery.',
  hero_offer_badge TEXT NOT NULL DEFAULT 'CASH ON DELIVERY • PAKISTAN',
  promo_banner_title TEXT NOT NULL DEFAULT 'Nationwide Cash on Delivery',
  promo_banner_subtitle TEXT NOT NULL DEFAULT 'Inspect your parcel at your doorstep and pay in PKR.',
  delivery_charge_pkr INTEGER NOT NULL DEFAULT 250,
  free_delivery_threshold_pkr INTEGER NOT NULL DEFAULT 5000,
  whatsapp_number TEXT NOT NULL DEFAULT '03037626960',
  support_phone TEXT NOT NULL DEFAULT '',
  support_email TEXT NOT NULL DEFAULT '',
  store_address TEXT NOT NULL DEFAULT '',
  registration_details TEXT NOT NULL DEFAULT '',
  about_us_text TEXT NOT NULL DEFAULT '',
  privacy_policy_text TEXT NOT NULL DEFAULT '',
  return_policy_text TEXT NOT NULL DEFAULT '',
  shipping_policy_text TEXT NOT NULL DEFAULT '',
  faq_text TEXT NOT NULL DEFAULT '',
  why_shop_items TEXT NOT NULL DEFAULT 'Cash on Delivery Only|Nationwide Pakistan Dispatch|Verified Stock & Pricing|Mobile-Friendly Support',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_address TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
