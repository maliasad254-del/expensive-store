import { describe, expect, it } from 'vitest';
import {
  constantTimeEqual,
  generateOrderNumber,
  hashPassword,
  verifyPassword
} from '../worker/lib/crypto';
import {
  normalizeEmail,
  normalizePakistanMobile,
  slugify,
  validateImageUpload,
  validateReviewSubmission
} from '../worker/lib/validation';
import { buildWhatsAppUrl } from '../src/lib/pkr';

describe('Pakistani mobile validation & normalization', () => {
  it('accepts local and international Pakistani formats', () => {
    expect(normalizePakistanMobile('03001234567')).toBe('03001234567');
    expect(normalizePakistanMobile('0300-1234567')).toBe('03001234567');
    expect(normalizePakistanMobile('+92 300 1234567')).toBe('03001234567');
    expect(normalizePakistanMobile('923211234567')).toBe('03211234567');
    expect(normalizePakistanMobile('00923331234567')).toBe('03331234567');
  });

  it('rejects non-Pakistani or malformed numbers', () => {
    expect(normalizePakistanMobile('0211234567')).toBeNull();
    expect(normalizePakistanMobile('030012345')).toBeNull();
    expect(normalizePakistanMobile('+14155552671')).toBeNull();
  });
});

describe('PBKDF2 password hashing and constant-time comparison', () => {
  it('verifies valid passwords and rejects wrong passwords', async () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const hash = await hashPassword('StrongPass!2026', salt);
    expect(await verifyPassword('StrongPass!2026', salt, hash)).toBe(true);
    expect(await verifyPassword('WrongPass!2026', salt, hash)).toBe(false);
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
  });
});

describe('Order number, slugify & image validation', () => {
  it('generates formatted Expensive Store order numbers', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^EXP-\d{8}-\d{4}$/);
  });

  it('slugifies product titles cleanly', () => {
    expect(slugify('Studio Matte ANC Headphones!')).toBe('studio-matte-anc-headphones');
  });

  it('validates JPEG magic bytes and rejects invalid payloads', () => {
    const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(validateImageUpload('image/jpeg', validJpeg)).toEqual({ ok: true, ext: 'jpg' });
    const fakeJpeg = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(validateImageUpload('image/jpeg', fakeJpeg).ok).toBe(false);
  });

  it('builds wa.me URL for Pakistani WhatsApp number 03037626960', () => {
    const url = buildWhatsAppUrl('03037626960', 'Hello Expensive Store');
    expect(url).toBe('https://wa.me/923037626960?text=Hello%20Expensive%20Store');
  });
});

describe('Price drop alert email validation & normalization', () => {
  it('trims and lowercases valid email addresses', () => {
    expect(normalizeEmail('  Customer.Name+tag@Example.PK  ')).toBe('customer.name+tag@example.pk');
    expect(normalizeEmail('buyer@expensivestore.pk')).toBe('buyer@expensivestore.pk');
  });

  it('rejects malformed email addresses', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('invalid-email')).toBeNull();
    expect(normalizeEmail('user@domain')).toBeNull();
    expect(normalizeEmail('user name@domain.com')).toBeNull();
  });
});

describe('Customer product review validation', () => {
  it('accepts valid post-purchase review payloads', () => {
    const res = validateReviewSubmission({
      orderNumber: ' exp-20261115-4821 ',
      mobileNumber: '+92 303 7626960',
      rating: 5,
      comment: 'Great matte finish and battery endurance!'
    });
    expect(res).toEqual({
      ok: true,
      orderNumber: 'EXP-20261115-4821',
      mobileNumber: '03037626960',
      rating: 5,
      comment: 'Great matte finish and battery endurance!'
    });
  });

  it('rejects out-of-range ratings, invalid mobiles, and short comments', () => {
    expect(
      validateReviewSubmission({
        orderNumber: 'EXP-20261115-4821',
        mobileNumber: '03037626960',
        rating: 6,
        comment: 'Nice product'
      }).ok
    ).toBe(false);
    expect(
      validateReviewSubmission({
        orderNumber: 'EXP-20261115-4821',
        mobileNumber: '0211234567',
        rating: 4,
        comment: 'Nice product'
      }).ok
    ).toBe(false);
    expect(
      validateReviewSubmission({
        orderNumber: 'EXP-20261115-4821',
        mobileNumber: '03037626960',
        rating: 4,
        comment: 'ok'
      }).ok
    ).toBe(false);
  });
});
