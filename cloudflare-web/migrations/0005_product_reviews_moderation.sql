-- Migration 0005: Product-level customer reviews with post-purchase verification & admin moderation

ALTER TABLE reviews ADD COLUMN product_id TEXT;
ALTER TABLE reviews ADD COLUMN order_number TEXT;
ALTER TABLE reviews ADD COLUMN verified_purchase INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE reviews ADD COLUMN moderated_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_reviews_product_status
  ON reviews(product_id, moderation_status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_product_unique
  ON reviews(order_number, product_id)
  WHERE order_number IS NOT NULL AND product_id IS NOT NULL;
