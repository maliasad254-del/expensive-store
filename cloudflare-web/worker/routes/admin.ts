import { ALLOWED_ORDER_STATUSES, Env, OrderStatus } from '../types';
import { randomHex } from '../lib/crypto';
import { errorResponse, jsonResponse } from '../lib/http';
import {
  parsePositiveInt,
  sanitizeText,
  slugify,
  validateImageUpload
} from '../lib/validation';

export async function handleAdminAnalytics(env: Env): Promise<Response> {
  const summary = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_pkr ELSE 0 END), 0) AS total_sales_pkr,
       COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_orders,
       COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS delivered_orders,
       COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_orders
     FROM orders`
  ).first();

  const { results: bestSellers } = await env.DB.prepare(
    `SELECT oi.product_id, oi.product_name, oi.sku,
            SUM(oi.quantity) AS units_sold,
            SUM(oi.line_total_pkr) AS revenue_pkr
     FROM order_items oi
     JOIN orders o ON o.order_number = oi.order_number
     WHERE o.status != 'CANCELLED'
     GROUP BY oi.product_id, oi.product_name, oi.sku
     ORDER BY units_sold DESC
     LIMIT 5`
  ).all();

  const { results: recentOrders } = await env.DB.prepare(
    'SELECT order_number, customer_name, city, total_pkr, status, created_at FROM orders ORDER BY created_at DESC LIMIT 8'
  ).all();

  return jsonResponse({ summary, bestSellers, recentOrders });
}

export async function handleAdminSaveCategory(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const name = sanitizeText(body.name, 80);
  if (name.length < 2) return errorResponse('Category name is required.', 400);

  const id = sanitizeText(body.id, 60) || `cat_${randomHex(6)}`;
  const slug = slugify(sanitizeText(body.slug, 80) || name);
  const description = sanitizeText(body.description, 400);
  const imageUrl = sanitizeText(body.image_url, 400) || '/images/img_cat_electronics.jpg';
  const isFeatured = body.is_featured === false ? 0 : 1;
  const sortOrder = parsePositiveInt(body.sort_order, 0);
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO categories (id, name, slug, description, image_url, is_featured, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       slug = excluded.slug,
       description = excluded.description,
       image_url = excluded.image_url,
       is_featured = excluded.is_featured,
       sort_order = excluded.sort_order`
  )
    .bind(id, name, slug, description, imageUrl, isFeatured, sortOrder, now)
    .run();

  return jsonResponse({ id, name, slug });
}

export async function handleAdminDeleteCategory(id: string, env: Env): Promise<Response> {
  const countRow = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?'
  )
    .bind(id)
    .first<{ cnt: number }>();

  if ((countRow?.cnt ?? 0) > 0) {
    return errorResponse('Cannot delete a category that still has products.', 409);
  }
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

export async function handleAdminSaveProduct(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const name = sanitizeText(body.name, 140);
  const categoryId = sanitizeText(body.category_id, 60);
  const regularPricePkr = parsePositiveInt(body.regular_price_pkr, 0);
  const rawDiscount = body.discount_price_pkr ? parsePositiveInt(body.discount_price_pkr, 0) : null;
  const discountPricePkr =
    rawDiscount && rawDiscount > 0 && rawDiscount < regularPricePkr ? rawDiscount : null;

  if (name.length < 2 || !categoryId || regularPricePkr <= 0) {
    return errorResponse('Product name, category, and regular PKR price are required.', 400);
  }

  const id = sanitizeText(body.id, 60) || `prod_${randomHex(6)}`;
  const sku =
    sanitizeText(body.sku, 50).toUpperCase() || `EXP-${randomHex(3).toUpperCase()}`;
  const slug = slugify(sanitizeText(body.slug, 140) || `${name}-${id.slice(-4)}`);
  const description = sanitizeText(body.description, 4000);
  const specifications = sanitizeText(body.specifications, 2000);
  const stockQuantity = parsePositiveInt(body.stock_quantity, 0);
  const isAvailable = body.is_available === false ? 0 : 1;
  const isFeatured = body.is_featured ? 1 : 0;
  const isOnSale = body.is_on_sale || discountPricePkr !== null ? 1 : 0;
  const isBestSeller = body.is_best_seller ? 1 : 0;
  const isNewArrival = body.is_new_arrival ? 1 : 0;
  const images = Array.isArray(body.images)
    ? body.images.map((u) => sanitizeText(u, 500)).filter(Boolean)
    : ['/images/img_cat_electronics.jpg'];
  const now = Date.now();

  const existingProduct = await env.DB.prepare(
    'SELECT regular_price_pkr, discount_price_pkr FROM products WHERE id = ? LIMIT 1'
  )
    .bind(id)
    .first<{ regular_price_pkr: number; discount_price_pkr: number | null }>();

  const previousEffectivePrice = existingProduct
    ? existingProduct.discount_price_pkr &&
      existingProduct.discount_price_pkr > 0 &&
      existingProduct.discount_price_pkr < existingProduct.regular_price_pkr
      ? existingProduct.discount_price_pkr
      : existingProduct.regular_price_pkr
    : null;

  const newEffectivePrice =
    discountPricePkr !== null && discountPricePkr > 0 && discountPricePkr < regularPricePkr
      ? discountPricePkr
      : regularPricePkr;

  await env.DB.prepare(
    `INSERT INTO products (
      id, sku, name, slug, category_id, regular_price_pkr, discount_price_pkr,
      description, specifications, stock_quantity, is_available, is_featured,
      is_on_sale, is_best_seller, is_new_arrival, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sku = excluded.sku,
      name = excluded.name,
      slug = excluded.slug,
      category_id = excluded.category_id,
      regular_price_pkr = excluded.regular_price_pkr,
      discount_price_pkr = excluded.discount_price_pkr,
      description = excluded.description,
      specifications = excluded.specifications,
      stock_quantity = excluded.stock_quantity,
      is_available = excluded.is_available,
      is_featured = excluded.is_featured,
      is_on_sale = excluded.is_on_sale,
      is_best_seller = excluded.is_best_seller,
      is_new_arrival = excluded.is_new_arrival,
      updated_at = excluded.updated_at`
  )
    .bind(
      id,
      sku,
      name,
      slug,
      categoryId,
      regularPricePkr,
      discountPricePkr,
      description,
      specifications,
      stockQuantity,
      isAvailable,
      isFeatured,
      isOnSale,
      isBestSeller,
      isNewArrival,
      now,
      now
    )
    .run();

  await env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id).run();
  const imgList = images.length > 0 ? images : ['/images/img_cat_electronics.jpg'];
  await env.DB.batch(
    imgList.map((url, idx) =>
      env.DB.prepare(
        'INSERT INTO product_images (id, product_id, image_url, sort_order) VALUES (?, ?, ?, ?)'
      ).bind(`pimg_${randomHex(6)}`, id, url, idx)
    )
  );

  // Trigger price drop notifications if effective price decreased
  let priceAlertsTriggered = 0;
  if (previousEffectivePrice !== null && newEffectivePrice < previousEffectivePrice) {
    const { results: matchingSubs } = await env.DB.prepare(
      `SELECT id, email, subscribed_price_pkr
       FROM price_drop_subscriptions
       WHERE product_id = ? AND status = 'ACTIVE' AND subscribed_price_pkr > ?`
    )
      .bind(id, newEffectivePrice)
      .all<{ id: string; email: string; subscribed_price_pkr: number }>();

    for (const sub of matchingSubs) {
      const notifId = `pdn_${randomHex(6)}`;
      let deliveryStatus = 'PENDING';
      let sentAt: number | null = null;

      if (env.EMAIL_WEBHOOK_URL) {
        try {
          const webhookRes = await fetch(env.EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: sub.email,
              subject: `Price Drop Alert: ${name} is now PKR ${newEffectivePrice}`,
              productId: id,
              productName: name,
              oldPricePkr: sub.subscribed_price_pkr,
              newPricePkr: newEffectivePrice
            })
          });
          if (webhookRes.ok) {
            deliveryStatus = 'SENT';
            sentAt = Date.now();
          }
        } catch {
          deliveryStatus = 'PENDING';
        }
      }

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO price_drop_notifications (
            id, subscription_id, product_id, product_name, email,
            old_price_pkr, new_price_pkr, delivery_status, created_at, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          notifId,
          sub.id,
          id,
          name,
          sub.email,
          sub.subscribed_price_pkr,
          newEffectivePrice,
          deliveryStatus,
          now,
          sentAt
        ),
        env.DB.prepare(
          `UPDATE price_drop_subscriptions
           SET status = 'TRIGGERED', last_notified_price_pkr = ?, triggered_at = ?
           WHERE id = ?`
        ).bind(newEffectivePrice, now, sub.id)
      ]);
      priceAlertsTriggered++;
    }
  }

  return jsonResponse({ id, sku, slug, priceAlertsTriggered });
}

export async function handleAdminDeleteProduct(id: string, env: Env): Promise<Response> {
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

export async function handleAdminUploadImage(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const entry = formData.get('file') as unknown;
  if (!entry || typeof entry === 'string' || typeof (entry as File).arrayBuffer !== 'function') {
    return errorResponse('Missing image file field.', 400);
  }
  const file = entry as File;
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const check = validateImageUpload(file.type, bytes);
  if (!check.ok) {
    return errorResponse(check.reason, 400);
  }

  const key = `products/${Date.now()}-${randomHex(6)}.${check.ext}`;
  await env.BUCKET.put(key, bytes, {
    httpMetadata: { contentType: file.type }
  });

  return jsonResponse({ url: `/api/images/${key}`, key }, 201);
}

export async function handleAdminListOrders(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = sanitizeText(url.searchParams.get('q') || '', 80).toLowerCase();
  const status = sanitizeText(url.searchParams.get('status') || '', 30).toUpperCase();

  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: unknown[] = [];

  if (status && ALLOWED_ORDER_STATUSES.includes(status as OrderStatus)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    sql +=
      ' AND (lower(order_number) LIKE ? OR lower(customer_name) LIKE ? OR mobile_number LIKE ? OR lower(city) LIKE ?)';
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  const stmt = env.DB.prepare(sql);
  const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
  return jsonResponse({ orders: results });
}

export async function handleAdminGetOrder(orderNumber: string, env: Env): Promise<Response> {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE order_number = ? LIMIT 1')
    .bind(orderNumber)
    .first();
  if (!order) return errorResponse('Order not found.', 404);

  const { results: items } = await env.DB.prepare(
    'SELECT * FROM order_items WHERE order_number = ?'
  )
    .bind(orderNumber)
    .all();
  const { results: history } = await env.DB.prepare(
    'SELECT * FROM order_status_history WHERE order_number = ? ORDER BY created_at ASC'
  )
    .bind(orderNumber)
    .all();

  return jsonResponse({ order, items, history });
}

export async function handleAdminUpdateOrderStatus(
  orderNumber: string,
  request: Request,
  env: Env
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const newStatus = sanitizeText(body.status, 30).toUpperCase() as OrderStatus;
  if (!ALLOWED_ORDER_STATUSES.includes(newStatus)) {
    return errorResponse('Invalid order status.', 400);
  }
  const note = sanitizeText(body.note, 300) || `Order status updated to ${newStatus}`;

  const current = await env.DB.prepare(
    'SELECT status FROM orders WHERE order_number = ? LIMIT 1'
  )
    .bind(orderNumber)
    .first<{ status: string }>();

  if (!current) return errorResponse('Order not found.', 404);

  if (current.status === newStatus) {
    return jsonResponse({ ok: true, status: newStatus, unchanged: true });
  }

  if (current.status === 'CANCELLED' || current.status === 'DELIVERED') {
    return errorResponse(`Order is already ${current.status} and cannot be changed.`, 409);
  }

  const now = Date.now();

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE order_number = ? AND status = ?'
    ).bind(newStatus, now, orderNumber, current.status),

    env.DB.prepare(
      `INSERT INTO order_status_history (order_number, status, note, created_at)
       SELECT ?, ?, ?, ? WHERE changes() = 1`
    ).bind(orderNumber, newStatus, note, now)
  ];

  if (newStatus === 'CANCELLED') {
    statements.push(
      env.DB.prepare(
        `UPDATE products
         SET stock_quantity = stock_quantity + (
           SELECT COALESCE(SUM(quantity), 0)
           FROM order_items
           WHERE order_items.product_id = products.id
             AND order_items.order_number = ?
         )
         WHERE id IN (
           SELECT product_id FROM order_items WHERE order_number = ?
         )
         AND changes() = 1`
      ).bind(orderNumber, orderNumber)
    );
  }

  const results = await env.DB.batch(statements);

  if (results[0].meta.changes !== 1) {
    return errorResponse(
      'Order status was changed by another request. Please refresh and try again.',
      409
    );
  }

  return jsonResponse({ ok: true, status: newStatus });
}

export async function handleAdminSaveSettings(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const now = Date.now();
  await env.DB.prepare(
    `UPDATE store_settings SET
      store_name = ?,
      tagline = ?,
      logo_url = ?,
      hero_title = ?,
      hero_subtitle = ?,
      hero_offer_badge = ?,
      promo_banner_title = ?,
      promo_banner_subtitle = ?,
      delivery_charge_pkr = ?,
      free_delivery_threshold_pkr = ?,
      whatsapp_number = ?,
      support_phone = ?,
      support_email = ?,
      store_address = ?,
      registration_details = ?,
      about_us_text = ?,
      privacy_policy_text = ?,
      return_policy_text = ?,
      shipping_policy_text = ?,
      faq_text = ?,
      why_shop_items = ?,
      updated_at = ?
     WHERE id = 1`
  )
    .bind(
      sanitizeText(body.store_name, 100) || 'Expensive Store',
      sanitizeText(body.tagline, 150) || 'Shop Smart, Pay Less.',
      sanitizeText(body.logo_url, 500),
      sanitizeText(body.hero_title, 180),
      sanitizeText(body.hero_subtitle, 400),
      sanitizeText(body.hero_offer_badge, 80),
      sanitizeText(body.promo_banner_title, 180),
      sanitizeText(body.promo_banner_subtitle, 400),
      parsePositiveInt(body.delivery_charge_pkr, 250),
      parsePositiveInt(body.free_delivery_threshold_pkr, 5000),
      sanitizeText(body.whatsapp_number, 30),
      sanitizeText(body.support_phone, 30),
      sanitizeText(body.support_email, 120),
      sanitizeText(body.store_address, 300),
      sanitizeText(body.registration_details, 200),
      sanitizeText(body.about_us_text, 4000),
      sanitizeText(body.privacy_policy_text, 4000),
      sanitizeText(body.return_policy_text, 4000),
      sanitizeText(body.shipping_policy_text, 4000),
      sanitizeText(body.faq_text, 4000),
      sanitizeText(body.why_shop_items, 600),
      now
    )
    .run();

  return jsonResponse({ ok: true });
}

export async function handleAdminListReviews(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const statusFilter = sanitizeText(url.searchParams.get('status') || '', 20).toUpperCase();

  let sql = `SELECT r.id, r.product_id, p.name AS product_name, r.order_number,
                    r.customer_name, r.city, r.rating, r.comment,
                    r.verified_purchase, r.is_approved, r.moderation_status,
                    r.created_at, r.moderated_at
             FROM reviews r
             LEFT JOIN products p ON p.id = r.product_id`;
  const params: unknown[] = [];

  if (statusFilter === 'PENDING' || statusFilter === 'APPROVED' || statusFilter === 'REJECTED') {
    sql += ' WHERE r.moderation_status = ?';
    params.push(statusFilter);
  }

  sql += ` ORDER BY CASE WHEN r.moderation_status = 'PENDING' THEN 0 ELSE 1 END ASC, r.created_at DESC LIMIT 200`;

  const stmt = env.DB.prepare(sql);
  const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
  return jsonResponse({
    reviews: results.map((r) => ({
      ...r,
      verified_purchase: Boolean(r.verified_purchase),
      is_approved: Boolean(r.is_approved)
    }))
  });
}

export async function handleAdminAddReview(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }
  const customerName = sanitizeText(body.customer_name, 80);
  const city = sanitizeText(body.city, 60);
  const productId = sanitizeText(body.product_id, 60) || null;
  const rating = Math.min(5, Math.max(1, parsePositiveInt(body.rating, 5)));
  const comment = sanitizeText(body.comment, 1000);
  if (!customerName || !comment) {
    return errorResponse('Customer name and comment are required.', 400);
  }
  const id = `rev_${randomHex(6)}`;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO reviews (
      id, product_id, customer_name, city, rating, comment,
      verified_purchase, is_approved, moderation_status, created_at, moderated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 'APPROVED', ?, ?)`
  )
    .bind(id, productId, customerName, city, rating, comment, now, now)
    .run();
  return jsonResponse({ id }, 201);
}

export async function handleAdminModerateReview(
  id: string,
  request: Request,
  env: Env
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const nextStatus = sanitizeText(body.status, 20).toUpperCase();
  if (nextStatus !== 'APPROVED' && nextStatus !== 'REJECTED') {
    return errorResponse('Moderation status must be APPROVED or REJECTED.', 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM reviews WHERE id = ? LIMIT 1')
    .bind(id)
    .first<{ id: string }>();
  if (!existing) {
    return errorResponse('Review not found.', 404);
  }

  const isApproved = nextStatus === 'APPROVED' ? 1 : 0;
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE reviews SET is_approved = ?, moderation_status = ?, moderated_at = ? WHERE id = ?'
  )
    .bind(isApproved, nextStatus, now, id)
    .run();

  return jsonResponse({ ok: true, id, moderation_status: nextStatus });
}

export async function handleAdminDeleteReview(id: string, env: Env): Promise<Response> {
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
  return jsonResponse({ ok: true });
}

export async function handleAdminGetPriceAlerts(env: Env): Promise<Response> {
  const { results: subscriptions } = await env.DB.prepare(
    `SELECT s.id, s.product_id, p.name AS product_name, s.email, s.subscribed_price_pkr,
            s.last_notified_price_pkr, s.status, s.created_at, s.triggered_at
     FROM price_drop_subscriptions s
     LEFT JOIN products p ON p.id = s.product_id
     ORDER BY s.created_at DESC
     LIMIT 200`
  ).all();

  const { results: notifications } = await env.DB.prepare(
    `SELECT id, subscription_id, product_id, product_name, email,
            old_price_pkr, new_price_pkr, delivery_status, created_at, sent_at
     FROM price_drop_notifications
     ORDER BY created_at DESC
     LIMIT 200`
  ).all();

  return jsonResponse({ subscriptions, notifications });
}

export async function handleAdminMarkPriceAlertSent(id: string, env: Env): Promise<Response> {
  await env.DB.prepare(
    "UPDATE price_drop_notifications SET delivery_status = 'SENT', sent_at = ? WHERE id = ?"
  )
    .bind(Date.now(), id)
    .run();
  return jsonResponse({ ok: true });
}
