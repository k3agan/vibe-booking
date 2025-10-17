import { NextRequest, NextResponse } from 'next/server';

const MAILERLITE_API_TOKEN = process.env.MAILERLITE_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!MAILERLITE_API_TOKEN) {
      console.error('MailerLite API token is not configured');
      return NextResponse.json({ error: 'Mailing list service is not configured' }, { status: 500 });
    }

    // Subscribe to MailerLite
    const mailerliteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
      }),
    });

    if (!mailerliteResponse.ok) {
      const errorData = await mailerliteResponse.json();
      console.error('MailerLite API error:', errorData);
      return NextResponse.json({ error: 'Failed to subscribe to mailing list' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Successfully subscribed to mailing list' });
  } catch (error) {
    console.error('Error subscribing to mailing list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
