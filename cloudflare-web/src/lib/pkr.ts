import { LanguageCode, Product } from '../types/store';

export function formatPkr(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`;
}

export function getEffectivePrice(product: Product): number {
  if (
    product.discount_price_pkr !== null &&
    product.discount_price_pkr > 0 &&
    product.discount_price_pkr < product.regular_price_pkr
  ) {
    return product.discount_price_pkr;
  }
  return product.regular_price_pkr;
}

export function getDiscountPercent(product: Product): number {
  const effective = getEffectivePrice(product);
  if (effective >= product.regular_price_pkr || product.regular_price_pkr <= 0) return 0;
  return Math.round(((product.regular_price_pkr - effective) * 100) / product.regular_price_pkr);
}

export function buildWhatsAppUrl(rawPhone: string, message: string): string | null {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  const intl =
    digits.startsWith('03') && digits.length === 11 ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function normalizePakistanMobileClient(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('00923') && digits.length === 14) return '0' + digits.slice(4);
  if (digits.startsWith('923') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.startsWith('03') && digits.length === 11) return digits;
  return null;
}

export const LABELS: Record<LanguageCode, Record<string, string>> = {
  en: {
    codBanner: 'CASH ON DELIVERY ONLY • NATIONWIDE PAKISTAN (PKR)',
    searchPlaceholder: 'Search products, SKUs, or categories...',
    shopNow: 'Shop Now',
    trackOrder: 'Track Order',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    placeCodOrder: 'PLACE ORDER — CASH ON DELIVERY',
    bestSellers: 'Best-Selling Products',
    newArrivals: 'New Arrivals',
    specialOffers: 'Special Offers & Discounts',
    featuredCategories: 'Featured Categories'
  },
  ur: {
    codBanner: 'پاکستان بھر میں صرف کیش آن ڈیلیوری (PKR)',
    searchPlaceholder: 'پروڈکٹس یا کیٹیگری تلاش کریں...',
    shopNow: 'خریداری کریں',
    trackOrder: 'آرڈر ٹریک کریں',
    addToCart: 'کارٹ میں شامل کریں',
    buyNow: 'ابھی خریدیں',
    placeCodOrder: 'آرڈر بک کریں — کیش آن ڈیلیوری',
    bestSellers: 'زیادہ فروخت ہونے والی مصنوعات',
    newArrivals: 'نئی آمد',
    specialOffers: 'خصوصی آفرز اور ڈسکاؤنٹ',
    featuredCategories: 'نمایاں کیٹیگریز'
  }
};
