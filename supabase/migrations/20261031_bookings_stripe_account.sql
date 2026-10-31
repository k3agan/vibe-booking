-- Which CHH Stripe account took the rental payment, derived from the PaymentIntent ID.
--   PRIMARY   acct_1S6yNLCQrvU0Yvn4 → ids contain 'CQrvU0Yvn4'
--   SECONDARY acct_1KpNIAJAT5KpLHRq → ids contain 'JAT5KpLHRq'
-- STORED GENERATED: backfills existing rows when added and can never drift.
-- The app never writes it, and works whether or not this has been applied
-- (it reads booking.stripe_account ?? ID signature; no query filters on it).
-- Safe to run before or after deploying; safe to re-run.

alter table public.bookings add column if not exists stripe_account text generated always as (case when payment_intent_id like '%CQrvU0Yvn4%' then 'primary' when payment_intent_id like '%JAT5KpLHRq%' then 'secondary' else null end) stored;

create index if not exists idx_bookings_stripe_account on public.bookings (stripe_account);
