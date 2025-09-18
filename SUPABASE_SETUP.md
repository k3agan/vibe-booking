# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login with your GitHub account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `capitol-hill-hall`
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to your users (probably US West for BC)

## 2. Get Your Project Credentials

1. Go to your project dashboard
2. Click on "Settings" → "API"
3. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## 3. Set Up Database Schema

1. In your Supabase dashboard, go to "SQL Editor"
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL script
4. This will create the `bookings` and `email_logs` tables

## 4. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Your existing variables...
STRIPE_SECRET_KEY=your_stripe_secret_key
RESEND_API_KEY=your_resend_api_key
GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key
GOOGLE_PRIVATE_KEY=your_google_private_key
GOOGLE_CLIENT_EMAIL=your_google_client_email
GOOGLE_CALENDAR_ID=your_google_calendar_id

# Cron Job Security (Optional - for external cron services)
CRON_SECRET=capitol-hall-cron-2024-secure
```

## 5. Test the Setup

1. Restart your dev server: `npm run dev`
2. Try making a test booking
3. Check your Supabase dashboard → "Table Editor" → "bookings" to see the data

## 6. Row Level Security (RLS)

The schema includes RLS policies that:
- Allow public to create bookings
- Allow users to read their own bookings (by email)
- Allow service role to read all bookings

For production, you may want to add authentication for admin access.

## Next Steps

Once this is working, we can add:
- Reminder emails
- Cancellation system
- Admin dashboard
- Analytics
