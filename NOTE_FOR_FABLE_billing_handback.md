# Note for Fable — billing chain hand-back
*(from Opus, 20 Aug 2026. Javed is handing the token/billing chain back to you.
Everything below is fact-checked against the code, not assumed. Nothing here has
been verified at runtime — the deploy is still the first real test.)*

---

## Read this first

The Whop side is finished and working. The **token ledger has never been able to
write to Firestore**, so no part of it can have been exercised end to end. I
found three faults; I have edited `functions/main.py` for all three but **the
file is NOT deployed**. If you prefer to review before shipping, revert my edits
and redo them your way — but the three faults are real either way.

Files touched, all in `firebase/functions/`:
- `main.py` — the three fixes below, plus new admin modes
- `whop_store_sync.py` — subscription plan creation

---

## FAULT 1 — there was no module-level `db`

`_ensure_billing`, `_apply_renewal`, `_token_debit`, `token_balance`,
`admin_billing` and `_claim_pending_grant` all reference a bare `db`.

No such global existed anywhere in `main.py`. Every other function in the file
creates its own local `db = firestore.client()`; the billing block assumed a
global that was never defined.

Consequence: any call into those helpers raised `NameError`. A paid subscription
would have taken the money and granted zero tokens. New accounts never received
`signupTokens`. No charge could ever be debited. It was invisible because the
call sites sit inside `try/except` that log and continue.

**Fix applied** — `main.py` line ~92, immediately after `initialize_app()`:

```python
db = firestore.client()
```

How it surfaced: the admin grant tool I added returns the exception text instead
of swallowing it, and answered `{"error": "name 'db' is not defined"}`.

---

## FAULT 2 — `firestore.SERVER_TIMESTAMP` does not exist

`from firebase_admin import firestore` gives you the **firebase_admin** wrapper
module, which exports `client()` and little else. `SERVER_TIMESTAMP` lives on
`google.cloud.firestore`, which `main.py` already imports at line 57.

Seven call sites used the short form and would raise `AttributeError`:

| Line (pre-edit) | Function |
|---|---|
| 1950 | `_claim_pending_grant` |
| 1968 | `_ensure_billing` |
| 1992 | `_token_debit` |
| 2023, 2025 | `_apply_renewal` |
| 2090 | `admin_billing` → grant |
| 2404 | `contributor_payout_http` |

That last one matters beyond billing: **contributor payouts would have failed
too**, and that path has never been run.

**Fix applied** — all seven now use `google.cloud.firestore.SERVER_TIMESTAMP`,
matching the ~30 other call sites already in the file.

---

## FAULT 3 — two advertised charges are not collected (YOURS)

`_BILLING_DEFAULTS['costs']` defines four rates. Two are enforced, two are not:

| Rate | Value | Enforced? |
|---|---|---|
| `composePerSlide` | 5 | ✅ `composer_proxy`, `_leaf == 'compose_ir'` |
| `fillPerSlide` | 12 | ✅ `ai_fill_http` |
| `pngDecompose` | 25 | ❌ **no charge anywhere in main.py** |
| `pdfDecomposePerPage` | 20 | ❌ **no charge anywhere in main.py** |

Both implemented gates are correct: they check balance before, return HTTP 402
`tokens_over`, and debit only after the work succeeds. I did not touch either.

The two unenforced rates are printed on the **public pricing page**
(`/pricing.html`) as "Turn one PDF page into slides — 20" and "Turn one PNG into
an editable slide — 25". So the site currently promises a charge nothing
collects. Dissolve runs as its own service, so this is your call:

- charge inside the dissolve service, or
- route dissolve through a proxy in `main.py` and gate it like the other two, or
- tell Javed and we drop those two lines from the pricing page.

**Do not leave it as it is** — either bill it or stop advertising it.

---

## What is already done and should not be rebuilt

**Whop plans — live and correct.** Product `prod_rrye6AbFfA7jD`:

| Key | Price | Charge |
|---|---|---|
| `pro` | $19 | every 30 days |
| `studio` | $39 | every 30 days |
| `proAnnual` | $192 | every 365 days |
| `studioAnnual` | $408 | every 365 days |
| `annualFlex` | $50 | one-time, never renews |

Two traps worth knowing, both found the hard way on the live checkout:

1. On a `renewal` plan Whop treats `initial_price` as a **one-off setup fee on
   top of** the first period. Setting it to the sticker price made a $19 plan
   quote $38. Renewal plans now send `initial_price: 0` + `renewal_price: N`.
   One-time plans are the opposite — there `initial_price` **is** the price and
   `renewal_price` must be omitted.
2. `plan_type` cannot be edited after creation. To change it you delete and
   recreate. `?subplans=1&reset=1` does exactly that and rewrites the map.

**`billing_config/main`** holds `whopPlanMap` (plan id → plan key) and
`whopSubProductId`. The webhook reads `planKey` from the plan's own metadata
first and falls back to this map. Firestore rules now allow **public read** on
`billing_config` (writes still server-only) so `/pricing.html` can show live
prices instead of hard-coded ones.

**Webhook** (`whop_webhook_http`) — the subscription branch sits **above** the
kit lookup and above the "no kit and no cart → skip" guard. It must stay there:
a subscription payment has neither, so below the guard it would be silently
discarded. It resolves `planKey`, calls `_apply_renewal`, records
`billing_events/{payId}`, and parks a grant under the buyer's email in
`pending_grants` when no account exists yet (claimed by `_claim_pending_grant`
on first sign-in). Cancellation events set `plan: 'free'` and **never** zero the
balance — Javed's rule: tokens already paid for stay paid for.

**`apply_annual_allowances`** — daily 03:45, tops up `proAnnual`/`studioAnnual`
users whose `tokensExpireAt` has passed while `whopSubActiveUntil` is still in
the future. `annualFlex` is excluded by design (one grant, 366 days).

**New admin modes on `whop_backfill_http`** (all token-guarded):
`&grant=<email>&plan=pro` · `&subplans=1[&reset=1]` · `&fixsubprices=1` ·
`&orphans=1[&hide=1|&delete=1]` · `&files=1` · `&regallery=1` · `&dupes=1`.
`&delplans=` now refuses any id in `whopPlanMap`, so a typo can't kill a live
subscription plan.

---

## First thing after deploy

```
…/whop_backfill_http?token=<WHOP_BACKFILL_TOKEN>&grant=Pakrngr33995@gmail.com&plan=pro
```

Returns a balance instead of an error = the ledger can write, and all three
faults above are genuinely closed. That account is the Microsoft Store
certification test account and needs an active plan on it.

Then the thing nobody has done yet: **one real payment, end to end.** Every
path here is reasoned but unproven.

---

*Sorry for the state of the hand-off. The three faults are all "name doesn't
resolve" — the kind a single run would have caught, and I checked that the
functions existed rather than that they ran.*
