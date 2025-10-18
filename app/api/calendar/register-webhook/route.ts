import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize Google Calendar API
const calendar = google.calendar({ version: 'v3' });

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';

/**
 * Registers a webhook with Google Calendar to receive push notifications
 * This should be called once to set up the webhook
 */
export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json();

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl is required' },
        { status: 400 }
      );
    }

    console.log('🔗 Registering Google Calendar webhook...');
    console.log(`   Calendar ID: ${calendarId}`);
    console.log(`   Webhook URL: ${webhookUrl}`);

    const authClient = await auth.getClient();

    // Register the webhook with Google Calendar
    const response = await calendar.events.watch({
      auth: authClient as any,
      calendarId,
      requestBody: {
        id: `capitol-hill-hall-webhook-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        // Set expiration to 1 week from now (Google's max is 1 week)
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(),
      },
    });

    console.log('✅ Webhook registered successfully!');
    console.log(`   Channel ID: ${response.data.id}`);
    console.log(`   Resource ID: ${response.data.resourceId}`);
    console.log(`   Expiration: ${new Date(parseInt(response.data.expiration || '0')).toISOString()}`);

    return NextResponse.json({
      success: true,
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration,
      message: 'Webhook registered successfully. You will need to re-register weekly.'
    });
  } catch (error) {
    console.error('❌ Error registering webhook:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code;
    
    return NextResponse.json(
      { 
        error: 'Failed to register webhook',
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check webhook status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({
        message: 'Add ?channelId=YOUR_CHANNEL_ID to check webhook status',
        note: 'This endpoint checks if a webhook channel is still active'
      });
    }

    console.log(`🔍 Checking webhook status for channel: ${channelId}`);

    const authClient = await auth.getClient();

    // Stop the webhook to check if it's still active
    try {
      await calendar.channels.stop({
        auth: authClient as any,
        requestBody: {
          id: channelId,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'active',
        message: 'Webhook is still active'
      });
    } catch (stopError) {
      if ((stopError as any)?.code === 404) {
        return NextResponse.json({
          success: false,
          status: 'expired',
          message: 'Webhook has expired or been deleted'
        });
      }
      throw stopError;
    }
  } catch (error) {
    console.error('❌ Error checking webhook status:', error);
    return NextResponse.json(
      { error: 'Failed to check webhook status' },
      { status: 500 }
    );
  }
}
