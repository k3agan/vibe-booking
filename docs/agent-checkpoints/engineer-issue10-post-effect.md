# #10 D1 post-effect truth — revision checkpoint

Supersedes prior local acceptance/completion language, not history. Original issue
https://github.com/k3agan/chh-ops/issues/10; required consumer companion #40.
Policy: GitHub Issues only; specialist commits/pushes SAME branch, no PR edits,
publication, owner notification, merge, deployment or live financial/customer tests.
CoS alone owns whole-issue exact-head independent acceptance. PR6 stays internal DRAFT.

## Recovery / contract / actual RED

Resumed verified clean `staff/engineer/20261102T002457Z` at
`e189235a0235f439aef8aeb1873868bd496eee9a` (remote tracking equal).
Provider origin verified `https://github.com/k3agan/vibe-booking`.
Only writable tree `/Users/k3/code/chh-staff-engineer-20261102T002457Z`.
Read run-root policy, domain D1, quality/security review and actual independent fixture.
Finance tree is read-only and concurrent; no file edits there.

Early provider-authoritative contract posted and exact targets read back:
- #10 https://github.com/k3agan/chh-ops/issues/10#issuecomment-6567475360
- #40 https://github.com/k3agan/chh-ops/issues/40#issuecomment-6567475638

Portable synthetic wire fixtures: `docs/admin-cancellation-post-effect-contract.json`.
They are assertions about the actual POST/pipeline output, not substitute API execution.

Commands use `/Users/k3/.hermes/hermes-agent/venv/bin/python` and the committed
`scripts/verify-cancellation-offline.py`. This runner invokes the installed local
Node/Jest under macOS `(deny network*)`, with an allowlisted environment (no live
keys), existing dependencies only, outputs/TMPDIR inside the ignored
`node_modules/.cache/post-effect` in this tree. No installs, .env loading, live
DB/Stripe/email/Calendar/Seam access or other-tree writes.

- `.../python scripts/verify-cancellation-offline.py d1-independent-red lib/__tests__/domain-independent.test.ts`
  => exit **1**, **2 failed / 1 passed**. Exact copied reviewer tests: successful
  refund followed by DB throw/null loses receipt/reconciliation; calendar-failure
  control passes. Original response lines emitted in local log.
- Expanded actual-handler wire/order/partial/zero/deposit/cleanup/email-audit cases:
  `.../python scripts/verify-cancellation-offline.py d1-contract-red lib/__tests__/domain-independent.test.ts`
  => exit **1**, **13 failed / 2 passed**, 15 cases, before implementation.

RED is deliberately failing regression evidence, not acceptance. No production
source changed in that first milestone.

## Implementation GREEN milestone

`lib/cancel-booking.ts` now retains the verified refund ID/actual CAD amount and
known deposit-release result when the conditional cancellation write throws or
returns null. Both return HTTP502 `REFUND_RECONCILIATION_REQUIRED`,
`refundIssued:true`, `refundStatus:succeeded`, `reconciliationRequired:true`,
`cancellationStatus:unknown`, `cancellationEmailStatus:not_attempted`. It stops
before calendar/access/email and requires reconciliation BEFORE retry. Explicit
zero has no invented receipt and uses `CANCELLATION_RECONCILIATION_REQUIRED`.
An unexpected later cleanup/send/audit exception retains the receipt and verified
`cancellationStatus:cancelled`; email status differentiates not_attempted,
unknown, sent and failed. A sent email followed by an audit exception is not
reclassified failed or retried. Stable Stripe/email idempotency keys and ordering
are unchanged; no auto-retry, persistence layer or distributed transaction added.
The existing authenticated route already propagates structured error details.

`lib/database.ts` explicitly types the conditional return `Booking | null` and
does not claim a null return proves the competing cancellation/refund state.

- `.../python scripts/verify-cancellation-offline.py d1-green-full` => exit **0**,
  **321 passed / 11 suites**, no failures. Includes all 306 previous committed
  tests plus the 15 new domain/wire/order/error tests. Counts overlap earlier
  historical 306/368/reviewer runs and are never summed.
- First typecheck found the original database helper inferred a non-null Booking
  despite its null runtime path. The explicit nullable signature fixes that
  mismatch without casting away the independent null regressions.
- `.../python scripts/verify-cancellation-offline.py d1-green-types-fixed --typecheck`
  => exit **0** (`node .../typescript/bin/tsc --noEmit --incremental false`, network denied).
- `git diff --check` => exit **0**.

This is local provider evidence only. #40 must test the exact corrected head and
actual produced fields; whole #10 and independent CoS acceptance remain pending.

## Durable source / final offline evidence

RED `61c7411cd3c3ef84e7248da792c29c9b83481e2c` and production-source GREEN
`2ee659b1d62c4e4b822c55b0710d682b80b9a890` were individually pushed to the SAME
branch and read back remote-equal. Later work is docs/offline harness/evidence
only. Actual observed DB throw/null JSON bodies and machine execution records
are committed in `engineer-issue10-post-effect-results.json`; no fabricated API
response is used in place of execution.

- Explicit original-bundle rerun:
  `.../python scripts/verify-cancellation-offline.py d1-committed-original-306 --testPathIgnorePatterns domain-independent.test.ts`
  => **306 passed / 10 suites**, exit 0, network denied.
- Final full bundle:
  `.../python scripts/verify-cancellation-offline.py d1-final-full`
  => **321 passed / 11 suites**, exit 0, network denied.
- Final typecheck:
  `.../python scripts/verify-cancellation-offline.py d1-final-types --typecheck`
  => exit 0, network denied.
- Fresh optimized build:
  `.../python scripts/verify-cancellation-build-offline.py /Users/k3/.hermes/cache/scratch/chh-cos-fanout-20261102T002457Z/engineer-font-cache.json`
  => exit 0, **51/51 static pages**. Existing real public font cache read-only;
  no download/install. Build runs with synthetic placeholders, no local env
  files/live keys, network denied, HOME/TMPDIR/output confined to this tree.
  **101 client artifacts scanned, zero canary/server-secret-marker matches**.
  Asset hashes and exact command are in the committed execution evidence.
- Existing unconfigured lint remains **NOT RUN**, not relabelled a pass.

Provider contract/source head also posted/read back at:
- https://github.com/k3agan/chh-ops/issues/10#issuecomment-6567554663
- https://github.com/k3agan/chh-ops/issues/40#issuecomment-6567554375

Finance #40 is concurrently exercising its own actual archived provider to real
CLI subprocess integration. Its active tree was only inspected read-only for
contract coordination; this provider handoff does not certify that consumer or
sum its tests. CoS needs its exact final head/evidence separately. PR6 was read
back OPEN/DRAFT at source head above; no PR mutation performed.

Remaining limits: CoS whole-original-criterion/domain/robustness/polish acceptance
and independent reviewers at exact provider/consumer heads; separately authorized
server-only secret wiring, PRIMARY ownership, production origin/proxy/rate-limit
validation and any live financial/booking/readback action. No production reads,
money, sends, jobs/services/config/profile/access/credential changes, install,
deployment, merge, Kanban, other-tree writes or notification of readiness.
