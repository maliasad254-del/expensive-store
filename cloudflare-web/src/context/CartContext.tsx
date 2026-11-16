import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getEffectivePrice } from '../lib/pkr';
import { CartItem, Product } from '../types/store';
import { useStore } from './StoreContext';

const CART_STORAGE_KEY = 'expensive_store_cart_v1';

interface HydratedCartItem {
  product: Product;
  quantity: number;
  unitPricePkr: number;
  lineTotalPkr: number;
  savingsPkr: number;
}

interface CartContextValue {
  items: CartItem[];
  hydratedItems: HydratedCartItem[];
  itemCount: number;
  subtotalPkr: number;
  totalSavingsPkr: number;
  deliveryFeePkr: number;
  finalTotalPkr: number;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { products, settings } = useStore();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota issues
    }
  }, [items]);

  const addToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.is_available || product.stock_quantity <= 0) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      const nextQty = Math.min(
        product.stock_quantity,
        (existing?.quantity ?? 0) + Math.max(1, quantity)
      );
      if (existing) {
        return prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { productId, quantity: nextQty }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxQty = product ? product.stock_quantity : quantity;
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(maxQty, quantity) } : i
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const summary = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const hydrated: HydratedCartItem[] = [];
    for (const item of items) {
      const p = productMap.get(item.productId);
      if (!p || !p.is_available || p.stock_quantity <= 0) continue;
      const qty = Math.min(item.quantity, p.stock_quantity);
      const unitPrice = getEffectivePrice(p);
      hydrated.push({
        product: p,
        quantity: qty,
        unitPricePkr: unitPrice,
        lineTotalPkr: unitPrice * qty,
        savingsPkr: Math.max(0, p.regular_price_pkr - unitPrice) * qty
      });
    }

    const subtotalPkr = hydrated.reduce((s, i) => s + i.lineTotalPkr, 0);
    const totalSavingsPkr = hydrated.reduce((s, i) => s + i.savingsPkr, 0);
    const deliveryCharge = settings?.delivery_charge_pkr ?? 250;
    const freeThreshold = settings?.free_delivery_threshold_pkr ?? 5000;
    const deliveryFeePkr =
      hydrated.length === 0 || subtotalPkr >= freeThreshold ? 0 : deliveryCharge;
    const finalTotalPkr = subtotalPkr + deliveryFeePkr;
    const itemCount = hydrated.reduce((s, i) => s + i.quantity, 0);

    return {
      hydratedItems: hydrated,
      itemCount,
      subtotalPkr,
      totalSavingsPkr,
      deliveryFeePkr,
      finalTotalPkr
    };
  }, [items, products, settings]);

  return (
    <CartContext.Provider
      value={{
        items,
        ...summary,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
