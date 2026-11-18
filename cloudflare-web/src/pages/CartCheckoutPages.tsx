import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Minus, Plus, Search, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { api } from '../lib/api';
import { buildWhatsAppUrl, formatPkr, normalizePakistanMobileClient } from '../lib/pkr';
import { OrderItemSnapshot, OrderRecord, TrackedOrder } from '../types/store';

export function CartPage() {
  const { settings } = useStore();
  const { hydratedItems, subtotalPkr, totalSavingsPkr, deliveryFeePkr, finalTotalPkr, updateQuantity, removeItem } = useCart();

  if (hydratedItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-navy">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">Your cart is empty</h1>
        <p className="text-sm text-gray-500">Add products to your cart to place a Cash on Delivery order.</p>
        <Link to="/shop" className="inline-block px-6 py-3 rounded-xl bg-orange-accent text-white font-semibold text-sm">
          Explore Catalog
        </Link>
      </div>
    );
  }

  const freeThreshold = settings?.free_delivery_threshold_pkr ?? 5000;
  const remainingForFree = Math.max(0, freeThreshold - subtotalPkr);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-navy">Shopping Cart</h1>

      <div className="rounded-xl bg-orange-soft border border-orange-accent/25 p-4 text-sm text-navy">
        {remainingForFree === 0
          ? 'You unlocked FREE nationwide delivery!'
          : `Add ${formatPkr(remainingForFree)} more for FREE nationwide delivery.`}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {hydratedItems.map((item) => (
            <div key={item.product.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 items-center">
              <img
                src={item.product.images[0] || '/images/img_cat_electronics.jpg'}
                alt={item.product.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-navy truncate">{item.product.name}</h2>
                <div className="text-xs text-gray-400">SKU: {item.product.sku}</div>
                <div className="font-bold text-navy mt-1">{formatPkr(item.lineTotalPkr)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-1.5 hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1.5 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.product.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit space-y-4">
          <h2 className="font-display text-xl font-bold text-navy">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-navy">{formatPkr(subtotalPkr)}</span>
            </div>
            {totalSavingsPkr > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts</span>
                <span>-{formatPkr(totalSavingsPkr)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Charges</span>
              <span className="font-medium text-navy">{deliveryFeePkr === 0 ? 'FREE' : formatPkr(deliveryFeePkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">COD Handling Fee</span>
              <span className="font-medium text-emerald-600">Rs. 0</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-navy">
              <span>Payable (COD)</span>
              <span>{formatPkr(finalTotalPkr)}</span>
            </div>
          </div>
          <p className="text-xs text-emerald-700 text-center">
            No extra COD fee or hidden charges.
          </p>
          <Link
            to="/checkout"
            className="block w-full text-center px-6 py-3.5 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { hydratedItems, subtotalPkr, deliveryFeePkr, finalTotalPkr, clearCart } = useCart();
  const { refreshStorefront } = useStore();
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [city, setCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), [hydratedItems.length, finalTotalPkr]);

  if (hydratedItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-navy">Your cart is empty</h1>
        <Link to="/shop" className="inline-block px-6 py-3 rounded-xl bg-navy text-white font-semibold text-sm">
          Return to Shop
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePakistanMobileClient(mobileNumber);
    if (!normalized) {
      setError('Please enter a valid Pakistani mobile number (e.g. 03001234567).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.placeCodOrder({
        customerName,
        mobileNumber: normalized,
        city,
        deliveryAddress,
        orderNotes,
        idempotencyKey,
        items: hydratedItems.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
      });
      clearCart();
      await refreshStorefront();
      navigate(`/order-confirmation/${encodeURIComponent(res.order.order_number)}`, {
        state: { order: res.order, items: res.items }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-navy">Cash on Delivery Checkout</h1>

      <div className="rounded-2xl bg-orange-soft border border-orange-accent/30 p-4 flex items-center gap-3 text-sm text-navy">
        <Truck className="w-5 h-5 text-orange-accent shrink-0" />
        <span>
          <strong>CASH ON DELIVERY ONLY:</strong> No card or online payment required. Pay in PKR upon delivery.
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Pakistani Mobile Number *</label>
            <input
              type="tel"
              required
              placeholder="03001234567"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">City *</label>
            <input
              type="text"
              required
              placeholder="Karachi, Lahore, Islamabad..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Complete Delivery Address *</label>
            <textarea
              required
              rows={3}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1">Order Notes (Optional)</label>
            <textarea
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit space-y-4">
          <h2 className="font-display text-xl font-bold text-navy">Order Summary</h2>
          <div className="space-y-2 text-sm border-b border-gray-200 pb-3">
            {hydratedItems.map((item) => (
              <div key={item.product.id} className="flex justify-between gap-2">
                <span className="text-gray-600">{item.product.name} × {item.quantity}</span>
                <span className="font-medium text-navy shrink-0">{formatPkr(item.lineTotalPkr)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPkr(subtotalPkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span>{deliveryFeePkr === 0 ? 'FREE' : formatPkr(deliveryFeePkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">COD Handling Fee</span>
              <span className="font-medium text-emerald-600">Rs. 0</span>
            </div>
            <div className="flex justify-between text-base font-bold text-navy pt-2 border-t border-gray-200">
              <span>Payable (COD)</span>
              <span>{formatPkr(finalTotalPkr)}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-700 text-center">
            No extra COD fee or hidden charges.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-navy hover:bg-navy-light text-white font-bold text-sm disabled:opacity-60"
          >
            {submitting ? 'Placing Order...' : 'PLACE ORDER — CASH ON DELIVERY'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const { settings } = useStore();
  const state = location.state as { order?: OrderRecord; items?: OrderItemSnapshot[] } | null;
  const order = state?.order;
  const items = state?.items || [];

  const waUrl =
    settings?.whatsapp_number && order
      ? buildWhatsAppUrl(
          settings.whatsapp_number,
          `Assalam-o-Alaikum ${settings.store_name}, I placed COD Order #${order.order_number} for ${formatPkr(order.total_pkr)} (${order.city}).`
        )
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-9 h-9" />
      </div>
      <h1 className="font-display text-3xl font-bold text-navy">Order Confirmed!</h1>
      <p className="text-orange-accent font-semibold">Order Number: {order?.order_number || orderNumber}</p>

      {order && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-semibold">{order.customer_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Mobile</span><span className="font-semibold">{order.mobile_number}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-semibold">{order.city}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-semibold">{order.payment_method}</span></div>
          <div className="border-t border-gray-200 pt-3 space-y-1.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.product_name} × {item.quantity}</span>
                <span>{formatPkr(item.line_total_pkr)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatPkr(order.subtotal_pkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Charges</span>
              <span>{order.delivery_fee_pkr === 0 ? 'FREE' : formatPkr(order.delivery_fee_pkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">COD Handling Fee</span>
              <span className="font-medium text-emerald-600">Rs. 0</span>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-base text-navy">
            <span>Total Payable (COD)</span>
            <span>{formatPkr(order.total_pkr)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Confirm on WhatsApp
          </a>
        )}
        <Link to="/track-order" className="px-5 py-3 rounded-xl border border-gray-300 font-semibold text-sm text-navy">
          Track Order
        </Link>
        <Link to="/shop" className="px-5 py-3 rounded-xl bg-navy text-white font-semibold text-sm">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [tracking, setTracking] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.trackOrder(orderNumber, mobileNumber);
      setTracking(res.tracking);
    } catch (err) {
      setTracking(null);
      setError(err instanceof Error ? err.message : 'Unable to track order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h1 className="font-display text-2xl font-bold text-navy">Track Your Order</h1>
        <p className="text-sm text-gray-500">
          Enter your Order ID and registered Pakistani mobile number. Customer personal details remain private.
        </p>

        <form onSubmit={handleTrack} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Order ID (e.g. EXP-20261115-1234)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <input
            type="tel"
            required
            placeholder="Registered Mobile (03001234567)"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Checking...' : 'Track Order'}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {tracking && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-lg text-navy">{tracking.order_number}</span>
            <span className="px-3 py-1 rounded-full bg-orange-soft text-orange-accent text-xs font-bold">
              {tracking.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div>City: <strong className="text-navy">{tracking.city}</strong></div>
            <div>Items: <strong className="text-navy">{tracking.item_count}</strong></div>
            <div>Payment: <strong className="text-navy">{tracking.payment_method}</strong></div>
            <div>Total: <strong className="text-navy">{formatPkr(tracking.total_pkr)}</strong></div>
          </div>
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h2 className="text-sm font-semibold text-navy">Status Timeline</h2>
            {tracking.history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <Truck className="w-4 h-4 text-orange-accent mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-navy">{h.status}</div>
                  <div className="text-gray-500 text-xs">{h.note}</div>
                  <div className="text-gray-400 text-[11px]">{new Date(h.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
