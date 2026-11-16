export type LanguageCode = 'en' | 'ur';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_featured: number;
  sort_order: number;
}

export interface Product {
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
  is_available: boolean;
  is_featured: boolean;
  is_on_sale: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  images: string[];
  created_at: number;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  tagline: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_offer_badge: string;
  promo_banner_title: string;
  promo_banner_subtitle: string;
  delivery_charge_pkr: number;
  free_delivery_threshold_pkr: number;
  whatsapp_number: string;
  support_phone: string;
  support_email: string;
  store_address: string;
  registration_details: string;
  about_us_text: string;
  privacy_policy_text: string;
  return_policy_text: string;
  shipping_policy_text: string;
  faq_text: string;
  why_shop_items: string;
}

export type ReviewModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  order_number?: string | null;
  customer_name: string;
  city: string;
  rating: number;
  comment: string;
  verified_purchase?: boolean;
  is_approved?: boolean;
  moderation_status?: ReviewModerationStatus;
  created_at: number;
  moderated_at?: number | null;
}

export interface ProductReviewStats {
  averageRating: number;
  reviewCount: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderRecord {
  order_number: string;
  customer_name: string;
  mobile_number: string;
  city: string;
  delivery_address: string;
  order_notes?: string;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  discount_total_pkr: number;
  total_pkr: number;
  payment_method: string;
  status: OrderStatus;
  created_at: number;
  updated_at?: number;
}

export interface OrderItemSnapshot {
  product_id: string;
  sku: string;
  product_name: string;
  unit_price_pkr: number;
  original_price_pkr: number;
  quantity: number;
  line_total_pkr: number;
  image_url: string;
}

export interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  city: string;
  total_pkr: number;
  payment_method: string;
  item_count: number;
  created_at: number;
  updated_at: number;
  history: Array<{
    status: OrderStatus;
    note: string;
    created_at: number;
  }>;
}

export interface AdminAnalytics {
  summary: {
    total_orders: number;
    total_sales_pkr: number;
    pending_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
  };
  bestSellers: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    units_sold: number;
    revenue_pkr: number;
  }>;
  recentOrders: OrderRecord[];
}

export interface PriceAlertSubscription {
  id: string;
  product_id: string;
  product_name: string;
  email: string;
  subscribed_price_pkr: number;
  last_notified_price_pkr: number | null;
  status: 'ACTIVE' | 'TRIGGERED';
  created_at: number;
  triggered_at: number | null;
}

export interface PriceDropNotification {
  id: string;
  subscription_id: string;
  product_id: string;
  product_name: string;
  email: string;
  old_price_pkr: number;
  new_price_pkr: number;
  delivery_status: 'PENDING' | 'SENT' | 'FAILED';
  created_at: number;
  sent_at: number | null;
}
