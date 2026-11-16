export function normalizePakistanMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let normalized: string | null = null;
  if (digits.startsWith('00923') && digits.length === 14) {
    normalized = '0' + digits.slice(4);
  } else if (digits.startsWith('923') && digits.length === 12) {
    normalized = '0' + digits.slice(2);
  } else if (digits.startsWith('03') && digits.length === 11) {
    normalized = digits;
  }
  if (!normalized || !/^03\d{9}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function normalizeEmail(input: string): string | null {
  const clean = input.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 160) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return null;
  return clean;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `item-${Date.now()}`;
}

export function sanitizeText(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export function parsePositiveInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function validateReviewSubmission(input: {
  orderNumber: unknown;
  mobileNumber: unknown;
  rating: unknown;
  comment: unknown;
}):
  | {
      ok: true;
      orderNumber: string;
      mobileNumber: string;
      rating: number;
      comment: string;
    }
  | { ok: false; reason: string } {
  const orderNumber = sanitizeText(input.orderNumber, 40).toUpperCase();
  if (!orderNumber || orderNumber.length < 6) {
    return { ok: false, reason: 'Please enter the Order ID from your purchase.' };
  }
  const mobileNumber = normalizePakistanMobile(sanitizeText(input.mobileNumber, 24));
  if (!mobileNumber) {
    return {
      ok: false,
      reason: 'Enter the valid Pakistani mobile number (03XXXXXXXXX) used on the order.'
    };
  }
  const numericRating = Number(input.rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { ok: false, reason: 'Please select a star rating between 1 and 5.' };
  }
  const comment = sanitizeText(input.comment, 500);
  if (comment.length < 5) {
    return { ok: false, reason: 'Please write a short review comment (at least 5 characters).' };
  }
  return {
    ok: true,
    orderNumber,
    mobileNumber,
    rating: numericRating,
    comment
  };
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
]);

export function validateImageUpload(
  contentType: string,
  bytes: Uint8Array
): { ok: true; ext: string } | { ok: false; reason: string } {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { ok: false, reason: 'Only JPEG, PNG, WebP, or AVIF images are allowed.' };
  }
  if (bytes.byteLength === 0 || bytes.byteLength > 5 * 1024 * 1024) {
    return { ok: false, reason: 'Image size must be between 1 byte and 5 MB.' };
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

  if (contentType === 'image/jpeg' && !isJpeg) {
    return { ok: false, reason: 'Invalid JPEG file signature.' };
  }
  if (contentType === 'image/png' && !isPng) {
    return { ok: false, reason: 'Invalid PNG file signature.' };
  }
  if (contentType === 'image/webp' && !isRiff) {
    return { ok: false, reason: 'Invalid WebP file signature.' };
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif'
  };
  return { ok: true, ext: extMap[contentType] || 'jpg' };
}
