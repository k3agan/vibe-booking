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

    // First, find the "Joined-Via-Website" group
    const groupsResponse = await fetch('https://connect.mailerlite.com/api/groups', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    let groupId: string | null = null;
    if (groupsResponse.ok) {
      const groupsData = await groupsResponse.json();
      const targetGroup = groupsData.data?.find((group: any) => group.name === 'Joined-Via-Website');
      if (targetGroup) {
        groupId = targetGroup.id;
      }
    }

    // Subscribe to MailerLite and add to group if found
    const subscribeBody: any = {
      email: email,
      status: 'active', // active, unsubscribed, bounced, junk
    };

    // If group found, add subscriber to that group
    if (groupId) {
      subscribeBody.groups = [groupId];
    }

    const mailerliteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(subscribeBody),
    });

    const responseData = await mailerliteResponse.json().catch(() => ({ error: 'Failed to parse response' }));

    if (!mailerliteResponse.ok) {
      console.error('MailerLite API error:', {
        status: mailerliteResponse.status,
        statusText: mailerliteResponse.statusText,
        error: responseData,
      });
      return NextResponse.json({ 
        error: 'Failed to subscribe to mailing list',
        details: responseData 
      }, { status: mailerliteResponse.status || 500 });
    }

    return NextResponse.json({ success: true, message: 'Successfully subscribed to mailing list', data: responseData });
  } catch (error) {
    console.error('Error subscribing to mailing list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
