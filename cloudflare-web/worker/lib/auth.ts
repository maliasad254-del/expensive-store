import { AdminSession, Env } from '../types';
import {
  constantTimeEqual,
  hashPassword,
  randomHex,
  sha256Hex,
  verifyPassword
} from './crypto';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  errorResponse,
  getClientIp,
  jsonResponse,
  parseCookies,
  SESSION_COOKIE_NAME
} from './http';
import { sanitizeText } from './validation';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export async function getAdminSetupStatus(env: Env): Promise<Response> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM admin_users').first<{
    cnt: number;
  }>();
  return jsonResponse({ initialized: (row?.cnt ?? 0) > 0 });
}

export async function handleFirstAdminSetup(request: Request, env: Env): Promise<Response> {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM admin_users').first<{
    cnt: number;
  }>();
  if ((existing?.cnt ?? 0) > 0) {
    return errorResponse('Admin account is already initialized.', 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  const username = sanitizeText(body.username, 64);
  const password = typeof body.password === 'string' ? body.password : '';
  if (username.length < 3) {
    return errorResponse('Username must be at least 3 characters.', 400);
  }
  if (password.length < 8) {
    return errorResponse('Password must be at least 8 characters.', 400);
  }

  const adminId = `adm_${randomHex(8)}`;
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO admin_users (id, username, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(adminId, username, hash, salt, 'admin', now)
    .run();

  const rawToken = randomHex(32);
  const tokenHash = await sha256Hex(rawToken);
  const csrfToken = randomHex(24);
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token_hash, admin_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(tokenHash, adminId, csrfToken, now + SESSION_TTL_MS, now)
    .run();

  return jsonResponse(
    { admin: { id: adminId, username, role: 'admin' }, csrfToken },
    201,
    { 'Set-Cookie': buildSessionCookie(request, rawToken) }
  );
}

export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const ip = getClientIp(request);
  const now = Date.now();

  const attempt = await env.DB.prepare(
    'SELECT failed_count, locked_until FROM login_attempts WHERE ip_address = ?'
  )
    .bind(ip)
    .first<{ failed_count: number; locked_until: number }>();

  if (attempt && attempt.locked_until > now) {
    const secs = Math.ceil((attempt.locked_until - now) / 1000);
    return errorResponse(`Too many failed login attempts. Try again in ${secs}s.`, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  const username = sanitizeText(body.username, 64);
  const password = typeof body.password === 'string' ? body.password : '';

  const admin = await env.DB.prepare(
    'SELECT id, username, password_hash, password_salt, role FROM admin_users WHERE lower(username) = lower(?)'
  )
    .bind(username)
    .first<{
      id: string;
      username: string;
      password_hash: string;
      password_salt: string;
      role: string;
    }>();

  const valid =
    admin !== null &&
    (await verifyPassword(password, admin.password_salt, admin.password_hash));

  if (!valid || !admin) {
    const nextCount = (attempt?.failed_count ?? 0) + 1;
    const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? now + RATE_LIMIT_WINDOW_MS : 0;
    await env.DB.prepare(
      `INSERT INTO login_attempts (ip_address, failed_count, locked_until, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(ip_address) DO UPDATE SET failed_count = ?, locked_until = ?, updated_at = ?`
    )
      .bind(ip, nextCount, lockedUntil, now, nextCount, lockedUntil, now)
      .run();
    return errorResponse('Invalid username or password.', 401);
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_address = ?').bind(ip).run();

  const rawToken = randomHex(32);
  const tokenHash = await sha256Hex(rawToken);
  const csrfToken = randomHex(24);
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token_hash, admin_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(tokenHash, admin.id, csrfToken, now + SESSION_TTL_MS, now)
    .run();

  return jsonResponse(
    { admin: { id: admin.id, username: admin.username, role: admin.role }, csrfToken },
    200,
    { 'Set-Cookie': buildSessionCookie(request, rawToken) }
  );
}

export async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (rawToken) {
    const tokenHash = await sha256Hex(rawToken);
    await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return jsonResponse(
    { ok: true },
    200,
    { 'Set-Cookie': buildClearSessionCookie(request) }
  );
}

export async function requireAdmin(
  request: Request,
  env: Env,
  requireCsrfToken = false
): Promise<{ ok: true; session: AdminSession } | { ok: false; response: Response }> {
  const cookies = parseCookies(request);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    return { ok: false, response: errorResponse('Authentication required.', 401) };
  }

  const tokenHash = await sha256Hex(rawToken);
  const now = Date.now();

  const row = await env.DB.prepare(
    `SELECT s.admin_id, s.csrf_token, s.expires_at, u.username, u.role
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_id
     WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first<{
      admin_id: string;
      csrf_token: string;
      expires_at: number;
      username: string;
      role: string;
    }>();

  if (!row || row.expires_at < now) {
    if (row) {
      await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
    }
    return { ok: false, response: errorResponse('Session expired. Please sign in again.', 401) };
  }

  if (row.role !== 'admin') {
    return { ok: false, response: errorResponse('Forbidden: admin role required.', 403) };
  }

  if (requireCsrfToken) {
    const headerCsrf = request.headers.get('X-CSRF-Token') || '';
    if (!headerCsrf || !constantTimeEqual(headerCsrf, row.csrf_token)) {
      return { ok: false, response: errorResponse('Invalid CSRF token.', 403) };
    }
  }

  return {
    ok: true,
    session: {
      adminId: row.admin_id,
      username: row.username,
      role: row.role,
      csrfToken: row.csrf_token
    }
  };
}
