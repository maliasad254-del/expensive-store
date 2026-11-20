import {
  AdminAnalytics,
  Category,
  OrderItemSnapshot,
  OrderRecord,
  OrderStatus,
  PriceAlertSubscription,
  PriceDropNotification,
  Product,
  ProductReviewStats,
  Review,
  ReviewModerationStatus,
  StoreSettings,
  TrackedOrder
} from '../types/store';

let csrfTokenMemory = '';

export function setCsrfToken(token: string) {
  csrfTokenMemory = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (csrfTokenMemory && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    headers.set('X-CSRF-Token', csrfTokenMemory);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getStorefront: () =>
    apiFetch<{
      settings: StoreSettings;
      categories: Category[];
      products: Product[];
      reviews: Review[];
    }>('/api/storefront'),

  listProducts: (params: { q?: string; category?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category) sp.set('category', params.category);
    if (params.sort) sp.set('sort', params.sort);
    return apiFetch<{ products: Product[] }>(`/api/products?${sp.toString()}`);
  },

  getProduct: (slugOrId: string) =>
    apiFetch<{
      product: Product;
      related: Product[];
      reviews: Review[];
      reviewStats: ProductReviewStats;
    }>(`/api/products/${encodeURIComponent(slugOrId)}`),

  submitProductReview: (
    productId: string,
    payload: {
      orderNumber: string;
      mobileNumber: string;
      rating: number;
      comment: string;
    }
  ) =>
    apiFetch<{ ok: boolean; review: Review }>(
      `/api/products/${encodeURIComponent(productId)}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    ),

  placeCodOrder: (payload: {
    customerName: string;
    mobileNumber: string;
    city: string;
    deliveryAddress: string;
    orderNotes: string;
    idempotencyKey: string;
    items: Array<{ productId: string; quantity: number }>;
  }) =>
    apiFetch<{ order: OrderRecord; items: OrderItemSnapshot[] }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  trackOrder: (orderNumber: string, mobileNumber: string) =>
    apiFetch<{ tracking: TrackedOrder }>('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, mobileNumber })
    }),

  cancelOrder: (orderNumber: string, mobileNumber: string) =>
    apiFetch<{ ok: boolean; status: OrderStatus }>('/api/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, mobileNumber })
    }),

  subscribePriceDrop: (productId: string, email: string) =>
    apiFetch<{
      ok: boolean;
      subscription: {
        productId: string;
        productName: string;
        email: string;
        subscribedPricePkr: number;
      };
    }>('/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({ productId, email })
    }),

  // Admin Auth
  getAdminSetupStatus: () => apiFetch<{ initialized: boolean }>('/api/admin/setup-status'),
  setupFirstAdmin: (username: string, password: string) =>
    apiFetch<{ admin: { id: string; username: string }; csrfToken: string }>('/api/admin/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  loginAdmin: (username: string, password: string) =>
    apiFetch<{ admin: { id: string; username: string }; csrfToken: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  logoutAdmin: () => apiFetch<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),
  getAdminMe: () =>
    apiFetch<{ admin: { id: string; username: string; role: string }; csrfToken: string }>(
      '/api/admin/me'
    ),

  // Admin CRUD
  getAdminAnalytics: () => apiFetch<AdminAnalytics>('/api/admin/analytics'),
  saveCategory: (payload: Partial<Category>) =>
    apiFetch<{ id: string }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteCategory: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  saveProduct: (payload: Record<string, unknown>) =>
    apiFetch<{ id: string; priceAlertsTriggered?: number }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteProduct: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  uploadProductImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch<{ url: string; key: string }>('/api/admin/upload', {
      method: 'POST',
      body: fd
    });
  },
  listAdminOrders: (q = '', status = '') => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    return apiFetch<{ orders: OrderRecord[] }>(`/api/admin/orders?${sp.toString()}`);
  },
  getAdminOrder: (orderNumber: string) =>
    apiFetch<{
      order: OrderRecord;
      items: OrderItemSnapshot[];
      history: Array<{ id: number; status: OrderStatus; note: string; created_at: number }>;
    }>(`/api/admin/orders/${encodeURIComponent(orderNumber)}`),
  updateOrderStatus: (orderNumber: string, status: OrderStatus, note: string) =>
    apiFetch<{ ok: boolean }>(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
      }
    ),
  saveSettings: (settings: StoreSettings) =>
    apiFetch<{ ok: boolean }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
  listAdminReviews: (status = '') => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    const qs = sp.toString();
    return apiFetch<{ reviews: Review[] }>(`/api/admin/reviews${qs ? `?${qs}` : ''}`);
  },
  moderateReview: (id: string, status: Exclude<ReviewModerationStatus, 'PENDING'>) =>
    apiFetch<{ ok: boolean; id: string; moderation_status: ReviewModerationStatus }>(
      `/api/admin/reviews/${encodeURIComponent(id)}/moderate`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }
    ),
  addReview: (payload: { customer_name: string; city: string; rating: number; comment: string }) =>
    apiFetch<{ id: string }>('/api/admin/reviews', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteReview: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/reviews/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  getAdminPriceAlerts: () =>
    apiFetch<{
      subscriptions: PriceAlertSubscription[];
      notifications: PriceDropNotification[];
    }>('/api/admin/price-alerts'),
  markPriceAlertSent: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/price-alerts/${encodeURIComponent(id)}/sent`, {
      method: 'PATCH'
    })
};
