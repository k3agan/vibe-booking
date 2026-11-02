import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, adminCookieOptions,
  createAdminSession, isSameOrigin, matchesAdminSecret, requireAdmin,
} from '@/lib/admin-auth';

function response(success: boolean, status = 200, message?: string) {
  return NextResponse.json({ success, ...(message ? { message } : {}) }, {
    status, headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return response(false, 403, 'Same-origin request required');
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return response(false, 503, 'Admin authentication is not configured');
  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return response(false, 400, 'Invalid request');
  }
  if (typeof password !== 'string' || !matchesAdminSecret(password, secret)) {
    return response(false, 401, 'Invalid credential');
  }
  const result = response(true);
  result.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(secret), {
    ...adminCookieOptions, maxAge: ADMIN_SESSION_SECONDS,
  });
  return result;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) {
    denied.headers.set('Cache-Control', 'no-store');
    return denied;
  }
  return response(true);
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return response(false, 403, 'Same-origin request required');
  const result = response(true);
  result.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
  return result;
}
