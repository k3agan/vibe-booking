import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/** Server-only: never import this module into client components. */
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
  return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
}
