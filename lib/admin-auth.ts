import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/** Server-only: never import this module into client components. */
export const ADMIN_SESSION_COOKIE = 'chh_admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const adminCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/api/admin',
};

function sessionSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`chh-admin-session:${payload}`).digest('hex');
}

export function createAdminSession(secret: string): string {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const payload = `v1.${expires}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${sessionSignature(payload, secret)}`;
}

function validAdminSession(token: string, secret: string): boolean {
  const match = /^(v1\.([0-9]{10})\.[a-f0-9]{48})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[2]);
  const now = Math.floor(Date.now() / 1000);
  return expires > now && expires <= now + ADMIN_SESSION_SECONDS &&
    matchesAdminSecret(match[3], sessionSignature(match[1], secret));
}

/** Cookie-backed mutations require an explicit same-origin browser request. */
export function isSameOrigin(request: NextRequest): boolean {
  return request.headers.get('origin') === request.nextUrl.origin;
}

export function matchesAdminSecret(candidate: string, secret: string): boolean {
  // Fixed-length digests permit constant-time comparison even for unequal input lengths.
  return timingSafeEqual(
    createHash('sha256').update(candidate).digest(),
    createHash('sha256').update(secret).digest()
  );
}

/** Authenticate before parsing bodies, looking up bookings, or doing any work. */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, message: 'Admin authentication is not configured' },
      { status: 503 }
    );
  }
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ') && matchesAdminSecret(authorization.slice(7), secret)) {
    return null;
  }
  // If a header is supplied, do not fall back to a browser cookie on failure.
  if (!authorization && validAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? '', secret)) {
    if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Same-origin request required' }, { status: 403 });
    }
    return null;
  }
  return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
}
