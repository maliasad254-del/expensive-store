import { Env } from '../types';
import { randomHex } from '../lib/crypto';
import { errorResponse, jsonResponse, securityHeaders } from '../lib/http';
import {
  normalizeEmail,
  normalizePakistanMobile,
  sanitizeText,
  validateReviewSubmission
} from '../lib/validation';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category_id: string;
  category_name: string;
  regular_price_pkr: number;
  discount_price_pkr: number | null;
  description: string;
  specifications: string;
  stock_quantity: number;
  is_available: number;
  is_featured: number;
  is_on_sale: number;
  is_best_seller: number;
  is_new_arrival: number;
  created_at: number;
}

async function attachImages(env: Env, products: ProductRow[]) {
  if (products.length === 0) return [];
  const { results: imgs } = await env.DB.prepare(
    'SELECT product_id, image_url FROM product_images ORDER BY sort_order ASC'
  ).all<{ product_id: string; image_url: string }>();

  const imgMap = new Map<string, string[]>();
  for (const row of imgs) {
    const arr = imgMap.get(row.product_id) ?? [];
    arr.push(row.image_url);
    imgMap.set(row.product_id, arr);
  }

  return products.map((p) => ({
    ...p,
    is_available: Boolean(p.is_available),
    is_featured: Boolean(p.is_featured),
    is_on_sale: Boolean(p.is_on_sale),
    is_best_seller: Boolean(p.is_best_seller),
    is_new_arrival: Boolean(p.is_new_arrival),
    images: imgMap.get(p.id) ?? ['/images/img_cat_electronics.jpg']
  }));
}

export async function handleGetStorefront(env: Env): Promise<Response> {
  const settings = await env.DB.prepare('SELECT * FROM store_settings WHERE id = 1').first();
  const { results: categories } = await env.DB.prepare(
    'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'
  ).all();
  const { results: products } = await env.DB.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.created_at DESC`
  ).all<ProductRow>();
  const { results: reviews } = await env.DB.prepare(
    'SELECT id, customer_name, city, rating, comment, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC'
  ).all();

  const hydratedProducts = await attachImages(env, products);

  return jsonResponse({
    settings,
    categories,
    products: hydratedProducts,
    reviews
  });
}

export async function handleListProducts(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = sanitizeText(url.searchParams.get('q') || '', 100).toLowerCase();
  const category = sanitizeText(url.searchParams.get('category') || '', 80);
  const sort = sanitizeText(url.searchParams.get('sort') || 'featured', 30);

  let sql = `SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE 1=1`;
  const params: unknown[] = [];

  if (category) {
    sql += ' AND (p.category_id = ? OR c.slug = ?)';
    params.push(category, category);
  }
  if (q) {
    sql +=
      ' AND (lower(p.name) LIKE ? OR lower(p.sku) LIKE ? OR lower(p.description) LIKE ? OR lower(c.name) LIKE ?)';
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  switch (sort) {
    case 'price_asc':
      sql += ' ORDER BY COALESCE(p.discount_price_pkr, p.regular_price_pkr) ASC';
      break;
    case 'price_desc':
      sql += ' ORDER BY COALESCE(p.discount_price_pkr, p.regular_price_pkr) DESC';
      break;
    case 'newest':
      sql += ' ORDER BY p.created_at DESC';
      break;
    default:
      sql += ' ORDER BY p.is_featured DESC, p.created_at DESC';
  }

  const stmt = env.DB.prepare(sql);
  const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all<ProductRow>();
  const hydrated = await attachImages(env, results);
  return jsonResponse({ products: hydrated });
}

export async function handleGetProduct(slugOrId: string, env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? OR p.slug = ?
     LIMIT 1`
  )
    .bind(slugOrId, slugOrId)
    .first<ProductRow>();

  if (!row) {
    return errorResponse('Product not found.', 404);
  }

  const [product] = await attachImages(env, [row]);
  const { results: relatedRows } = await env.DB.prepare(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id != ? AND p.is_available = 1
     LIMIT 4`
  )
    .bind(row.category_id, row.id)
    .all<ProductRow>();
  const related = await attachImages(env, relatedRows);

  const { results: reviews } = await env.DB.prepare(
    `SELECT id, product_id, order_number, customer_name, city, rating, comment,
            verified_purchase, moderation_status, created_at
     FROM reviews
     WHERE product_id = ? AND is_approved = 1
     ORDER BY created_at DESC`
  )
    .bind(row.id)
    .all<{
      id: string;
      product_id: string | null;
      order_number: string | null;
      customer_name: string;
      city: string;
      rating: number;
      comment: string;
      verified_purchase: number;
      moderation_status: string;
      created_at: number;
    }>();

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? Number((reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount).toFixed(1))
      : 0;

  return jsonResponse({
    product,
    related,
    reviews: reviews.map((r) => ({ ...r, verified_purchase: Boolean(r.verified_purchase) })),
    reviewStats: { averageRating, reviewCount }
  });
}

export async function handleTrackOrder(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const orderNumber = sanitizeText(body.orderNumber, 40).toUpperCase();
  const mobile = normalizePakistanMobile(sanitizeText(body.mobileNumber, 24));
  if (!orderNumber || !mobile) {
    return errorResponse('Enter both a valid Order ID and Pakistani mobile number (03XXXXXXXXX).', 400);
  }

  // Strictly match BOTH order_number and normalized mobile_number; never expose full address or mobile
  const order = await env.DB.prepare(
    `SELECT order_number, status, city, total_pkr, payment_method, created_at, updated_at
     FROM orders
     WHERE order_number = ? AND mobile_number = ?
     LIMIT 1`
  )
    .bind(orderNumber, mobile)
    .first<{
      order_number: string;
      status: string;
      city: string;
      total_pkr: number;
      payment_method: string;
      created_at: number;
      updated_at: number;
    }>();

  if (!order) {
    return errorResponse('No matching order found. Please verify Order ID and mobile number.', 404);
  }

  const { results: history } = await env.DB.prepare(
    'SELECT status, note, created_at FROM order_status_history WHERE order_number = ? ORDER BY created_at ASC'
  )
    .bind(order.order_number)
    .all();

  const countRow = await env.DB.prepare(
    'SELECT COALESCE(SUM(quantity), 0) AS item_count FROM order_items WHERE order_number = ?'
  )
    .bind(order.order_number)
    .first<{ item_count: number }>();

  return jsonResponse({
    tracking: {
      order_number: order.order_number,
      status: order.status,
      city: order.city,
      total_pkr: order.total_pkr,
      payment_method: order.payment_method,
      item_count: countRow?.item_count ?? 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      history
    }
  });
}

export async function handleServeR2Image(key: string, env: Env): Promise<Response> {
  const cleanKey = decodeURIComponent(key).replace(/^\/+/, '');
  if (!cleanKey || cleanKey.includes('..')) {
    return errorResponse('Invalid image key.', 400);
  }
  const object = await env.BUCKET.get(cleanKey);
  if (!object) {
    return new Response('Image not found', { status: 404, headers: securityHeaders() });
  }
  const headers = new Headers(securityHeaders());
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}

export async function handleSubscribePriceDrop(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const productId = sanitizeText(body.productId, 80);
  const email = normalizeEmail(sanitizeText(body.email, 160));
  if (!productId) {
    return errorResponse('Product ID is required.', 400);
  }
  if (!email) {
    return errorResponse('Please enter a valid email address.', 400);
  }

  const product = await env.DB.prepare(
    'SELECT id, name, regular_price_pkr, discount_price_pkr FROM products WHERE id = ? LIMIT 1'
  )
    .bind(productId)
    .first<{
      id: string;
      name: string;
      regular_price_pkr: number;
      discount_price_pkr: number | null;
    }>();

  if (!product) {
    return errorResponse('Product not found.', 404);
  }

  const currentPricePkr =
    product.discount_price_pkr &&
    product.discount_price_pkr > 0 &&
    product.discount_price_pkr < product.regular_price_pkr
      ? product.discount_price_pkr
      : product.regular_price_pkr;

  const id = `pds_${randomHex(6)}`;
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO price_drop_subscriptions (
      id, product_id, email, subscribed_price_pkr, last_notified_price_pkr, status, created_at, triggered_at
    ) VALUES (?, ?, ?, ?, NULL, 'ACTIVE', ?, NULL)
    ON CONFLICT(product_id, email) DO UPDATE SET
      subscribed_price_pkr = excluded.subscribed_price_pkr,
      status = 'ACTIVE',
      triggered_at = NULL,
      created_at = excluded.created_at`
  )
    .bind(id, product.id, email, currentPricePkr, now)
    .run();

  return jsonResponse(
    {
      ok: true,
      subscription: {
        productId: product.id,
        productName: product.name,
        email,
        subscribedPricePkr: currentPricePkr
      }
    },
    201
  );
}

export async function handleSubmitProductReview(
  productIdOrSlug: string,
  request: Request,
  env: Env
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const checked = validateReviewSubmission({
    orderNumber: body.orderNumber,
    mobileNumber: body.mobileNumber,
    rating: body.rating,
    comment: body.comment
  });
  if (!checked.ok) {
    return errorResponse(checked.reason, 400);
  }

  const product = await env.DB.prepare(
    'SELECT id, name FROM products WHERE id = ? OR slug = ? LIMIT 1'
  )
    .bind(productIdOrSlug, productIdOrSlug)
    .first<{ id: string; name: string }>();

  if (!product) {
    return errorResponse('Product not found.', 404);
  }

  const order = await env.DB.prepare(
    `SELECT order_number, customer_name, city, status
     FROM orders
     WHERE order_number = ? AND mobile_number = ?
     LIMIT 1`
  )
    .bind(checked.orderNumber, checked.mobileNumber)
    .first<{
      order_number: string;
      customer_name: string;
      city: string;
      status: string;
    }>();

  if (!order) {
    return errorResponse(
      'We could not verify an order matching that Order ID and mobile number.',
      403
    );
  }
  if (order.status === 'CANCELLED') {
    return errorResponse('Reviews cannot be submitted for cancelled orders.', 403);
  }

  const orderedItem = await env.DB.prepare(
    'SELECT id FROM order_items WHERE order_number = ? AND product_id = ? LIMIT 1'
  )
    .bind(order.order_number, product.id)
    .first<{ id: number }>();

  if (!orderedItem) {
    return errorResponse(
      'This order does not include this product. Reviews are limited to verified buyers.',
      403
    );
  }

  const duplicate = await env.DB.prepare(
    'SELECT id FROM reviews WHERE order_number = ? AND product_id = ? LIMIT 1'
  )
    .bind(order.order_number, product.id)
    .first<{ id: string }>();

  if (duplicate) {
    return errorResponse('You have already submitted a review for this product on this order.', 409);
  }

  const id = `rev_${randomHex(6)}`;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO reviews (
      id, product_id, order_number, customer_name, city, rating, comment,
      verified_purchase, is_approved, moderation_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'PENDING', ?)`
  )
    .bind(id, product.id, order.order_number, order.customer_name, order.city, checked.rating, checked.comment, now)
    .run();

  return jsonResponse(
    {
      ok: true,
      review: {
        id,
        product_id: product.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        city: order.city,
        rating: checked.rating,
        comment: checked.comment,
        verified_purchase: true,
        moderation_status: 'PENDING',
        created_at: now
      }
    },
    201
  );
}
