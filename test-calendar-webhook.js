/**
 * Test script for Google Calendar webhook integration
 * Run this to test the webhook registration and sync functionality
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testCalendarWebhook() {
  console.log('🧪 Testing Google Calendar Webhook Integration...\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CALENDAR_ID'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    console.log('Please add these to your .env.local file');
    return;
  }
  console.log('✅ All Google Calendar environment variables are set');
  console.log(`   Calendar ID: ${process.env.GOOGLE_CALENDAR_ID}\n`);

  // Test 2: Test webhook registration
  console.log('2️⃣ Testing webhook registration...');
  
  const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/calendar/webhook';
  console.log(`   Webhook URL: ${webhookUrl}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/calendar/register-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookUrl: webhookUrl
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook registration successful!');
      console.log(`   Channel ID: ${data.channelId}`);
      console.log(`   Resource ID: ${data.resourceId}`);
      console.log(`   Expires: ${new Date(parseInt(data.expiration || '0')).toISOString()}`);
      
      // Store channel ID for next test
      process.env.GOOGLE_WEBHOOK_CHANNEL_ID = data.channelId;
    } else {
      const errorData = await response.json();
      console.error('❌ Webhook registration failed:', errorData.error);
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Failed to register webhook:', error.message);
    console.log('Make sure your Next.js app is running (npm run dev)');
  }

  // Test 3: Test manual sync
  console.log('\n3️⃣ Testing manual calendar sync...');
  
  try {
    const response = await fetch('http://localhost:3000/api/calendar/webhook?force=true', {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Manual sync completed!');
      console.log(`   Message: ${data.message}`);
    } else {
      const errorData = await response.json();
      console.error('❌ Manual sync failed:', errorData.error);
    }
  } catch (error) {
    console.error('❌ Failed to run manual sync:', error.message);
  }

  // Test 4: Test webhook status check
  if (process.env.GOOGLE_WEBHOOK_CHANNEL_ID) {
    console.log('\n4️⃣ Testing webhook status check...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/calendar/register-webhook?channelId=${process.env.GOOGLE_WEBHOOK_CHANNEL_ID}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Webhook status check completed!');
        console.log(`   Status: ${data.status}`);
        console.log(`   Message: ${data.message}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Webhook status check failed:', errorData.error);
      }
    } catch (error) {
      console.error('❌ Failed to check webhook status:', error.message);
    }
  }

  console.log('\n🎉 Calendar webhook integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Deploy to production with WEBHOOK_URL environment variable');
  console.log('2. Register the webhook in production');
  console.log('3. Set up the daily cron job for webhook renewal');
  console.log('4. Test by modifying a calendar event and checking if the database updates');
  console.log('5. Verify that access codes are created for the correct dates');
}

// Run the test
testCalendarWebhook().catch(console.error);
