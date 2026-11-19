import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getEffectivePrice } from '../lib/pkr';
import { CartItem, Product } from '../types/store';
import { useStore } from './StoreContext';

const CART_STORAGE_KEY = 'expensive_store_cart_v1';
const SELECTED_CART_STORAGE_KEY = 'expensive_store_selected_v1';

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
  selectedItems: HydratedCartItem[];
  selectedProductIds: string[];
  selectedSubtotalPkr: number;
  selectedSavingsPkr: number;
  selectedDeliveryFeePkr: number;
  selectedFinalTotalPkr: number;
  toggleItemSelection: (productId: string) => void;
  selectAllItems: (selected: boolean) => void;
  itemCount: number;
  subtotalPkr: number;
  totalSavingsPkr: number;
  deliveryFeePkr: number;
  finalTotalPkr: number;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  removeSelectedItems: () => void;
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

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SELECTED_CART_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as string[];
      const cart = localStorage.getItem(CART_STORAGE_KEY);
      return cart ? (JSON.parse(cart) as CartItem[]).map((item) => item.productId) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(SELECTED_CART_STORAGE_KEY, JSON.stringify(selectedProductIds));
    } catch {
      // Ignore storage quota issues
    }
  }, [items, selectedProductIds]);

  const addToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.is_available || product.stock_quantity <= 0) return;

    setSelectedProductIds((prev) => prev.includes(productId) ? prev : [...prev, productId]);
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
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const toggleItemSelection = (productId: string) => {
    setSelectedProductIds((prev) => prev.includes(productId)
      ? prev.filter((id) => id !== productId)
      : [...prev, productId]);
  };

  const selectAllItems = (selected: boolean) => {
    setSelectedProductIds(selected ? items.map((item) => item.productId) : []);
  };

  const removeSelectedItems = () => {
    const selected = new Set(selectedProductIds);
    setItems((prev) => prev.filter((item) => !selected.has(item.productId)));
    setSelectedProductIds((prev) => prev.filter((id) => !selected.has(id)));
  };

  const clearCart = () => {
    setItems([]);
    setSelectedProductIds([]);
  };

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

    const selectedItems = hydrated.filter((item) => selectedProductIds.includes(item.product.id));
    const selectedSubtotalPkr = selectedItems.reduce((s, i) => s + i.lineTotalPkr, 0);
    const selectedSavingsPkr = selectedItems.reduce((s, i) => s + i.savingsPkr, 0);
    const selectedDeliveryFeePkr =
      selectedItems.length === 0 || selectedSubtotalPkr >= (settings?.free_delivery_threshold_pkr ?? 5000)
        ? 0
        : (settings?.delivery_charge_pkr ?? 250);
    const selectedFinalTotalPkr = selectedSubtotalPkr + selectedDeliveryFeePkr;

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
      selectedItems,
      selectedSubtotalPkr,
      selectedSavingsPkr,
      selectedDeliveryFeePkr,
      selectedFinalTotalPkr,
      itemCount,
      subtotalPkr,
      totalSavingsPkr,
      deliveryFeePkr,
      finalTotalPkr
    };
  }, [items, products, settings, selectedProductIds]);

  return (
    <CartContext.Provider
      value={{
        items,
        ...summary,
        selectedProductIds,
        toggleItemSelection,
        selectAllItems,
        addToCart,
        updateQuantity,
        removeItem,
        removeSelectedItems,
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
