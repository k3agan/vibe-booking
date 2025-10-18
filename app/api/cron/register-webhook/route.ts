import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job to automatically re-register Google Calendar webhook
 * This should run daily to check if webhook needs to be renewed
 * Google Calendar webhooks expire after 1 week, so we need to re-register them
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Checking Google Calendar webhook status...');

    // Get the webhook URL from environment variables
    const webhookUrl = process.env.WEBHOOK_URL || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/calendar/webhook`;

    // Check if we have a stored channel ID
    const storedChannelId = process.env.GOOGLE_WEBHOOK_CHANNEL_ID;
    
    if (storedChannelId) {
      // Check if the existing webhook is still active
      try {
        const checkResponse = await fetch(`${webhookUrl.replace('/webhook', '/register-webhook')}?channelId=${storedChannelId}`);
        const checkData = await checkResponse.json();
        
        if (checkData.status === 'active') {
          console.log('[CRON] Webhook is still active, no action needed');
          return NextResponse.json({
            success: true,
            message: 'Webhook is still active',
            channelId: storedChannelId
          });
        }
      } catch (error) {
        console.log('[CRON] Error checking webhook status, will re-register');
      }
    }

    // Re-register the webhook
    console.log('[CRON] Re-registering Google Calendar webhook...');
    
    try {
      const registerResponse = await fetch(`${webhookUrl.replace('/webhook', '/register-webhook')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl
        }),
      });

      const registerData = await registerResponse.json();

      if (registerData.success) {
        console.log('[CRON] ✅ Webhook re-registered successfully');
        console.log(`[CRON] Channel ID: ${registerData.channelId}`);
        console.log(`[CRON] Expires: ${new Date(parseInt(registerData.expiration || '0')).toISOString()}`);
        
        return NextResponse.json({
          success: true,
          message: 'Webhook re-registered successfully',
          channelId: registerData.channelId,
          expiration: registerData.expiration
        });
      } else {
        console.error('[CRON] ❌ Failed to re-register webhook:', registerData.error);
        return NextResponse.json({
          success: false,
          error: registerData.error,
          message: 'Failed to re-register webhook'
        }, { status: 500 });
      }
    } catch (error) {
      console.error('[CRON] ❌ Error re-registering webhook:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to re-register webhook'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[CRON] Error in webhook registration cron job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Webhook registration cron job failed'
    }, { status: 500 });
  }
}
