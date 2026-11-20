import { OrderItemSnapshot, OrderRecord, OrderStatus } from '../types/store';

const STORAGE_KEY = 'expensive-store-my-orders-v1';

export type SavedOrder = {
  order: Omit<OrderRecord, 'delivery_address' | 'order_notes'>;
  items: OrderItemSnapshot[];
  saved_at: number;
};

export function getSavedOrders(): SavedOrder[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as SavedOrder[] : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: OrderRecord, items: OrderItemSnapshot[]): void {
  if (typeof window === 'undefined') return;

  const { delivery_address, order_notes, ...safeOrder } = order;
  void delivery_address;
  void order_notes;

  const orders = getSavedOrders();
  const updated: SavedOrder = {
    order: safeOrder,
    items,
    saved_at: Date.now()
  };

  const next = [
    updated,
    ...orders.filter((entry) => entry.order.order_number !== order.order_number)
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep checkout successful even if browser storage is unavailable.
  }
}

export function updateSavedOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  updatedAt: number
): void {
  if (typeof window === 'undefined') return;

  const orders = getSavedOrders();
  const next = orders.map((entry) =>
    entry.order.order_number === orderNumber
      ? { ...entry, order: { ...entry.order, status, updated_at: updatedAt } }
      : entry
  );

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors; the saved order remains available if possible.
  }
}
