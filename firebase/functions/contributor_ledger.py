"""
contributor_ledger.py
==================================================================
Turns a PAID ORDER into CONTRIBUTOR EARNINGS.

THE PROMISE THIS CODE KEEPS
---------------------------
A contributor earns 80% of the SALE PRICE on each sale of their kit (75% at or
below $5). The site's commission is the only thing taken off the top, and Whop's
processing fees come out of THAT — never out of the contributor's share. If a
marketer brought the sale, their commission comes out of the contributor's side.
This file is the only place those numbers are calculated. If the promise ever
changes, it changes here.

WHY FEES ARE FETCHED, NOT ESTIMATED
-----------------------------------
Whop exposes the exact, itemised fees for every payment:
    GET /payments/{id}/fees
which includes processing fees AND affiliate commission. We use those real
numbers. Estimating "about 3%" would mean a contributor's share is a guess, and
the first person who checked the arithmetic would be right to distrust the rest
of the system. If the fee lookup fails we do NOT invent a number — the earning
is written with status 'needs_review' for a human to settle.

DECISIONS BAKED IN (Javed, 9 Aug 2026 — FINAL)
----------------------------------------------
  * Site commission  : 25% of the SALE PRICE on kits at $5 or less,
                       20% on kits above $5.
  * Whop's fees      : LazyDog pays them, out of the site commission. The
                       contributor's share is never reduced by them.
  * Marketer         : paid out of the CONTRIBUTOR's side, not the site's.
                       Example agreed with Javed: a $10 kit with a 30% marketer
                       pays site $2, marketer $3, contributor $5.
  * No marketer      : the contributor simply gets 80% (or 75% at/below $5).

    WHY THE MARKETER COMES OFF THE CONTRIBUTOR'S SIDE. It is the contributor
    who chooses the marketer rate, so it is their money being spent on
    promotion. It also keeps the site's margin fixed, which matters because
    Whop's $0.30 fixed fee does not shrink on cheap kits — under the previous
    arrangement a $3 kit with a 40% marketer lost money on every sale.
  * Hold             : 20 days from payment before money can be withdrawn.
                       Longer than the 14-day refund window on purpose — it
                       leaves a 6-day margin after a refund can no longer be
                       claimed, without making the programme feel slow to join.
  * Payouts          : MANUAL. This file never moves money. It records what is
                       owed; a human pays it and marks it paid.
  * Threshold        : $50 before a payout is offered.

MONEY RULES
-----------
  * Everything is USD. The order's `amount` is already the USD figure of record
    (see the webhook in main.py) — never the local currency the buyer saw.
  * Rounding is to whole cents, and apportioned fees use largest-remainder so
    the parts always sum EXACTLY to the whole. Money that vanishes into rounding
    is money someone will eventually ask about.
==================================================================
"""

import math

# ── THE SPLIT (Javed, 9 Aug 2026 — FINAL) ───────────────────────────────────
# Site commission is a percentage of the SALE PRICE, and it is the ONLY thing
# the site takes. Whop's fees come out of it.
SITE_PCT_CHEAP   = 25.0     # kits priced at or below the threshold
SITE_PCT_NORMAL  = 20.0     # kits priced above it
CHEAP_THRESHOLD  = 5.00     # dollars, inclusive: <= 5.00 counts as cheap

HOLD_DAYS            = 20        # before earnings become withdrawable
PAYOUT_THRESHOLD_USD = 50.0      # minimum balance before a payout is offered


def site_percent_for(gross_usd):
    """The site's cut for a sale at this price. Inclusive at the threshold —
    a $5.00 kit is 'cheap' (25%), a $5.01 kit is not (20%)."""
    try:
        g = float(gross_usd)
    except (TypeError, ValueError):
        return SITE_PCT_CHEAP          # unknown price: take the safer figure
    return SITE_PCT_CHEAP if g <= CHEAP_THRESHOLD else SITE_PCT_NORMAL

_COLLECTION = 'earnings'


def _cents(x):
    """USD float -> integer cents. All internal maths is in cents so that
    fractions of a cent can never quietly accumulate."""
    try:
        return int(round(float(x) * 100))
    except (TypeError, ValueError):
        return 0


def _dollars(c):
    return round(c / 100.0, 2)


def fetch_payment_fees(whop, payment_id):
    """Return (total_fee_cents, breakdown_list, ok).

    `whop` is the whop_store_sync module (passed in so this file has no
    network code of its own and stays easy to test).
    ok=False means we could not determine the fees — the caller must NOT
    guess, and must flag the earning for review instead.
    """
    if not payment_id:
        return (0, [], False)
    code, body = whop._request('GET', f'/payments/{payment_id}/fees')
    if code != 200 or not isinstance(body, dict):
        print(f'[ledger] fee lookup failed for {payment_id} (HTTP {code})')
        return (0, [], False)

    rows = body.get('data')
    if not isinstance(rows, list):
        return (0, [], False)

    total, breakdown = 0, []
    for r in rows:
        if not isinstance(r, dict):
            continue
        ccy = str(r.get('currency') or 'usd').lower()
        if ccy != 'usd':
            # A non-USD fee cannot be subtracted from a USD sale without an
            # exchange rate we do not have. Refuse rather than approximate.
            print(f'[ledger] non-USD fee ({ccy}) on {payment_id} — needs review')
            return (0, [], False)
        c = _cents(r.get('amount'))
        total += c
        breakdown.append({'name': str(r.get('name') or ''),
                          'type': str(r.get('type') or ''),
                          'amount': _dollars(c)})
    return (total, breakdown, True)


def apportion(total_cents, weights):
    """Split total_cents across weights so the parts sum EXACTLY to the total.

    Largest-remainder method. A cart of three items sharing a $0.46 fee must
    give back 46 cents, not 45 or 47 — the leftover cent is handed to whichever
    line had the largest fractional claim on it.
    """
    if total_cents <= 0 or not weights:
        return [0] * len(weights)
    wsum = sum(weights)
    if wsum <= 0:
        return [0] * len(weights)

    exact  = [total_cents * w / wsum for w in weights]
    floors = [int(math.floor(e)) for e in exact]
    left   = total_cents - sum(floors)
    order  = sorted(range(len(weights)), key=lambda i: exact[i] - floors[i],
                    reverse=True)
    for i in range(left):
        floors[order[i % len(order)]] += 1
    return floors


def record_earnings(db, whop, order_id, order, owner_uids, firestore_mod):
    """Create one earnings row per contributor line in a paid order.

    Idempotent: the row id is derived from the order, so a webhook delivered
    twice (Whop guarantees at-least-once) cannot pay anyone twice.
    Never raises — an accounting problem must not break order delivery.
    """
    try:
        items = order.get('items') or []
        if not items:
            return

        owner = set(owner_uids or [])
        # Which lines belong to someone other than the house?
        contrib_idx = [i for i, it in enumerate(items)
                       if isinstance(it, dict)
                       and it.get('sellerId')
                       and it['sellerId'] not in owner]
        if not contrib_idx:
            return                       # nothing owed to anyone

        payment_id = str(order.get('whopPaymentId') or '')
        fee_cents, fee_rows, fees_ok = fetch_payment_fees(whop, payment_id)

        # The MARKETER's commission is a real deduction from the contributor's
        # side, so it must be identified separately from Whop's processing
        # fees, which the site absorbs. Whop reports it as its own fee line.
        AFFILIATE_FEE_TYPES = {'marketplace_affiliate_fee', 'affiliate_fee'}
        aff_cents = 0
        for r in (fee_rows or []):
            if str(r.get('type') or '') in AFFILIATE_FEE_TYPES:
                aff_cents += _cents(r.get('amount'))

        gross_all = [_cents(it.get('unitAmount')) for it in items]
        if sum(gross_all) <= 0:
            # Single-item orders may only carry the order-level amount.
            gross_all = [_cents(order.get('amount'))] + [0] * (len(items) - 1)

        # The marketer commission belongs to the WHOLE payment, so split it
        # across the lines by value. A contributor must not carry the marketing
        # cost of somebody else's item in the same basket.
        aff_split = apportion(aff_cents, gross_all) if fees_ok else [0] * len(items)

        # Whop's own processing fees, split the same way. These are OUR cost,
        # never the contributor's — recorded only so the books are complete.
        whopfee_split = (apportion(max(fee_cents - aff_cents, 0), gross_all)
                         if fees_ok else [0] * len(items))

        paid_at = order.get('createdDate')

        for i in contrib_idx:
            it     = items[i]
            gross  = gross_all[i]
            marketer = aff_split[i]

            # THE SPLIT. Site takes its percentage of the SALE PRICE; the
            # marketer is paid from the contributor's side; the contributor
            # keeps what is left. Whop's processing fees are NOT deducted here
            # — the site pays those out of its own commission.
            site_pct   = site_percent_for(gross / 100.0)
            site_cents = int(round(gross * site_pct / 100.0))
            share      = max(gross - site_cents - marketer, 0)

            # Recorded for the contributor's page and for our own accounting.
            fees   = 0                      # never charged to the contributor
            net    = gross - marketer       # what the split was taken from

            row_id = f'{order_id}__{i}'
            ref    = db.collection(_COLLECTION).document(row_id)
            if ref.get().exists:
                continue                 # already recorded — at-least-once delivery

            ref.set({
                'orderId':        order_id,
                'itemIndex':      i,
                'contributorUid': it.get('sellerId'),
                'kitId':          it.get('productId'),
                'kitTitle':       it.get('productTitle') or '',
                'licence':        it.get('licence') or 'personal',

                'grossUsd':       _dollars(gross),
                'marketerUsd':    _dollars(marketer),   # paid from THEIR side
                'siteUsd':        _dollars(site_cents), # our commission
                'sitePercent':    site_pct,
                'feesUsd':        _dollars(fees),           # always 0 — we absorb them
                'whopFeesUsd':    _dollars(whopfee_split[i]),  # our cost, for our books
                'netUsd':         _dollars(net),
                'earnedUsd':      _dollars(share),
                'feeBreakdown':   fee_rows if fees_ok else [],

                # 'held'         -> inside the 20-day window
                # 'available'    -> withdrawable
                # 'paid'         -> a human sent the money
                # 'reversed'     -> refunded or charged back
                # 'needs_review' -> fees unknown; do NOT pay until settled
                'status':         'held' if fees_ok else 'needs_review',
                'holdDays':       HOLD_DAYS,
                'paidAt':         paid_at,
                'createdAt':      firestore_mod.SERVER_TIMESTAMP,
                'whopPaymentId':  payment_id,
            })
            print(f'[ledger] {row_id}: {it.get("sellerId")} earns '
                  f'${_dollars(share):.2f} of ${_dollars(gross):.2f} '
                  f'(site {site_pct:.0f}% = ${_dollars(site_cents):.2f}, '
                  f'marketer ${_dollars(marketer):.2f})'
                  + ('' if fees_ok else '  ** FEES UNKNOWN — needs review **'))
    except Exception as e:
        # Deliberately swallowed. The buyer has paid and must get their file;
        # a ledger fault is repairable from the order record afterwards.
        print(f'[ledger] record_earnings FAILED for {order_id}: {e}')


def reverse_earnings(db, order_id, reason='refund'):
    """A refund or chargeback undoes the contributor's claim on that money.

    Only touches rows that have not been paid out yet. If money has already
    left, that is a debt to settle by hand — the code must not silently pretend
    otherwise, so those rows are flagged instead of altered.
    """
    try:
        rows = db.collection(_COLLECTION).where('orderId', '==', order_id).stream()
        for doc in rows:
            d = doc.to_dict() or {}
            if d.get('status') == 'paid':
                doc.reference.set({'status': 'paid_then_refunded',
                                   'reversalReason': reason,
                                   'needsAttention': True}, merge=True)
                print(f'[ledger] {doc.id} was ALREADY PAID and is now refunded '
                      f'— manual recovery needed')
            else:
                doc.reference.set({'status': 'reversed',
                                   'reversalReason': reason}, merge=True)
                print(f'[ledger] {doc.id} reversed ({reason})')
    except Exception as e:
        print(f'[ledger] reverse_earnings FAILED for {order_id}: {e}')
