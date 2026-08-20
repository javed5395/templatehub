# Note for Opus — wire Whop payments to the new Token Ledger
*(from Fable, 20 Aug 2026 — Javed will hand you this. The ledger is built,
tested and deployed; ONLY the Whop→ledger wiring remains, and you own the
existing Whop code, so this lands in your territory.)*

## What already exists (do not rebuild any of this)

All in `firebase/functions/main.py`, deployed:

- **Ledger**: `users/{uid}.tokens` (int balance), audit trail at
  `users/{uid}/token_ledger`. New sign-ins are seeded `signupTokens` (40) on
  first touch via `_ensure_billing(uid)`.
- **Charging gateways** (check before, debit only after success):
  - `composer_proxy` → compose_ir costs `costs.composePerSlide` (5) × slides
  - `ai_fill_http` → costs `costs.fillPerSlide` (12) × slides
  - Insufficient balance → HTTP 402 `{error:'tokens_over', need, balance, message}`
  - Admin (`TRUSTED_UIDS`) never charged.
- **Config**: everything lives in Firestore `billing_config/main`, merged over
  `_BILLING_DEFAULTS` — costs, plans, `carryForwardPct` (50), `graceDays` (30),
  `signupTokens`. Cached 60s (`_billing_cfg()`); `admin_billing setConfig`
  busts the cache. **Never hard-code a price anywhere.**
- **Plans** (keys in config → use these exact keys):
  `pro` (1500/mo), `studio` (3750/mo), `proAnnual`, `studioAnnual`
  (monthly allowance, billed annually), `annualFlex` (6000, periodDays 366,
  no monthly expiry).
- **`_apply_renewal(uid, plan_key)`** — THE function you call on payment.
  It already implements Javed's rules verbatim: grants the plan's tokens,
  adds `carryForwardPct`% of the unused balance if the renewal happens
  before `tokensExpireAt + graceDays`, expires the old balance to zero past
  grace, sets `tokensExpireAt = now + periodDays`, writes a ledger entry.
  Do not reimplement carry-forward/grace — call this.
- **`admin_billing`** endpoint (TRUSTED_UIDS only):
  `getConfig | setConfig | grant(uid,tokens) | renew(uid,plan) | balance(uid)`.
- **Editor chip**: `token_balance` endpoint; the editor polls it and shows
  "⚡ N tokens". Nothing for you to do client-side except (optionally) a
  "Subscribe" link target.

## What you need to build

1. **Whop products → plan keys.** Create/confirm Whop products for the five
   plans. Keep a mapping in `billing_config/main` (e.g.
   `whopPlanMap: { "<whop_product_or_plan_id>": "pro", ... }`) — config, not
   code, so Javed can remap without a deploy.

2. **In `whop_webhook_http`** (your existing function): on a *successful
   payment / subscription renewal* event:
   - resolve the buyer to a Firebase `uid` (you already match Whop buyers to
     site accounts for kit purchases — reuse that path; if no account exists,
     store the grant pending under their email and apply on first sign-in),
   - look up the plan key via `whopPlanMap`,
   - call `_apply_renewal(uid, plan_key)`. That's the whole grant.
   - Idempotency: Whop retries webhooks — record the event id
     (e.g. `billing_events/{whop_event_id}`) and skip if already processed,
     otherwise a retry double-grants tokens.

3. **On cancellation / refund events**: do NOT zero the balance (Javed's
   grace rule = tokens live until `tokensExpireAt` + 30 days grace). Just
   set `users/{uid}.plan = 'free'` so the UI stops showing the plan name.
   Refund-with-clawback, if Javed ever wants it, is a separate decision.

4. **Annual billing note**: `proAnnual`/`studioAnnual` are billed yearly by
   Whop but the allowance is MONTHLY (periodDays 31). So a yearly payment
   must schedule 12 monthly `_apply_renewal` calls — simplest: a scheduled
   function (there is already `run_design_schedules`) that scans users whose
   `plan in (proAnnual, studioAnnual)` and `tokensExpireAt < now`, and
   re-applies the plan while their Whop subscription is active (store
   `whopSubActiveUntil` from the webhook). `annualFlex` is one single grant —
   no monthly re-apply, `_apply_renewal` already sets 366 days.

5. **Checkout entry point**: the 402 `tokens_over` message tells users to
   subscribe — add the actual link. `whop-checkout.js` on the site already
   opens Whop checkouts; expose a small "Subscribe" page/modal listing the
   plans (prices read from `billing_config`, not hard-coded) and open the
   matching Whop checkout.

## Rules recap (Javed's, binding)
Normal editing is FREE. Automated processing is PAID. Prices/limits are
admin-editable only via `billing_config` / `admin_billing`. Carry-forward
50% within 30-day grace; past grace the balance dies. Do not touch the
gateway logic in `composer_proxy` / `ai_fill_http` — it is tested.
