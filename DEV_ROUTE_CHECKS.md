## Dev API route checks (manual)

Run context: local dev server (`npm run dev`) with Node fetch script, Jan 27 2026.
This log is intentionally summarized to avoid storing sensitive data.

### Results
- GET `/api/test` → 200
- GET `/api/test-db` → 200
- GET `/api/stripe-config` → 200
- POST `/api/check-availability` → 200
- POST `/api/create-payment-intent` → 200
- POST `/api/payment-success` → 200 (created booking + downstream side effects)
- POST `/api/friend-booking` → 500 (`SUPABASE_SERVICE_ROLE_KEY` missing / `supabaseKey is required`)
- POST `/api/subscribe-mailing-list` → 200
- POST `/api/feedback` → 400 (ratings required)
- GET `/api/send-reminders` → 200
- POST `/api/send-reminders` → 200
- GET `/api/send-followups` → 200
- POST `/api/send-followups` → 200
- GET `/api/cron/send-reminders` → 401
- GET `/api/cron/send-followups` → 401
- GET `/api/cron/authorize-damage-deposits` → 401
- GET `/api/cron/register-webhook` → 401
- GET `/api/calendar` → 400 (missing start/end)
- POST `/api/calendar` → 400 (missing booking data)
- GET `/api/calendar/webhook` → 200
- POST `/api/calendar/webhook` → 400 (invalid payload)
- GET `/api/calendar/register-webhook` → 200
- POST `/api/calendar/register-webhook` → 400 (missing webhookUrl)
- GET `/api/admin/bookings` → 200
- PATCH `/api/admin/bookings` → 500 (failed to update booking)
- POST `/api/admin/cancel-booking` → 500
- GET `/api/my-bookings` → 400 (email required)

### Notes
- `POST /api/payment-success` will create real bookings and calendar events. Use a sandbox/test payment intent to avoid contaminating production data.
- `POST /api/friend-booking` requires `SUPABASE_SERVICE_ROLE_KEY` and a valid `discount_codes` row to succeed.
