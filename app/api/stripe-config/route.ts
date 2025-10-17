import { NextResponse } from 'next/server';
import { getStripePublishableKey } from '@/lib/api-key-rotation';

/**
 * API endpoint to get the current Stripe publishable key based on rotation schedule
 * This allows the frontend to use the correct publishable key without exposing rotation logic
 */
export async function GET() {
  try {
    const publishableKey = getStripePublishableKey();
    
    if (!publishableKey) {
      return NextResponse.json(
        { error: 'Stripe publishable key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      publishableKey,
    });
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe configuration' },
      { status: 500 }
    );
  }
}
