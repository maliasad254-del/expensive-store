import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { api, setCsrfToken } from '../lib/api';
import { formatPkr } from '../lib/pkr';
import {
  AdminAnalytics,
  OrderItemSnapshot,
  OrderRecord,
  OrderStatus,
  PriceAlertSubscription,
  PriceDropNotification,
  Product,
  Review,
  ReviewModerationStatus,
  StoreSettings
} from '../types/store';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getAdminMe()
      .then((res) => {
        setCsrfToken(res.csrfToken);
        navigate('/admin', { replace: true });
      })
      .catch(() => {
        api.getAdminSetupStatus()
          .then((s) => setInitialized(s.initialized))
          .catch(() => setInitialized(true));
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (initialized === false && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res =
        initialized === false
          ? await api.setupFirstAdmin(username, password)
          : await api.loginAdmin(username, password);
      setCsrfToken(res.csrfToken);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  if (initialized === null) {
    return <div className="max-w-md mx-auto py-16 text-center text-gray-500">Checking admin session...</div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            {initialized ? 'Admin Login' : 'First-Time Admin Setup'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {initialized
              ? 'Secured with PBKDF2-SHA256, HttpOnly session cookies, and rate limiting.'
              : 'Create your primary store administrator account (password min 8 chars).'}
          </p>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          {!initialized && (
            <input
              type="password"
              required
              minLength={8}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-orange-accent hover:bg-orange-hover text-white font-semibold text-sm"
          >
            {loading ? 'Please wait...' : initialized ? 'Sign In' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { settings, categories, products, reviews, refreshStorefront } = useStore();
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<
    'analytics' | 'products' | 'categories' | 'orders' | 'reviews' | 'alerts' | 'settings'
  >('analytics');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'' | ReviewModerationStatus>('');
  const [alertSubscriptions, setAlertSubscriptions] = useState<PriceAlertSubscription[]>([]);
  const [alertNotifications, setAlertNotifications] = useState<PriceDropNotification[]>([]);
  const [priceAlertNotice, setPriceAlertNotice] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{
    order: OrderRecord;
    items: OrderItemSnapshot[];
  } | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [orderStatusNotice, setOrderStatusNotice] = useState<string | null>(null);

  // Product Form
  const [editingProd, setEditingProd] = useState<Partial<Product> | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Settings Form
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings | null>(null);
  const [revName, setRevName] = useState('');
  const [revCity, setRevCity] = useState('');
  const [revComment, setRevComment] = useState('');

  const loadAdminData = async () => {
    const [an, ord, alerts, revRes] = await Promise.all([
      api.getAdminAnalytics(),
      api.listAdminOrders(orderSearch, orderStatusFilter),
      api.getAdminPriceAlerts(),
      api.listAdminReviews()
    ]);
    setAnalytics(an);
    setOrders(ord.orders);
    setAlertSubscriptions(alerts.subscriptions);
    setAlertNotifications(alerts.notifications);
    setAdminReviews(revRes.reviews);
  };

  useEffect(() => {
    api.getAdminMe()
      .then((res) => {
        setCsrfToken(res.csrfToken);
        setAuthorized(true);
        loadAdminData();
      })
      .catch(() => navigate('/admin/login', { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (settings) setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (authorized) {
      api.listAdminOrders(orderSearch, orderStatusFilter).then((r) => setOrders(r.orders));
    }
  }, [orderSearch, orderStatusFilter, authorized]);

  if (!authorized) {
    return <div className="max-w-4xl mx-auto py-16 text-center text-gray-500">Verifying admin session...</div>;
  }

  const handleLogout = async () => {
    await api.logoutAdmin();
    setCsrfToken('');
    navigate('/admin/login');
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || !editingProd) return;
    setUploadingImage(true);
    try {
      const urls: string[] = [...(editingProd.images || [])];
      for (const file of Array.from(files)) {
        const res = await api.uploadProductImage(file);
        urls.push(res.url);
      }
      setEditingProd({ ...editingProd, images: urls });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProd) return;
    const res = await api.saveProduct(editingProd as Record<string, unknown>);
    if (res.priceAlertsTriggered && res.priceAlertsTriggered > 0) {
      setPriceAlertNotice(
        `Price drop detected: ${res.priceAlertsTriggered} subscriber alert(s) triggered. Review them in the Price Alerts tab.`
      );
    } else {
      setPriceAlertNotice(null);
    }
    setEditingProd(null);
    await refreshStorefront();
    await loadAdminData();
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await api.saveCategory({ name: catName, description: catDesc, is_featured: 1 });
    setCatName('');
    setCatDesc('');
    await refreshStorefront();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    await api.saveSettings(settingsDraft);
    await refreshStorefront();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Manage products, R2 images, COD orders, analytics & store settings</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-navy hover:bg-gray-50"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {priceAlertNotice && (
        <div className="rounded-xl bg-orange-soft border border-orange-accent/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-navy">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-orange-accent shrink-0" />
            <span>{priceAlertNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setTab('alerts')}
            className="px-3 py-1 rounded-lg bg-navy text-white text-xs font-semibold"
          >
            View Price Alerts
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['analytics', 'products', 'categories', 'orders', 'reviews', 'alerts', 'settings'] as const).map((t) => {
          const pendingAlertCount = alertNotifications.filter((n) => n.delivery_status === 'PENDING').length;
          const pendingReviewCount = adminReviews.filter((r) => r.moderation_status === 'PENDING').length;
          const badgeCount =
            t === 'alerts' ? pendingAlertCount : t === 'reviews' ? pendingReviewCount : 0;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize shrink-0 inline-flex items-center gap-1.5 ${
                tab === t ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {t === 'alerts' ? 'Price Alerts' : t}
              {badgeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-orange-accent text-white text-[11px] leading-none">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Analytics */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatBox label="Total Sales" value={formatPkr(analytics.summary.total_sales_pkr)} />
            <StatBox label="Total Orders" value={String(analytics.summary.total_orders)} />
            <StatBox label="Pending" value={String(analytics.summary.pending_orders)} />
            <StatBox label="Delivered" value={String(analytics.summary.delivered_orders)} />
            <StatBox label="Cancelled" value={String(analytics.summary.cancelled_orders)} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-display font-bold text-lg text-navy mb-3">Best-Selling Products</h2>
            {analytics.bestSellers.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {analytics.bestSellers.map((b) => (
                  <div key={b.product_id} className="flex justify-between border-b border-gray-100 pb-2">
                    <span>{b.product_name} ({b.units_sold} sold)</span>
                    <span className="font-semibold text-navy">{formatPkr(b.revenue_pkr)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              setEditingProd({
                name: '',
                sku: '',
                category_id: categories[0]?.id || '',
                regular_price_pkr: 0,
                discount_price_pkr: null,
                stock_quantity: 10,
                description: '',
                specifications: '',
                is_available: true,
                is_featured: true,
                is_on_sale: false,
                is_best_seller: false,
                is_new_arrival: true,
                images: []
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-accent text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>

          {editingProd && (
            <form onSubmit={handleSaveProduct} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="font-bold text-navy">{editingProd.id ? 'Edit Product' : 'New Product'}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Product Name"
                  value={editingProd.name || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  placeholder="SKU"
                  value={editingProd.sku || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, sku: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <select
                  value={editingProd.category_id || ''}
                  onChange={(e) => setEditingProd({ ...editingProd, category_id: e.target.value })}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  required
                  placeholder="Stock Quantity"
                  value={editingProd.stock_quantity ?? 0}
                  onChange={(e) => setEditingProd({ ...editingProd, stock_quantity: Number(e.target.value) })}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  required
                  placeholder="Regular Price (PKR)"
                  value={editingProd.regular_price_pkr ?? ''}
                  onChange={(e) => setEditingProd({ ...editingProd, regular_price_pkr: Number(e.target.value) })}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Discount Price (PKR, optional)"
                  value={editingProd.discount_price_pkr ?? ''}
                  onChange={(e) =>
                    setEditingProd({
                      ...editingProd,
                      discount_price_pkr: e.target.value ? Number(e.target.value) : null
                    })
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                placeholder="Description"
                rows={2}
                value={editingProd.description || ''}
                onChange={(e) => setEditingProd({ ...editingProd, description: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Specifications"
                rows={2}
                value={editingProd.specifications || ''}
                onChange={(e) => setEditingProd({ ...editingProd, specifications: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Uploading to R2...' : 'Upload Product Images (R2)'}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(e) => handleUploadFiles(e.target.files)}
                    className="hidden"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(editingProd.images || []).map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(editingProd.is_available)} onChange={(e) => setEditingProd({ ...editingProd, is_available: e.target.checked })} />
                  Available
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(editingProd.is_featured)} onChange={(e) => setEditingProd({ ...editingProd, is_featured: e.target.checked })} />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(editingProd.is_best_seller)} onChange={(e) => setEditingProd({ ...editingProd, is_best_seller: e.target.checked })} />
                  Best Seller
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(editingProd.is_new_arrival)} onChange={(e) => setEditingProd({ ...editingProd, is_new_arrival: e.target.checked })} />
                  New Arrival
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 rounded-xl bg-navy text-white text-sm font-semibold">Save Product</button>
                <button type="button" onClick={() => setEditingProd(null)} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <img src={p.images[0] || '/images/img_cat_electronics.jpg'} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{formatPkr(p.regular_price_pkr)} • Stock: {p.stock_quantity}</div>
                </div>
                <button type="button" onClick={() => setEditingProd(p)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border">Edit</button>
                <button
                  type="button"
                  onClick={async () => {
                    await api.deleteProduct(p.id);
                    await refreshStorefront();
                  }}
                  className="p-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveCategory} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3">
            <input required placeholder="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm flex-1" />
            <input placeholder="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="rounded-xl border px-3 py-2 text-sm flex-1" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-orange-accent text-white text-sm font-semibold">Add Category</button>
          </form>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-navy">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.description}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.deleteCategory(c.id);
                    await refreshStorefront();
                  }}
                  className="text-red-600 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Search order #, customer, phone, city..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm flex-1 min-w-[220px]"
            />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm bg-white"
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.order_number}
                onClick={async () => {
                  const detail = await api.getAdminOrder(o.order_number);
                  setSelectedOrder({ order: detail.order, items: detail.items });
                }}
                className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap justify-between items-center gap-3 cursor-pointer hover:border-navy"
              >
                <div>
                  <div className="font-bold text-navy">{o.order_number}</div>
                  <div className="text-xs text-gray-500">{o.customer_name} • {o.mobile_number} • {o.city}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-navy">{formatPkr(o.total_pkr)}</div>
                  <span className="text-xs font-bold text-orange-accent">{o.status}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedOrder && (
            <div className="bg-white rounded-2xl border-2 border-navy p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-navy">Manage {selectedOrder.order.order_number}</h3>
                <button type="button" onClick={() => setSelectedOrder(null)} className="text-sm text-gray-500">Close</button>
              </div>
              <p className="text-sm text-gray-600">
                {selectedOrder.order.customer_name} • {selectedOrder.order.mobile_number} • {selectedOrder.order.delivery_address}, {selectedOrder.order.city}
              </p>
              <div className="border-t pt-2 space-y-1 text-sm">
                {selectedOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.product_name} × {it.quantity}</span>
                    <span>{formatPkr(it.line_total_pkr)}</span>
                  </div>
                ))}
              </div>
              <input
                placeholder="Status note (optional)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              {orderStatusNotice && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-navy">
                  {orderStatusNotice}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={updatingOrderStatus || selectedOrder.order.status === st || ['CANCELLED', 'DELIVERED'].includes(selectedOrder.order.status)}
                    onClick={async () => {
                      if (updatingOrderStatus || selectedOrder.order.status === st) return;
                      setUpdatingOrderStatus(true);
                      setOrderStatusNotice(null);
                      try {
                        await api.updateOrderStatus(selectedOrder.order.order_number, st, statusNote);
                        setStatusNote('');
                        await loadAdminData();
                        const detail = await api.getAdminOrder(selectedOrder.order.order_number);
                        setSelectedOrder({ order: detail.order, items: detail.items });
                        setOrderStatusNotice(`Order status successfully updated to ${detail.order.status}.`);
                      } catch (err) {
                        setOrderStatusNotice(err instanceof Error ? err.message : 'Status update failed. Please try again.');
                      } finally {
                        setUpdatingOrderStatus(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedOrder.order.status === st
                        ? 'bg-navy text-white'
                        : st === 'CANCELLED'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-navy'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews Moderation */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-navy">Moderate Customer Reviews</h2>
              <p className="text-xs text-gray-500">
                Approve, reject, or delete customer reviews submitted from product detail pages.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st || 'ALL'}
                  type="button"
                  onClick={() => setReviewStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    reviewStatusFilter === st
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {st || 'ALL'}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const visibleReviews = adminReviews.filter(
              (r) => !reviewStatusFilter || (r.moderation_status || 'APPROVED') === reviewStatusFilter
            );
            if (visibleReviews.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-500">
                  No reviews match this moderation filter.
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {visibleReviews.map((rev) => {
                  const status = rev.moderation_status || (rev.is_approved === false ? 'PENDING' : 'APPROVED');
                  return (
                    <div
                      key={rev.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-navy">{rev.customer_name}</span>
                            {rev.city && <span className="text-xs text-gray-500">({rev.city})</span>}
                            {rev.verified_purchase && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verified Purchase{rev.order_number ? ` • ${rev.order_number}` : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {rev.product_name ? `Product: ${rev.product_name}` : 'General Store Review'} •{' '}
                            {new Date(rev.created_at).toLocaleString('en-PK')}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : status === 'REJECTED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-orange-soft text-orange-accent'
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rev.rating
                                ? 'fill-orange-accent text-orange-accent'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>

                      <p className="text-sm text-gray-700">"{rev.comment}"</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {status !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.moderateReview(rev.id, 'APPROVED');
                              await loadAdminData();
                              await refreshStorefront();
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.moderateReview(rev.id, 'REJECTED');
                              await loadAdminData();
                              await refreshStorefront();
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await api.deleteReview(rev.id);
                            await loadAdminData();
                            await refreshStorefront();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Price Alerts */}
      {tab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-navy">Triggered Price Drop Alerts</h2>
              <span className="text-xs text-gray-500">{alertNotifications.length} alerts</span>
            </div>
            {alertNotifications.length === 0 ? (
              <p className="text-sm text-gray-500">
                No price-drop alerts triggered yet. Lowering a product price automatically queues notifications here (and dispatches via EMAIL_WEBHOOK_URL if configured).
              </p>
            ) : (
              <div className="space-y-3">
                {alertNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-navy">{n.product_name}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Subscriber: <span className="font-medium text-navy">{n.email}</span> • Dropped{' '}
                        <span className="line-through text-gray-400">{formatPkr(n.old_price_pkr)}</span>{' '}
                        → <span className="font-bold text-emerald-700">{formatPkr(n.new_price_pkr)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          n.delivery_status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-orange-soft text-orange-accent'
                        }`}
                      >
                        {n.delivery_status}
                      </span>
                      <a
                        href={`mailto:${encodeURIComponent(n.email)}?subject=${encodeURIComponent(
                          `Price Drop Alert: ${n.product_name}`
                        )}&body=${encodeURIComponent(
                          `Good news! ${n.product_name} dropped from ${formatPkr(n.old_price_pkr)} to ${formatPkr(n.new_price_pkr)} at Expensive Store (Cash on Delivery).`
                        )}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-navy hover:bg-gray-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </a>
                      {n.delivery_status !== 'SENT' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.markPriceAlertSent(n.id);
                            await loadAdminData();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Sent
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-navy">All Price Drop Subscribers</h2>
              <span className="text-xs text-gray-500">{alertSubscriptions.length} subscriptions</span>
            </div>
            {alertSubscriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No customers subscribed to price drop alerts yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {alertSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5"
                  >
                    <div>
                      <div className="font-semibold text-navy">{sub.email}</div>
                      <div className="text-xs text-gray-500">
                        {sub.product_name} (ID: {sub.product_id}) • Tracked at {formatPkr(sub.subscribed_price_pkr)}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        sub.status === 'ACTIVE'
                          ? 'bg-blue-50 text-navy'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings & Reviews */}
      {tab === 'settings' && settingsDraft && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-display font-bold text-lg text-navy">Store Settings & Content</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <input placeholder="Store Name" value={settingsDraft.store_name} onChange={(e) => setSettingsDraft({ ...settingsDraft, store_name: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Tagline" value={settingsDraft.tagline} onChange={(e) => setSettingsDraft({ ...settingsDraft, tagline: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Hero Title" value={settingsDraft.hero_title} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero_title: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Hero Subtitle" value={settingsDraft.hero_subtitle} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero_subtitle: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Hero Offer Badge" value={settingsDraft.hero_offer_badge} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero_offer_badge: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Promo Title" value={settingsDraft.promo_banner_title} onChange={(e) => setSettingsDraft({ ...settingsDraft, promo_banner_title: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input type="number" placeholder="Delivery Charge PKR" value={settingsDraft.delivery_charge_pkr} onChange={(e) => setSettingsDraft({ ...settingsDraft, delivery_charge_pkr: Number(e.target.value) })} className="rounded-xl border px-3 py-2" />
              <input type="number" placeholder="Free Delivery Threshold PKR" value={settingsDraft.free_delivery_threshold_pkr} onChange={(e) => setSettingsDraft({ ...settingsDraft, free_delivery_threshold_pkr: Number(e.target.value) })} className="rounded-xl border px-3 py-2" />
              <input placeholder="WhatsApp Number (03XXXXXXXXX)" value={settingsDraft.whatsapp_number} onChange={(e) => setSettingsDraft({ ...settingsDraft, whatsapp_number: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Support Phone" value={settingsDraft.support_phone} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_phone: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Support Email" value={settingsDraft.support_email} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_email: e.target.value })} className="rounded-xl border px-3 py-2" />
              <input placeholder="Store Address" value={settingsDraft.store_address} onChange={(e) => setSettingsDraft({ ...settingsDraft, store_address: e.target.value })} className="rounded-xl border px-3 py-2" />
            </div>
            <textarea rows={2} placeholder="About Us" value={settingsDraft.about_us_text} onChange={(e) => setSettingsDraft({ ...settingsDraft, about_us_text: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" />
            <div className="space-y-2">
              <textarea rows={8} placeholder={"Q: Order kaise place karein?\nA: Website par product select karein aur checkout form complete karein.\n\nQ: Kya Cash on Delivery available hai?\nA: Ji haan, Pakistan bhar mein Cash on Delivery available hai."} value={settingsDraft.faq_text} onChange={(e) => setSettingsDraft({ ...settingsDraft, faq_text: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500">Har sawal Q: se aur uska jawab A: se shuru karein. Har sawal aur jawab alag line mein likhein.</p>
            </div>
            <textarea rows={2} placeholder="Privacy Policy" value={settingsDraft.privacy_policy_text} onChange={(e) => setSettingsDraft({ ...settingsDraft, privacy_policy_text: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" />
            <textarea rows={2} placeholder="Return & Refund Policy" value={settingsDraft.return_policy_text} onChange={(e) => setSettingsDraft({ ...settingsDraft, return_policy_text: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" />
            <textarea rows={2} placeholder="Shipping Policy" value={settingsDraft.shipping_policy_text} onChange={(e) => setSettingsDraft({ ...settingsDraft, shipping_policy_text: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" />
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold">Save Settings</button>
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-display font-bold text-lg text-navy">Manage Verified Customer Reviews</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input placeholder="Customer Name" value={revName} onChange={(e) => setRevName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
              <input placeholder="City" value={revCity} onChange={(e) => setRevCity(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" />
              <button
                type="button"
                onClick={async () => {
                  if (!revName || !revComment) return;
                  await api.addReview({ customer_name: revName, city: revCity, rating: 5, comment: revComment });
                  setRevName('');
                  setRevCity('');
                  setRevComment('');
                  await refreshStorefront();
                }}
                className="rounded-xl bg-orange-accent text-white text-sm font-semibold px-4 py-2"
              >
                Add Review
              </button>
            </div>
            <textarea rows={2} placeholder="Genuine review comment" value={revComment} onChange={(e) => setRevComment(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
            {reviews.map((r) => (
              <div key={r.id} className="flex justify-between items-center border-t pt-2 text-sm">
                <div><strong>{r.customer_name}</strong> ({r.city}): {r.comment}</div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.deleteReview(r.id);
                    await refreshStorefront();
                  }}
                  className="text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-display font-bold text-xl text-navy mt-1">{value}</div>
    </div>
  );
}
