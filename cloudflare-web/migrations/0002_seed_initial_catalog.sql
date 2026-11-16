-- Migration 0002: Default Store Settings (with unconfigured contact/reviews) & Initial Catalog

INSERT OR IGNORE INTO store_settings (
  id, store_name, tagline, logo_url, hero_title, hero_subtitle, hero_offer_badge,
  promo_banner_title, promo_banner_subtitle, delivery_charge_pkr, free_delivery_threshold_pkr,
  whatsapp_number, support_phone, support_email, store_address, registration_details,
  about_us_text, privacy_policy_text, return_policy_text, shipping_policy_text, faq_text,
  why_shop_items, updated_at
) VALUES (
  1,
  'Expensive Store',
  'Shop Smart, Pay Less.',
  '',
  'Smart Choices. Everyday Value.',
  'Curated electronics, watches, and lifestyle essentials delivered nationwide across Pakistan with Cash on Delivery.',
  'CASH ON DELIVERY • PAKISTAN',
  'Nationwide Cash on Delivery',
  'Pay safely in PKR when your order arrives at your doorstep.',
  250,
  5000,
  '03037626960',
  '',
  '',
  '',
  '',
  'Expensive Store is a Pakistani online retail storefront built around transparent PKR pricing, verified stock, and convenient Cash on Delivery nationwide.',
  'We collect only the customer name, Pakistani mobile number, city, and delivery address needed to dispatch and track your Cash on Delivery order.',
  'Unused items in original packaging may be requested for return or exchange within 7 days of delivery by contacting store support with your Order ID.',
  'Orders are dispatched nationwide across Pakistan via Cash on Delivery. Delivery charges and free-delivery thresholds are calculated transparently at checkout.',
  'Q: What payment method do you accept?\nA: Cash on Delivery (COD) only in PKR.\n\nQ: How do I track my order?\nA: Use Track Order with your Order ID and registered Pakistani mobile number.',
  'Cash on Delivery Only|Nationwide Pakistan Dispatch|Verified Stock & Pricing|Mobile-Friendly Support',
  1763250000000
);

INSERT OR IGNORE INTO categories (id, name, slug, description, image_url, is_featured, sort_order, created_at) VALUES
  ('cat-electronics', 'Smart Electronics', 'smart-electronics', 'Wireless audio, smartwatches, and everyday tech essentials.', '/images/img_cat_electronics.jpg', 1, 1, 1763250000000),
  ('cat-lifestyle', 'Watches & Carry', 'watches-carry', 'Structured travel backpacks, sunglasses, and timepieces.', '/images/img_cat_lifestyle.jpg', 1, 2, 1763250000000),
  ('cat-home', 'Home & Desk', 'home-desk', 'Desk lamps, insulated drinkware, and wireless chargers.', '/images/img_cat_home_tech.jpg', 1, 3, 1763250000000);

INSERT OR IGNORE INTO products (
  id, sku, name, slug, category_id, regular_price_pkr, discount_price_pkr,
  description, specifications, stock_quantity, is_available, is_featured, is_on_sale,
  is_best_seller, is_new_arrival, created_at, updated_at
) VALUES
  ('prod-anc-headphones', 'EXP-AUD-101', 'Studio Matte ANC Headphones', 'studio-matte-anc-headphones', 'cat-electronics', 14900, 11499, 'Active noise-cancelling over-ear wireless headphones with 40-hour battery life and USB-C fast charging.', 'Bluetooth 5.3 | 40h Battery | Hybrid ANC | USB-C Fast Charge', 24, 1, 1, 1, 1, 0, 1763250000100, 1763250000100),
  ('prod-amoled-watch', 'EXP-WCH-204', 'Apex Series AMOLED Smartwatch', 'apex-series-amoled-smartwatch', 'cat-electronics', 12500, 9499, 'Aluminum-frame smartwatch with always-on AMOLED display, Bluetooth calling, and 7-day battery endurance.', '1.96" AMOLED | Aluminum Case | IP68 | Bluetooth Call', 18, 1, 1, 1, 1, 1, 1763250000200, 1763250000200),
  ('prod-navy-backpack', 'EXP-BAG-302', 'Executive Navy Laptop Backpack', 'executive-navy-laptop-backpack', 'cat-lifestyle', 6800, 5499, 'Water-repellent structured commuter backpack fitting 16-inch laptops with hidden anti-theft pocket.', '16" Laptop Sleeve | Water-Repellent Canvas | 22L Capacity', 32, 1, 1, 1, 1, 0, 1763250000300, 1763250000300),
  ('prod-steel-chronograph', 'EXP-TIM-408', 'Minimalist Steel Dress Watch', 'minimalist-steel-dress-watch', 'cat-lifestyle', 8900, NULL, 'Brushed stainless steel timepiece featuring date window and precision Japanese quartz movement.', '40mm Case | 316L Stainless Steel | 5 ATM Water Resistance', 14, 1, 1, 0, 0, 1, 1763250000400, 1763250000400),
  ('prod-smart-desk-lamp', 'EXP-HOM-501', 'Architect Matte LED Desk Lamp', 'architect-matte-led-desk-lamp', 'cat-home', 5900, 4650, 'Eye-care dimmable aluminum desk lamp with warm-to-cool color temperature touch slider.', '3000K-6000K Touch Dimmer | CRI>95 | USB-C Powered', 20, 1, 1, 1, 0, 1, 1763250000500, 1763250000500),
  ('prod-qi-pad-tumbler', 'EXP-HOM-512', '15W Fabric Wireless Charger + Tumbler Set', '15w-fabric-wireless-charger-set', 'cat-home', 4800, 3899, 'Desk upgrade bundle pairing a 15W Qi wireless charger with a double-wall stainless travel tumbler.', '15W Qi Fast Charge | 450ml Steel Tumbler | USB-C', 27, 1, 0, 1, 1, 1, 1763250000600, 1763250000600);

INSERT OR IGNORE INTO product_images (id, product_id, image_url, sort_order) VALUES
  ('img-1', 'prod-anc-headphones', '/images/img_cat_electronics.jpg', 0),
  ('img-2', 'prod-anc-headphones', '/images/img_hero_banner.jpg', 1),
  ('img-3', 'prod-amoled-watch', '/images/img_hero_banner.jpg', 0),
  ('img-4', 'prod-amoled-watch', '/images/img_cat_electronics.jpg', 1),
  ('img-5', 'prod-navy-backpack', '/images/img_cat_lifestyle.jpg', 0),
  ('img-6', 'prod-steel-chronograph', '/images/img_cat_lifestyle.jpg', 0),
  ('img-7', 'prod-smart-desk-lamp', '/images/img_cat_home_tech.jpg', 0),
  ('img-8', 'prod-qi-pad-tumbler', '/images/img_cat_home_tech.jpg', 0);
