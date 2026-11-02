# Admin cancellation security and refund contract

Review context: https://github.com/k3agan/chh-ops/issues/10. This document describes local code, not verified production configuration. No worker production calls, refunds, cancellations, secret provisioning or manual deployment were performed. The existing GitHub/Vercel integration automatically runs preview checks on branch pushes; those are not worker production/deploy tests.

PR #6 remains DRAFT after blocking independent review of `38f51e69dcec151c07302399253fd070b7dad6e5`. The earlier 175-test completion claim is superseded. Corrected source and committed route/pipeline regressions address dispute evidence, unverified refund outcomes and stale payment flags; parent must independently re-review before draft status changes. Local green tests are not independent acceptance or production approval.

## Authentication

`POST /api/admin/cancel-booking` and `GET/PATCH /api/admin/bookings` require server-side authentication before parsing request bodies, reading bookings or performing side effects. The sibling PATCH route previously allowed direct cancellation, so it is covered by the same guard.

- Non-browser operators send `Authorization: Bearer <ADMIN_API_SECRET>`. The value must come from an approved server-side secret loader; never paste it into GitHub, logs, URLs, command history, public env variables or bundled JavaScript. There is deliberately no fallback to `CRON_SECRET` or the old browser-only login.
- Portal operators enter the credential in the HTTPS login form. `POST /api/admin/session` validates it server-side and returns a signed random 8-hour session cookie, not the secret. The cookie is HttpOnly, Secure, SameSite=Strict and scoped to `/api/admin`. The form clears its credential state after submission; no browser storage is used. Server status and logout use GET/DELETE on the same session endpoint.
- Cookie-authenticated writes and session login/logout require an exact same-origin `Origin` header. Header-authenticated operator calls do not need an Origin header. Invalid supplied Authorization headers do not fall back to cookies.
- Missing `ADMIN_API_SECRET` fails closed with HTTP 503; absent/incorrect credentials give 401; failed cookie-write origin checks give 403. Session responses are `Cache-Control: no-store`.
- Logout clears the browser cookie. Signed sessions have no server-side revocation list; a copied token remains usable until expiry or secret rotation. Secret rotation invalidates all existing sessions. This is a shared-operator gate, not individual identity/audit or MFA.

## Refund request and refusal

Authenticated cancellation JSON:

- `bookingId`: required nonblank string (passed through unchanged).
- `refundAmount`: CAD JSON number with at most two decimal places, or null/omitted for the remaining captured Stripe balance. Explicit 0 cancels without a rental refund; this preserves the existing deposit-decline path. Strings, booleans, objects, negative/non-finite and fractional-cent amounts are rejected, not coerced into a refund or silently treated as zero.
- `cancellationReason`: optional string/null.

A positive/default refund of a rental PaymentIntent whose ID contains `JAT5KpLHRq` returns HTTP 409 before any Stripe calls, deposit release, database writes, calendar/door-code changes or email. Response fields: `success: false`, `code: SECONDARY_ACCOUNT_REFUND_REFUSED`, `customerEmail` and an explanatory `message`. The rental PaymentIntent is authoritative for this check, not the saved-card account or a possibly stale generated account label.

PRIMARY refunds require a distinct explicitly configured `STRIPE_SECRET_KEY_PRIMARY`; the rotating/legacy `STRIPE_SECRET_KEY` is not trusted for refunds. The PRIMARY key must actually belong to the PRIMARY account. Unknown legacy IDs are looked up on PRIMARY; only a resource-missing result permits a read-only lookup using an explicitly configured SECONDARY key. Finding the payment there returns the same 409. No refund write is ever retried on SECONDARY. Missing/identical account keys fail closed with 503, Stripe lookup/refund failures with 502.

For every positive/null/omitted refund request with a recorded rental PI, verify the actual Stripe account/payment regardless of local `payment_status` (including pending/failed/refunded/null/unknown/cancelled or a contradictory comped flag). A stale DB flag cannot silently turn an intended refund into zero-refund cancellation or bypass SECONDARY refusal. Missing rental evidence returns 409 and unreadable Stripe evidence fails closed before cancellation effects; neither is treated as no payment. The only default-refund exception is an explicitly comped record with no recorded rental PI. Explicit numeric 0 remains the intentional no-rental-refund path, including deposit-decline cancellations. Neither exception is an automatic retry after a refund error.

On PRIMARY, retrieve the rental PaymentIntent and latest charge. Require the returned PI identity to match the recorded rental, a succeeded CAD payment, and a paid, captured CAD charge whose `disputed` field is explicitly boolean false. Active/accepted/lost-chargeback flags, missing/null/malformed dispute evidence return 409 BEFORE refund creation, deposit release, DB/calendar/access cleanup or email. Compare integer cents against `amount_captured - amount_refunded`, not `bookings.calculated_price`. Null/omitted refunds use that remaining balance; fully refunded payments return 409 unless the operator explicitly requests zero. Over-refunds return 400 with the remaining balance. The portal labels DB price as informational, never the maximum refundable amount.

Refunds use the unchanged stable per-booking Stripe idempotency key. Only an explicitly `succeeded` refund with a nonblank identity can produce successful-refund records/messages and continue cancellation. Pending/requires_action/failed/canceled/null/missing/unknown/malformed outcomes return HTTP 502 `REFUND_RECONCILIATION_REQUIRED`, with `stripeRefundId` when available. No deposit release, DB cancellation/refund success record, calendar/access cleanup or email occurs on that response. The route returns `success: false`, does not claim `refundIssued: true`, and the portal displays the server's reconciliation message rather than a success message.

A Stripe refund write may ALREADY have occurred before an unresolved response/timeout. A 502 is not evidence that no money moved. Stop and reconcile the rental payment/refund in Stripe through authorized Finance handling BEFORE any retry; never automatically retry, request 0 to work around it, or create a second refund. This fail-closed proposal does not persist an unresolved-refund ledger or automatically resume cancellation when a pending refund later succeeds. Refund/DB split failure also requires reconciliation; there is no distributed transaction. Stripe remains the final guard against concurrent refunds; even Stripe success is not a promise of the renter's bank posting time. Existing best-effort cleanup behavior after verified success is unchanged.

A 409 refusal does NOT automatically cancel, initiate e-transfer, change payment/refund records, release deposits or contact the renter. An explicit zero-refund cancellation remains available only when independently intended and authorized; it is not an automatic retry strategy for a refused refund.

## Deposit-account item from issue #10

The PRIMARY-only hold problem has already been changed by merged vibe-booking PR #3 (`3dfc244`, present in this branch's base). `lib/deposit-hold.ts` resolves the saved-card owner first and can try the other account on system failure. Existing mocked deposit-hold tests cover owner selection, SECONDARY success, missing resources, decline and no-refund cancellation. No additional cron/schedule/policy change is needed in this PR.

This is source/test verification, not a claim that historic bookings mentioned in #10 now have holds or that production has the necessary keys/tracking columns. Those records were not queried or changed.

## Handoff required before production use — Keagan/CoS

1. Parent independently re-reviews the corrected draft revision; the worker must not mark it ready. Keagan reviews the PR for final technical approval; no worker merge, auto-merge or deployment is authorized.
2. Confirm/provision a high-entropy dedicated `ADMIN_API_SECRET` only in the approved server environment/secret store (recommended at least 32 random bytes). Do not reuse the public legacy browser password or a `NEXT_PUBLIC_*` variable. Production wiring is unverified; the implementation intentionally returns 503 if absent. Review login brute-force/rate-limit protections at the platform boundary; none are assumed or changed here.
3. Confirm PRIMARY key ownership and distinct account configuration. No credentials were read, rotated or changed for this work.
4. CoS/Finance update the chh-ops Finance runbook through its own issue/PR workflow: use the approved read-only loader without printing secrets; supply the bearer header for protected booking reads/writes; handle 401/403/503 without downgrade; on SECONDARY 409 record the authenticated routing details, stop Stripe attempts and route any separately approved e-transfer through Finance. Do not send money, send customer messages or automatically retry with zero. Do not edit another role's worktree to make this procedure change.
5. Any future live smoke test, production deployment, historic hold diagnosis, credential action or refund requires separate authorization. No such action is part of this PR's test evidence.
6. Other existing non-admin email/tool endpoints were not made private by this scoped change. CoS should route a separate authorization audit; this PR is not a claim that every privileged endpoint is secure.

## Validation and rollback

Run `npm test -- --runInBand` and `npx tsc --noEmit --incremental false`. See the branch checkpoint for exact RED/GREEN counts and isolated build results. The existing `npm run lint` opens initial ESLint setup rather than performing a lint check; this PR does not add dependencies/configuration to conceal that existing gap.

Rollback is a reviewed revert of this PR, not an immediate production action. A blind revert reopens the unauthenticated cancellation vulnerability: disable privileged operator use or retain the authentication guard while repairing a regression. There is no schema migration, policy/pricing change, scheduler change or live data mutation in this PR.
