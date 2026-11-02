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
source has changed in this first milestone; next correction preserves known
receipt/cancellation uncertainty and stopped downstream effects without retries.
