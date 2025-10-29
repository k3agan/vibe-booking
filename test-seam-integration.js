const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testSeamIntegration() {
  console.log('🧪 Testing Seam Integration...\n');
  
  // Test 1: Manual reminder endpoint (should create access code)
  console.log('📧 Test 1: Testing manual reminder endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/send-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('✅ Manual reminder response:', result);
  } catch (error) {
    console.log('❌ Manual reminder error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Cron reminder endpoint (should create access code)
  console.log('⏰ Test 2: Testing cron reminder endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/cron/send-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('✅ Cron reminder response:', result);
  } catch (error) {
    console.log('❌ Cron reminder error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Check if we have any bookings to test with
  console.log('📋 Test 3: Checking for upcoming bookings...');
  try {
    const response = await fetch('http://localhost:3000/api/my-bookings', {
      method: 'GET',
    });
    
    const result = await response.json();
    console.log('✅ Bookings found:', result.bookings?.length || 0);
    
    if (result.bookings && result.bookings.length > 0) {
      console.log('📅 Sample booking:', {
        id: result.bookings[0].id,
        customer_name: result.bookings[0].customer_name,
        selected_date: result.bookings[0].selected_date,
        start_time: result.bookings[0].start_time,
        end_time: result.bookings[0].end_time,
        reminder_sent: result.bookings[0].reminder_sent
      });
    }
  } catch (error) {
    console.log('❌ Bookings check error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 4: Environment variables check
  console.log('🔑 Test 4: Checking environment variables...');
  const seamApiKey = process.env.SEAM_API_KEY;
  const seamLockId = process.env.SEAM_LOCK_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  console.log('✅ SEAM_API_KEY:', seamApiKey ? '✅ Set' : '❌ Missing');
  console.log('✅ SEAM_LOCK_ID:', seamLockId ? '✅ Set' : '❌ Missing');
  console.log('✅ ADMIN_EMAIL:', adminEmail ? '✅ Set' : '❌ Missing');
  
  console.log('\n🎯 Test Summary:');
  console.log('- Manual reminder endpoint tested');
  console.log('- Cron reminder endpoint tested');
  console.log('- Bookings data checked');
  console.log('- Environment variables verified');
  console.log('\n💡 Check the server logs for detailed Seam API responses!');
}

testSeamIntegration().catch(console.error);
