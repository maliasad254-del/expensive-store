export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  EMAIL_WEBHOOK_URL?: string;
}

export interface AdminSession {
  adminId: string;
  username: string;
  role: string;
  csrfToken: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export const ALLOWED_ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
];
