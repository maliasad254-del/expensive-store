import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, RefreshCw, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { formatPkr } from '../lib/pkr';
import {
  getSavedOrders,
  SavedOrder,
  updateSavedOrderStatus
} from '../lib/myOrders';

async function refreshSavedOrders(orders: SavedOrder[]): Promise<SavedOrder[]> {
  return Promise.all(
    orders.map(async (entry) => {
      try {
        const response = await api.trackOrder(
          entry.order.order_number,
          entry.order.mobile_number
        );

        const tracking = response.tracking;
        updateSavedOrderStatus(
          entry.order.order_number,
          tracking.status,
          tracking.updated_at
        );

        return {
          ...entry,
          order: {
            ...entry.order,
            status: tracking.status,
            updated_at: tracking.updated_at
          }
        };
      } catch {
        return entry;
      }
    })
  );
}

export function MyOrdersPage() {
  const [orders, setOrders] = useState<SavedOrder[]>(() => getSavedOrders());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const latestOrders = await refreshSavedOrders(getSavedOrders());
    setOrders(latestOrders);
    setRefreshing(false);
  };

  useEffect(() => {
    let active = true;

    const loadLatestOrders = async () => {
      setRefreshing(true);
      const latestOrders = await refreshSavedOrders(getSavedOrders());

      if (active) {
        setOrders(latestOrders);
        setRefreshing(false);
      }
    };

    void loadLatestOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Apne tamam saved orders aur unka latest status dekhein.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || orders.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Orders
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-400" />
          <h2 className="text-xl font-bold text-navy">Abhi koi saved order nahi hai</h2>
          <p className="text-sm text-gray-500">
            Is browser se place kiye gaye naye orders yahan nazar aayenge.
          </p>
          <Link
            to="/shop"
            className="inline-flex rounded-xl bg-orange-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(({ order, items }) => {
            const trackUrl = `/track-order?order=${encodeURIComponent(
              order.order_number
            )}&mobile=${encodeURIComponent(order.mobile_number)}`;

            return (
              <article
                key={order.order_number}
                className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-gray-500">Order ID</p>
                    <h2 className="font-bold text-navy">{order.order_number}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at * 1000).toLocaleString()}
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-navy">
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="text-gray-600">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-medium text-navy whitespace-nowrap">
                        {formatPkr(item.line_total_pkr)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-lg font-bold text-navy">
                      {formatPkr(order.total_pkr)}
                    </p>
                  </div>

                  <Link
                    to={trackUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Package className="w-4 h-4" />
                    Track Order
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">
        My Orders sirf isi browser aur device mein saved orders dikhata hai.
      </p>
    </div>
  );
}
