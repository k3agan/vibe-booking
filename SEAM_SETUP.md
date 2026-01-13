# Seam Smart Lock Integration Setup

This document explains how to set up the Seam smart lock integration for automatic access code generation.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Seam API Configuration
SEAM_API_KEY=your_seam_api_key_here
SEAM_LOCK_ID=your_smart_lock_device_id_here
SEAM_KITCHEN_LOCK_ID=your_kitchen_lock_device_id_here
ADMIN_EMAIL=info@caphillhall.ca
```

## Getting Your Seam Credentials

1. **SEAM_API_KEY**: Get this from your Seam dashboard at https://console.seam.co/
2. **SEAM_LOCK_ID**: Find this in your Seam dashboard under "Devices" - it's the device ID of your main entrance smart lock
3. **SEAM_KITCHEN_LOCK_ID**: (Optional) Device ID of the kitchen smart lock - will receive the same access code as the main entrance
4. **ADMIN_EMAIL**: Email address to receive alerts when access code creation fails

## How It Works

1. **Reminder Email Job**: Runs 24-48 hours before each event
2. **Access Code Creation**: Automatically creates a time-bound access code for each booking
3. **Dual Lock Support**: If `SEAM_KITCHEN_LOCK_ID` is configured, the same PIN code is automatically created for both the main entrance and kitchen locks
4. **Email Integration**: Access code is included in the reminder email
5. **Error Handling**: If main lock code creation fails, admin gets an alert. If kitchen lock fails but main succeeds, the code is still sent (kitchen failure is logged but non-blocking)

## Access Code Validity

- **Start Time**: 15 minutes before the booking start time
- **End Time**: 15 minutes after the booking end time
- **Timezone**: All times are handled in America/Vancouver timezone

## Testing

1. Set up your environment variables
2. Test with a booking that's 24-48 hours away
3. Check the reminder email for the access code section
4. Verify the access code works on your smart lock

## Troubleshooting

- Check console logs for Seam API errors
- Verify your API key and lock ID are correct
- Ensure your smart lock is properly connected to Seam
- Check admin email for failure alerts

## Manual Override

If the automatic system fails, you can manually create access codes in the Seam dashboard using the customer's name and booking date as the identifier.
