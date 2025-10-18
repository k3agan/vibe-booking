# Google Calendar Webhook Integration Setup

This guide explains how to set up Google Calendar webhooks to automatically sync calendar changes with your booking system and Seam access codes.

## Overview

The webhook integration solves the critical issue where booking managers modify events directly in Google Calendar, causing the system to create access codes for the wrong dates. Now when calendar events are modified, the system will:

1. ✅ **Detect the change** via Google Calendar webhook
2. ✅ **Update the database** with new date/time
3. ✅ **Delete old access codes** for the previous date
4. ✅ **Reset reminder flags** so new access codes are created
5. ✅ **Create new access codes** for the correct date

## Prerequisites

- Google Calendar API credentials already set up
- Seam integration already configured
- Webhook URL accessible from the internet (Vercel/Netlify/etc.)

## Environment Variables

Add these to your production environment:

```bash
# Existing Google Calendar variables (already set)
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_CALENDAR_ID=capitolhillhallrent@gmail.com

# New webhook variables
WEBHOOK_URL=https://your-domain.com/api/calendar/webhook
GOOGLE_WEBHOOK_CHANNEL_ID=your_channel_id_here  # Will be set automatically
CRON_SECRET=your_cron_secret  # For webhook re-registration cron job
```

## Setup Steps

### 1. Initial Webhook Registration

Register the webhook with Google Calendar:

```bash
curl -X POST https://your-domain.com/api/calendar/register-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-domain.com/api/calendar/webhook"}'
```

This will return:
```json
{
  "success": true,
  "channelId": "capitol-hill-hall-webhook-1234567890",
  "resourceId": "abc123def456",
  "expiration": "1704067200000",
  "message": "Webhook registered successfully. You will need to re-register weekly."
}
```

**Save the `channelId`** - you'll need it for monitoring.

### 2. Set Up Cron Job

Set up a daily cron job to automatically re-register the webhook (Google webhooks expire after 1 week):

```bash
# Add to your cron service (Vercel Cron, GitHub Actions, etc.)
# Run daily at 2 AM UTC
0 2 * * * curl -X GET "https://your-domain.com/api/cron/register-webhook" \
  -H "Authorization: Bearer your_cron_secret"
```

### 3. Test the Integration

Test that the webhook is working:

```bash
# Test manual sync
curl -X GET "https://your-domain.com/api/calendar/webhook?force=true"

# Check webhook status
curl -X GET "https://your-domain.com/api/calendar/register-webhook?channelId=YOUR_CHANNEL_ID"
```

## How It Works

### Webhook Flow

1. **Booking manager modifies event** in Google Calendar
2. **Google sends webhook notification** to your endpoint
3. **System fetches updated event** from Google Calendar
4. **System compares with database** booking
5. **System updates database** with new date/time
6. **System deletes old access codes** via Seam API
7. **System resets reminder flags** so new codes are created
8. **System creates new access codes** 24-48 hours before new date

### Event Matching

The system matches calendar events to database bookings using:
- Customer email address
- Customer name
- Event type
- Event description format

### Access Code Management

When a booking date/time changes:
- ✅ **Old access codes are deleted** (prevents confusion)
- ✅ **Reminder flags are reset** (allows new code creation)
- ✅ **New access codes are created** for the correct date
- ✅ **Customer gets correct access code** in reminder email

## Monitoring

### Check Webhook Status

```bash
curl -X GET "https://your-domain.com/api/calendar/register-webhook?channelId=YOUR_CHANNEL_ID"
```

### View Sync Logs

Check your application logs for:
- `📅 Google Calendar webhook received`
- `🔄 Starting calendar sync...`
- `✅ Successfully updated booking CHH-123456`
- `🗑️ Cleaned up 1 old access codes for John Doe`

### Manual Sync

If you need to manually trigger a sync:

```bash
curl -X GET "https://your-domain.com/api/calendar/webhook?force=true"
```

## Troubleshooting

### Webhook Not Receiving Notifications

1. **Check webhook URL** is accessible from internet
2. **Verify Google Calendar API** credentials are correct
3. **Check webhook registration** status
4. **Look for errors** in application logs

### Events Not Syncing

1. **Check event description format** - must contain booking details
2. **Verify customer email** matches database
3. **Check timezone handling** - events must be in America/Vancouver
4. **Look for parsing errors** in logs

### Access Codes Not Updated

1. **Check Seam API credentials** are correct
2. **Verify webhook is triggering** sync process
3. **Check database updates** are happening
4. **Look for Seam API errors** in logs

## Security Considerations

- **Webhook endpoint** is public but validates Google's payload format
- **Cron job** uses secret token for authentication
- **Database updates** only happen for confirmed bookings
- **Access code deletion** only affects matching customer/date combinations

## Maintenance

### Weekly Webhook Renewal

The system automatically re-registers webhooks weekly, but you can monitor this:

```bash
# Check if webhook needs renewal
curl -X GET "https://your-domain.com/api/cron/register-webhook"
```

### Channel ID Storage

Store the channel ID in your environment variables for monitoring:

```bash
GOOGLE_WEBHOOK_CHANNEL_ID=capitol-hill-hall-webhook-1234567890
```

## Success Indicators

You'll know the integration is working when:

- ✅ **Webhook receives notifications** when calendar events change
- ✅ **Database bookings are updated** with new dates/times
- ✅ **Old access codes are deleted** from Seam
- ✅ **New access codes are created** for correct dates
- ✅ **Customers receive correct access codes** in reminder emails
- ✅ **No more manual access code management** needed

## Support

If you encounter issues:

1. **Check application logs** for error messages
2. **Verify all environment variables** are set correctly
3. **Test webhook registration** manually
4. **Check Google Calendar API** quota and permissions
5. **Verify Seam API** is working correctly

The integration is designed to be robust and handle errors gracefully, but monitoring the logs will help identify any issues quickly.
