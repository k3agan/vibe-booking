# Google Ads & GA4 Conversion Tracking Setup Guide

## 🎯 Implementation Complete!

Your Google Ads and GA4 conversion tracking has been successfully implemented. This guide will help you complete the setup and verify everything is working correctly.

## 📋 What's Been Implemented

### ✅ Core Tracking Infrastructure
- **Google Tag Manager (GTM)** integration in app layout
- **Enhanced Conversions** utility with PII hashing (SHA-256)
- **GTM Events Helper** library for consistent tracking
- **Environment variables** setup for tracking IDs

### ✅ Conversion Events Tracked

#### Primary Conversion (Money Goal)
- **Booking Complete** - Server-side + Client-side tracking
  - Dynamic value tracking (actual booking amount)
  - Enhanced conversions with hashed PII
  - Event parameters: event_type, booking_type, days_until_event, guest_count

#### Secondary Conversions (Engagement Goals)
- **Booking Form Started** - When user fills first form field
- **Availability Calendar Viewed** - Calendar page interaction
- **Rates Page Viewed** - Pricing page interaction  
- **Gallery Viewed** - Photo gallery interaction
- **Phone Number Clicked** - Contact page phone click

## 🔧 Next Steps (Manual Configuration)

### 1. Get Your Tracking IDs

You need to obtain these IDs from your Google accounts:

#### Google Tag Manager
1. Go to [tagmanager.google.com](https://tagmanager.google.com)
2. Create a new container or use existing
3. Copy your Container ID (format: GTM-XXXXXXX)

#### Google Analytics 4
1. Go to [analytics.google.com](https://analytics.google.com)
2. Create a new GA4 property or use existing
3. Copy your Measurement ID (format: G-XXXXXXXXXX)

#### Google Ads
1. Go to [ads.google.com](https://ads.google.com)
2. Go to Tools & Settings > Conversions
3. Create a new conversion action for "Booking Complete"
4. Copy your Conversion ID and Label
5. **Copy your Account ID** (format: AW-XXXXXXXXX)

### 2. Update Environment Variables

Update your `.env.local` file with your actual tracking IDs:

```bash
# Replace with your actual tracking IDs
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=XXXXX
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXX/XXXXX
GA4_MEASUREMENT_PROTOCOL_SECRET=XXXXX
```

### 3. Configure Google Tag Manager Container

In your GTM container, create these tags:

#### GA4 Configuration Tag
- **Tag Type**: Google Analytics: GA4 Configuration
- **Measurement ID**: {{GA4 Measurement ID}}
- **Trigger**: All Pages

#### Google Ads Conversion Tag
- **Tag Type**: Google Ads: Conversion Tracking
- **Conversion ID**: {{Google Ads Conversion ID}}
- **Conversion Label**: {{Google Ads Conversion Label}}
- **Trigger**: Custom Event = "purchase"

#### Google Ads Remarketing Tag
- **Tag Type**: Google Ads: Remarketing
- **Conversion ID**: {{Google Ads Conversion ID}}
- **Trigger**: All Pages

#### Custom Event Tags
Create tags for each secondary conversion:
- **begin_checkout** (Booking Form Started)
- **select_content** (Page Views)
- **generate_lead** (Phone Clicks)

### 4. Configure Google Ads Conversions

1. **Import from GA4**: Import your GA4 conversions into Google Ads
2. **Set Primary Goal**: Mark "Booking Complete" as primary conversion
3. **Set Secondary Goals**: Mark others as secondary conversions
4. **Enable Enhanced Conversions**: Turn on enhanced conversions
5. **Set Conversion Windows**: 90 days click, 1 day view
6. **Configure Value Rules**: If needed for your business model

## 🧪 Testing & Verification

### 1. GTM Preview Mode
1. Go to your GTM container
2. Click "Preview" button
3. Enter your website URL
4. Navigate through your site and verify events fire:
   - Page views on all pages
   - Form interactions on booking page
   - Calendar view on availability page
   - Phone clicks on contact page

### 2. GA4 DebugView
1. Go to GA4 > Configure > DebugView
2. Enable debug mode on your device
3. Navigate through your site
4. Verify events appear in real-time

### 3. Google Ads Conversion Testing
1. Complete a test booking
2. Check Google Ads > Tools & Settings > Conversions
3. Verify conversion appears within 24 hours
4. Check enhanced conversion data is populated

### 4. Browser Developer Tools
1. Open browser dev tools (F12)
2. Go to Console tab
3. Look for GTM dataLayer events:
   ```javascript
   // You should see events like:
   dataLayer.push({event: "purchase", transaction_id: "CHH-1234567890", value: 750, currency: "CAD"})
   dataLayer.push({event: "begin_checkout", currency: "CAD"})
   dataLayer.push({event: "select_content", content_type: "availability_calendar"})
   ```

## 📊 Expected Data Flow

### User Journey Tracking
1. **Landing** → Page view tracked
2. **Research** → Gallery/Rates/Calendar views tracked
3. **Interest** → Form start tracked (begin_checkout)
4. **Conversion** → Booking complete tracked (purchase)
5. **Contact** → Phone clicks tracked (generate_lead)

### Conversion Data Sent
```json
{
  "transaction_id": "CHH-1234567890",
  "value": 750,
  "currency": "CAD",
  "event_type": "wedding",
  "booking_type": "hourly",
  "days_until_event": 45,
  "guest_count": 50,
  "enhanced_conversions": {
    "email": "hashed_email",
    "phone": "hashed_phone",
    "name": "hashed_name"
  }
}
```

## 🚀 Optimization Recommendations

### For Your $10K/Month Budget
1. **Smart Bidding**: Enable Target ROAS bidding once you have conversion data
2. **Audience Lists**: Create remarketing lists from your tracked events
3. **Value-Based Optimization**: Google will optimize for high-value bookings
4. **Attribution Windows**: 90-day click window captures long booking cycles

### Performance Monitoring
- Monitor conversion rates by traffic source
- Track cost per conversion by event type
- Analyze booking value by customer segment
- Use GA4 for detailed user journey analysis

## 🔍 Troubleshooting

### Common Issues
1. **Events not firing**: Check GTM Preview Mode
2. **Conversions not appearing**: Verify Google Ads conversion setup
3. **Enhanced conversions failing**: Check PII hashing format
4. **GTM not loading**: Verify container ID and environment variables

### Debug Commands
```javascript
// Check if GTM is loaded
console.log(window.dataLayer);

// Check specific events
console.log(window.dataLayer.filter(item => item.event === 'purchase'));

// Manual event testing
window.dataLayer.push({event: 'test_event', test: true});
```

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all tracking IDs are correct
3. Test in GTM Preview Mode
4. Check Google Ads conversion status

Your conversion tracking is now ready to optimize your $10K/month Google Ads budget! 🎉
