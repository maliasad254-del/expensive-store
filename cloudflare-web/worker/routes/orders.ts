import { Env } from '../types';
import { generateOrderNumber } from '../lib/crypto';
import { errorResponse, jsonResponse } from '../lib/http';
import { normalizePakistanMobile, parsePositiveInt, sanitizeText } from '../lib/validation';

interface RequestedOrderItem {
  productId: string;
  quantity: number;
}

export async function handlePlaceCodOrder(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const customerName = sanitizeText(body.customerName, 120);
  const mobileNumber = normalizePakistanMobile(sanitizeText(body.mobileNumber, 24));
  const city = sanitizeText(body.city, 80);
  const deliveryAddress = sanitizeText(body.deliveryAddress, 500);
  const orderNotes = sanitizeText(body.orderNotes, 500);
  const idempotencyKey = sanitizeText(body.idempotencyKey, 100);
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (customerName.length < 2) {
    return errorResponse('Please enter your full name.', 400);
  }
  if (!mobileNumber) {
    return errorResponse('Please enter a valid Pakistani mobile number (03XXXXXXXXX).', 400);
  }
  if (city.length < 2) {
    return errorResponse('Please enter your delivery city.', 400);
  }
  if (deliveryAddress.length < 8) {
    return errorResponse('Please enter a complete delivery address.', 400);
  }
  if (!idempotencyKey) {
    return errorResponse('Missing order idempotency key.', 400);
  }
  if (rawItems.length === 0 || rawItems.length > 50) {
    return errorResponse('Cart must contain between 1 and 50 line items.', 400);
  }

  // Prevent duplicate submission
  const duplicate = await env.DB.prepare(
    'SELECT order_number, subtotal_pkr, delivery_fee_pkr, total_pkr, status, city, customer_name, mobile_number, payment_method, created_at FROM orders WHERE idempotency_key = ? LIMIT 1'
  )
    .bind(idempotencyKey)
    .first();

  if (duplicate) {
    const { results: dupItems } = await env.DB.prepare(
      'SELECT product_id, sku, product_name, unit_price_pkr, original_price_pkr, quantity, line_total_pkr, image_url FROM order_items WHERE order_number = ?'
    )
      .bind((duplicate as { order_number: string }).order_number)
      .all();
    return jsonResponse({ order: duplicate, items: dupItems, deduplicated: true }, 200);
  }

  // Merge duplicate productIds in payload
  const merged = new Map<string, number>();
  for (const item of rawItems) {
    const pid = sanitizeText((item as RequestedOrderItem).productId, 80);
    const qty = parsePositiveInt((item as RequestedOrderItem).quantity, 0);
    if (!pid || qty <= 0 || qty > 99) {
      return errorResponse('Invalid item quantity in cart.', 400);
    }
    merged.set(pid, (merged.get(pid) ?? 0) + qty);
  }

  const settings = await env.DB.prepare(
    'SELECT delivery_charge_pkr, free_delivery_threshold_pkr FROM store_settings WHERE id = 1'
  ).first<{ delivery_charge_pkr: number; free_delivery_threshold_pkr: number }>();

  const deliveryCharge = settings?.delivery_charge_pkr ?? 250;
  const freeThreshold = settings?.free_delivery_threshold_pkr ?? 5000;

  // Verify product prices & availability exclusively from D1
  const verifiedItems: Array<{
    productId: string;
    sku: string;
    name: string;
    unitPricePkr: number;
    originalPricePkr: number;
    quantity: number;
    lineTotalPkr: number;
    imageUrl: string;
  }> = [];

  for (const [productId, quantity] of merged.entries()) {
    const product = await env.DB.prepare(
      `SELECT p.id, p.sku, p.name, p.regular_price_pkr, p.discount_price_pkr, p.stock_quantity, p.is_available,
              (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) AS primary_image
       FROM products p
       WHERE p.id = ?
       LIMIT 1`
    )
      .bind(productId)
      .first<{
        id: string;
        sku: string;
        name: string;
        regular_price_pkr: number;
        discount_price_pkr: number | null;
        stock_quantity: number;
        is_available: number;
        primary_image: string | null;
      }>();

    if (!product || !product.is_available) {
      return errorResponse(`Product "${product?.name ?? productId}" is currently unavailable.`, 409);
    }
    if (product.stock_quantity < quantity) {
      return errorResponse(
        `Insufficient stock for "${product.name}". Only ${product.stock_quantity} remaining.`,
        409
      );
    }

    const effectivePrice =
      product.discount_price_pkr &&
      product.discount_price_pkr > 0 &&
      product.discount_price_pkr < product.regular_price_pkr
        ? product.discount_price_pkr
        : product.regular_price_pkr;

    verifiedItems.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unitPricePkr: effectivePrice,
      originalPricePkr: product.regular_price_pkr,
      quantity,
      lineTotalPkr: effectivePrice * quantity,
      imageUrl: product.primary_image || '/images/img_cat_electronics.jpg'
    });
  }

  // Atomic conditional stock decrement with rollback if any concurrent order depletes stock
  const decremented: Array<{ productId: string; quantity: number }> = [];
  for (const item of verifiedItems) {
    const res = await env.DB.prepare(
      'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ? AND is_available = 1 AND stock_quantity >= ?'
    )
      .bind(item.quantity, Date.now(), item.productId, item.quantity)
      .run();

    if ((res.meta?.changes ?? 0) === 0) {
      for (const prev of decremented) {
        await env.DB.prepare(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?'
        )
          .bind(prev.quantity, prev.productId)
          .run();
      }
      return errorResponse(
        `Sorry, "${item.name}" just went out of stock. Please update your cart.`,
        409
      );
    }
    decremented.push({ productId: item.productId, quantity: item.quantity });
  }

  const subtotalPkr = verifiedItems.reduce((sum, i) => sum + i.lineTotalPkr, 0);
  const discountTotalPkr = verifiedItems.reduce(
    (sum, i) => sum + Math.max(0, i.originalPricePkr - i.unitPricePkr) * i.quantity,
    0
  );
  const deliveryFeePkr = subtotalPkr >= freeThreshold ? 0 : deliveryCharge;
  const totalPkr = subtotalPkr + deliveryFeePkr;

  const orderNumber = generateOrderNumber();
  const now = Date.now();

  try {
    const statements = [
      env.DB.prepare(
        `INSERT INTO orders (
          order_number, idempotency_key, customer_name, mobile_number, city,
          delivery_address, order_notes, subtotal_pkr, delivery_fee_pkr,
          discount_total_pkr, total_pkr, payment_method, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CASH ON DELIVERY', 'PENDING', ?, ?)`
      ).bind(
        orderNumber,
        idempotencyKey,
        customerName,
        mobileNumber,
        city,
        deliveryAddress,
        orderNotes,
        subtotalPkr,
        deliveryFeePkr,
        discountTotalPkr,
        totalPkr,
        now,
        now
      ),
      ...verifiedItems.map((item) =>
        env.DB.prepare(
          `INSERT INTO order_items (
            order_number, product_id, sku, product_name, unit_price_pkr,
            original_price_pkr, quantity, line_total_pkr, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          orderNumber,
          item.productId,
          item.sku,
          item.name,
          item.unitPricePkr,
          item.originalPricePkr,
          item.quantity,
          item.lineTotalPkr,
          item.imageUrl
        )
      ),
      env.DB.prepare(
        'INSERT INTO order_status_history (order_number, status, note, created_at) VALUES (?, ?, ?, ?)'
      ).bind(orderNumber, 'PENDING', 'Order placed via Cash on Delivery.', now)
    ];

    await env.DB.batch(statements);
  } catch (err) {
    // Restore decremented stock on DB failure
    for (const prev of decremented) {
      await env.DB.prepare(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?'
      )
        .bind(prev.quantity, prev.productId)
        .run();
    }
    return errorResponse('Failed to save order. Please try again.', 500);
  }

  return jsonResponse(
    {
      order: {
        order_number: orderNumber,
        customer_name: customerName,
        mobile_number: mobileNumber,
        city,
        delivery_address: deliveryAddress,
        subtotal_pkr: subtotalPkr,
        delivery_fee_pkr: deliveryFeePkr,
        discount_total_pkr: discountTotalPkr,
        total_pkr: totalPkr,
        payment_method: 'CASH ON DELIVERY',
        status: 'PENDING',
        created_at: now
      },
      items: verifiedItems
    },
    201
  );
}
