"""
whop_store_sync.py
==================================================================
Auto-sync each SELLABLE kit to its OWN Whop store product.

WHY THIS EXISTS
---------------
The old flow (ensure_whop_plan in main.py) created every kit's plan UNDER ONE
shared Whop product (WHOP_PRODUCT_ID). That is:
  - messy on Whop's store page ("+18 options" under one product), and
  - a single point of failure (delete that one product and EVERY kit's
    checkout dies at once — dangerous once freelancers are selling too).

This module gives every kit its OWN product (own page, image, price), which
Whop's own team recommended and which removes the single-point-of-failure.

BEHAVIOUR (agreed with the owner)
---------------------------------
  * Opt-in: a kit only syncs when its flag  template.listOnWhop == True
            (default OFF — nothing syncs unless you tick it).
  * Type filter: only real kits sync (see SELLABLE_CATEGORIES). Blogs, and
                 anything not in that set, NEVER touch Whop.
  * Create: makes a store-VISIBLE product + one-time plan, stamps the kit id
            into metadata (so the webhook can map a sale back to the kit),
            uploads the kit image, and submits the product to Whop Discover.
  * Edit sync: change price / name on an already-synced kit -> the Whop
               product & plan are PATCHed to match.
  * Delete: archive_kit() removes the product from the store (hard-delete if
            it never sold, else archive).
  * Backfill: backfill_existing_kits() migrates the kits you already have.

SAFE BY DEFAULT
---------------
Nothing here runs unless listOnWhop is True, so wiring it into main.py can NOT
break your existing website checkout. Every network call is wrapped and only
logs on failure — it never raises into your Firestore trigger.

⚠️ THINGS TO CONFIRM IN SANDBOX (marked "TODO:CONFIRM" below)
  1. IMAGE_FIELDS — which template field actually holds the kit's image URL.
  2. The Discover "publish" endpoint path (beta; verify the exact slug).
  3. The shape of the create-product response (where the new plan id sits).
Test all of this against Whop's SANDBOX first (see the test checklist).
==================================================================
"""

import os
import re
import json
import math
import time
import urllib.request as _req
import urllib.error as _err

# ------------------------------------------------------------------ config
WHOP_API_KEY    = os.environ.get('WHOP_API_KEY', '')
WHOP_COMPANY_ID = os.environ.get('WHOP_COMPANY_ID', 'biz_Gcp6QItyQzeqwp')
# Sandbox base: https://sandbox-api.whop.com/api/v1   (use this while testing!)
WHOP_API_BASE   = os.environ.get('WHOP_API_BASE', 'https://api.whop.com/api/v1')
# Pins the experimental/beta endpoints so they don't shift under us.
WHOP_API_VERSION = os.environ.get('WHOP_API_VERSION', '2026-08-05')

# Only these categories may ever reach Whop. Anything else (blogs, etc.) is
# ignored. Values match DESIGN_PREFIX in main.py.
SELLABLE_CATEGORIES = {
    'pitch_deck', 'media_kit', 'web_kit', 'resume_cv', 'digital_keynotes',
}

# ── CONTRIBUTOR / AFFILIATE PROGRAM ──────────────────────────────────────────
# Whop runs TWO separate affiliate programs, and they mean different things:
#
#   global_affiliate_*  — ANYONE on the Whop marketplace can grab the kit,
#                         promote it with their own link, and earn this % of
#                         each sale they bring. This is the "contributor
#                         program" — anyone picks a kit and sells it.
#   member_affiliate_*  — only people who ALREADY BOUGHT from you earn this %
#                         when they refer a new customer.
#
# Both are set per product, so every auto-created kit gets them automatically.
# Change the rate here (or set the env var) — no code edit needed.
#
# NOTE ON THE NUMBERS: 40% of a $13 kit = $5.20 to the affiliate. Whop's own
# fees and the 0.8% payment-orchestration fee come out of your remaining share.
# Fine for digital goods (no cost per copy), but worth remembering on the
# cheaper $3–4 kits where 40% is ~$1.40.
AFFILIATE_PERCENT = float(os.environ.get('WHOP_AFFILIATE_PERCENT', '40'))

# Member affiliate is OFF by default. Set WHOP_MEMBER_AFFILIATE_PERCENT to a
# number (e.g. '40') to also let existing buyers earn on referrals.
_member_raw = os.environ.get('WHOP_MEMBER_AFFILIATE_PERCENT', '').strip()
MEMBER_AFFILIATE_PERCENT = float(_member_raw) if _member_raw else None


AFFILIATE_MAX = 40.0     # ceiling — see _affiliate_percent_for


def _affiliate_percent_for(kit_doc):
    """The affiliate rate for THIS kit, 0-40.

    PER-KIT, not global (9 Aug 2026, Javed's decision). Whoever uploads a kit
    chooses what a marketer earns for selling it, because that commission comes
    out of the sale before the 75/25 split — so it is mostly the uploader's own
    money being spent on promotion, and theirs to decide.

    Why a ceiling of 40: past that, the sale stops paying for the risk attached
    to it. A single chargeback costs a flat $15 regardless of the sale size, and
    that lands on us, not the marketer.

    Why 0 is allowed: on a $60-150 kit, 40% is a lot of money to hand over, and
    the owner may prefer to sell fewer at full margin. The trade-off is real —
    affiliates on Whop pick what pays, so a 0% kit gets no promotion.

    Anything missing or unparseable falls back to the account default rather
    than to zero: a kit that silently stopped paying affiliates would look like
    it had simply stopped selling.

    FIXED AMOUNTS. The uploader may instead say "pay the marketer $25". Whop has
    no flat-amount affiliate field — VERIFIED against its product schema on
    9 Aug 2026, only global_affiliate_percentage exists — so an amount is
    converted to the equivalent percentage of THIS kit's price. The original
    intent is stored alongside, and the percentage is recomputed here on every
    sync, so changing a kit's price keeps the marketer on the amount that was
    actually promised instead of silently re-pricing it.
    """
    t = (kit_doc or {}).get('template') or {}

    def _pick(key):
        v = t.get(key)
        return v if v is not None else (kit_doc or {}).get(key)

    mode = str(_pick('affiliateMode') or 'percent').strip().lower()

    if mode == 'amount':
        price = _parse_price(_pick('price'))
        try:
            amount = float(_pick('affiliateValue'))
        except (TypeError, ValueError):
            return AFFILIATE_PERCENT
        if not price or price <= 0 or amount <= 0:
            return 0.0
        return max(0.0, min(amount / price * 100.0, AFFILIATE_MAX))

    raw = _pick('affiliatePercent')
    if raw is None or str(raw).strip() == '':
        return AFFILIATE_PERCENT
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return AFFILIATE_PERCENT
    if v < 0:
        return 0.0
    return min(v, AFFILIATE_MAX)


def _affiliate_fields(kit_doc=None):
    """The affiliate settings applied to a kit's product."""
    out = {}
    pct = _affiliate_percent_for(kit_doc) if kit_doc is not None else AFFILIATE_PERCENT
    if pct and pct > 0:
        out['global_affiliate_status']     = 'enabled'
        out['global_affiliate_percentage'] = pct
    else:
        out['global_affiliate_status'] = 'disabled'
    if MEMBER_AFFILIATE_PERCENT and MEMBER_AFFILIATE_PERCENT > 0:
        out['member_affiliate_status']     = 'enabled'
        out['member_affiliate_percentage'] = MEMBER_AFFILIATE_PERCENT
    return out

# TODO:CONFIRM — first field that holds a real http(s) image URL wins.
# Check your Firestore 'templates' docs and add the correct key if missing.
IMAGE_FIELDS = (
    'coverImage', 'coverUrl', 'image', 'imageUrl', 'previewUrl',
    'preview', 'thumbnail', 'thumbUrl', 'heroImage', 'bannerUrl',
)

_COLLECTION = 'templates'


# ------------------------------------------------------------------ helpers
def _headers(extra=None):
    h = {
        'Authorization': f'Bearer {WHOP_API_KEY}',
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Api-Version-Date': WHOP_API_VERSION,
    }
    if extra:
        h.update(extra)
    return h


def _request(method, path, body=None, timeout=25):
    """Return (status_code, parsed_json_or_None). Never raises."""
    if not WHOP_API_KEY:
        print('[whop-sync] WHOP_API_KEY not set — skipping every call')
        return (0, None)
    url = WHOP_API_BASE.rstrip('/') + path
    data = json.dumps(body).encode() if body is not None else None
    req = _req.Request(url, data=data, method=method, headers=_headers())
    try:
        with _req.urlopen(req, timeout=timeout) as r:
            txt = r.read().decode()
            return (r.status, json.loads(txt) if txt else {})
    except _err.HTTPError as e:
        detail = ''
        try:
            detail = e.read().decode()[:500]
        except Exception:
            pass
        print(f'[whop-sync] {method} {path} -> HTTP {e.code}: {detail}')
        return (e.code, None)
    except Exception as e:
        print(f'[whop-sync] {method} {path} failed: {e}')
        return (0, None)


def request_verbose(method, path, body=None, timeout=25, limit=1500):
    """Like _request, but returns Whop's ERROR TEXT instead of discarding it.

    _request logs the detail and returns None, which is fine in production but
    useless from outside the logs. Chasing a 403 with no message cost real time
    on 9 Aug 2026, so diagnostics use this instead. Never raises.
    """
    if not WHOP_API_KEY:
        return (0, 'WHOP_API_KEY not set')
    url = WHOP_API_BASE.rstrip('/') + path
    data = json.dumps(body).encode() if body is not None else None
    req = _req.Request(url, data=data, method=method, headers=_headers())
    try:
        with _req.urlopen(req, timeout=timeout) as r:
            return (r.status, r.read().decode()[:limit])
    except _err.HTTPError as e:
        try:
            return (e.code, e.read().decode()[:limit])
        except Exception:
            return (e.code, '(no body)')
    except Exception as e:
        return (0, f'{type(e).__name__}: {e}')


def _parse_price(raw):
    """Positive float USD, or None if free/invalid. Mirrors main._parse_price."""
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if s in ('', 'free', '0', '0.0'):
        return None
    m = re.search(r'-?\d+(\.\d+)?', s)
    if not m:
        return None
    try:
        val = float(m.group(0))
    except ValueError:
        return None
    if val <= 0 or val > 100000:
        return None
    return round(val, 2)


def _kit_image_url(t):
    for f in IMAGE_FIELDS:
        v = t.get(f)
        if isinstance(v, str) and v.startswith('http'):
            return v
    return None


# How many slide previews to put in the Whop gallery (cover + the next few).
# Kept deliberately small: each one is a download + upload + attach-with-retry,
# so 13 kits x 20 slides would be slow and risk rate limits — and showing every
# slide of a paid template lets people screenshot the whole thing.
GALLERY_MAX = int(os.environ.get('WHOP_GALLERY_MAX', '6'))
# Set WHOP_GALLERY_MAX=0 to upload EVERY slide instead of just the first few.
if GALLERY_MAX <= 0:
    GALLERY_MAX = 10_000

# Whether the listing may advertise "Design brief (PDF)" in the Includes line.
# OFF by default on purpose: only turn this on once you have confirmed the
# brief really ships inside the buyer's download. Never advertise a file the
# buyer does not receive.
CLAIM_DESIGN_BRIEF = os.environ.get(
    'WHOP_CLAIM_DESIGN_BRIEF', 'false').strip().lower() in ('1', 'true', 'yes')


def _kit_gallery_urls(t, limit=None):
    """Cover image first, then the following slides, de-duplicated.

    Returns at most `limit` http(s) URLs.
    """
    limit = limit or GALLERY_MAX
    urls, seen = [], set()

    def _add(u):
        if isinstance(u, str) and u.startswith('http') and u not in seen:
            seen.add(u)
            urls.append(u)

    _add(_kit_image_url(t))                       # cover always first
    for key in ('slides', 'slideImages'):         # then the deck itself
        arr = t.get(key)
        if isinstance(arr, list):
            for u in arr:
                _add(u)
                if len(urls) >= limit:
                    return urls
    return urls[:limit]


# Whop REQUIRES a headline before a product can be published to Discover
# ("You must set a headline for your product"). Most kits have an empty
# description, so build a sensible one from the data we do have.
_CATEGORY_LABEL = {
    'pitch_deck':       'Pitch deck template',
    'media_kit':        'Media kit template',
    'web_kit':          'Website UI kit',
    'resume_cv':        'Resume / CV template',
    'digital_keynotes': 'Keynote template',
}


def _headline(t):
    """Short marketing line, always non-empty (Whop requires it)."""
    existing = (t.get('headline') or '').strip()
    if existing:
        return existing[:80]

    label  = _CATEGORY_LABEL.get(
        str(t.get('category') or '').strip().lower(), 'Editable template')
    slides = t.get('slideCount') or t.get('slides')
    if isinstance(slides, list):
        slides = len(slides)
    parts = [label]
    if isinstance(slides, int) and slides > 0:
        parts.append(f'{slides} slides')
    types = t.get('fileTypes') or []
    if isinstance(types, list) and types:
        parts.append(''.join(str(x).upper().replace('.', ' ') for x in types[:3]).strip())
    parts.append('instant download')
    return ' · '.join(parts)[:80]


def _description(t):
    """Product page body. Falls back to a built one when the kit has none."""
    for key in ('description', 'designNotes'):
        v = (t.get(key) or '').strip()
        if v:
            return v[:1000]
    label  = _CATEGORY_LABEL.get(
        str(t.get('category') or '').strip().lower(), 'Editable template')
    apps   = t.get('editableApps') or []
    types  = t.get('fileTypes') or []
    slides = t.get('slideCount') or (
        len(t.get('slides')) if isinstance(t.get('slides'), list) else None)

    lines = [f'{label} by LazyDog Templates. Fully editable — edit every element '
             f'without breaking the layout.']
    if isinstance(slides, int) and slides > 0:
        lines.append(f'{slides} ready-made slides.')
    if isinstance(apps, list) and apps:
        lines.append('Editable in: ' + ', '.join(str(a) for a in apps) + '.')

    # ── WHAT'S INCLUDED ──────────────────────────────────────────────────────
    # ONLY claim what the buyer actually receives. Advertising a file that is
    # not in the delivered package is a refund/dispute waiting to happen, so
    # every entry here is driven by real data, never assumed.
    inc = [str(x).upper().lstrip('.') for x in types] if isinstance(types, list) else []

    # The design brief is the CLEAN description PDF (never the _SYSTEM one —
    # that carries the private coded metadata and must never be exposed).
    # Gated twice: the kit must actually have one, AND the claim must be
    # switched on. Off by default: the brief only belongs in this list if your
    # delivered download really contains it.
    if CLAIM_DESIGN_BRIEF and (t.get('pdfUrl') or '').strip():
        inc.append('Design brief (PDF)')

    if inc:
        lines.append('Includes: ' + ', '.join(inc) + '.')

    lines.append('Instant download after purchase.')
    return '\n\n'.join(lines)[:1000]


def _upload_image(image_url):
    """Whop won't take an image by URL: download the bytes, then push them to
    Whop's Files API (presigned S3). Returns a file id or None. Best-effort."""
    if not image_url:
        return None
    try:
        with _req.urlopen(image_url, timeout=25) as r:
            content = r.read()
    except Exception as e:
        print(f'[whop-sync] image download failed ({image_url}): {e}')
        return None

    fname = (image_url.split('/')[-1].split('?')[0]) or 'banner.png'
    _, body = _request('POST', '/files',
                       body={'filename': fname, 'visibility': 'public'})
    if not body or not body.get('id') or not body.get('upload_url'):
        print('[whop-sync] /files did not return an upload target')
        return None

    file_id     = body['id']
    upload_url  = body['upload_url']
    up_headers  = body.get('upload_headers') or {}
    try:
        put = _req.Request(upload_url, data=content, method='PUT',
                           headers={k: str(v) for k, v in up_headers.items()})
        with _req.urlopen(put, timeout=60):
            pass
    except Exception as e:
        print(f'[whop-sync] image PUT to S3 failed: {e}')
        return None
    return file_id


def _extract_plan_id(product_body):
    """Pull a plan id out of the create-product response, if one came back."""
    if not isinstance(product_body, dict):
        return None
    for key in ('plans', 'plan_options', 'plan'):
        v = product_body.get(key)
        if isinstance(v, list) and v and isinstance(v[0], dict) and v[0].get('id'):
            return v[0]['id']
        if isinstance(v, dict) and v.get('id'):
            return v['id']
    return None


def _commercial_price(personal, kit_doc=None):
    """Commercial licence price. ONE rule, defined here and nowhere else.

    THE UPLOADER SETS IT (Javed, 9 Aug 2026). The upload form has two price
    boxes — single-use and commercial — and whatever is typed in the second one
    is what gets charged. A designer knows what their own work is worth better
    than a formula does, and on a $150 kit the difference between a fixed
    multiplier and a considered price is real money.

    FALLBACK: 1.5x rounded UP to a whole dollar, used only when no commercial
    price was given. That keeps every kit uploaded before this change working
    exactly as it did ($4 -> $6, $5 -> $8, $18 -> $27), and means a contributor
    who ignores the second box still ends up with a sane commercial licence
    rather than none at all.

    Rounding UP, never nearest, so the fallback can never land below 1.5x.
    """
    if kit_doc is not None:
        t = (kit_doc or {}).get('template') or {}
        raw = t.get('commercialPrice', (kit_doc or {}).get('commercialPrice'))
        chosen = _parse_price(raw)
        if chosen:
            return float(chosen)

    try:
        p = float(personal)
    except (TypeError, ValueError):
        return None
    if p <= 0:
        return None
    return float(math.ceil(p * 1.5))


def _plan_metadata(kit_id, licence):
    """Metadata stamped on every plan.

    Whop copies plan metadata into the payment webhook payload, so this is how
    the webhook knows WHICH kit and WHICH licence was bought — without it a
    Commercial sale is indistinguishable from a Personal one.
    Whop limits: 50 keys, 100 chars per key, 500 chars per value.
    """
    return {'kitId': str(kit_id or '')[:100],
            'licence': str(licence or 'personal')[:100]}


def _create_plan(product_id, amount, title, kit_id='', licence='personal'):
    """Create the one-time plan under a product and return (plan_id, url).

    VERIFIED 5 Aug 2026: passing `plan_options` to POST /products does NOT
    create a plan — the product came back with no plan and the store card
    showed "--" for price. The plan has to be created with its own call, the
    same way main.py's _whop_create_plan already does successfully.
    """
    payload = {
        'company_id':      WHOP_COMPANY_ID,
        'product_id':      product_id,
        'plan_type':       'one_time',
        'release_method':  'buy_now',
        # Personal stays 'visible' so the store card shows a price. Commercial
        # is 'quick_link' — reachable by direct link, but it must not add a
        # second price card to the store listing.
        'visibility':      'visible' if licence == 'personal' else 'quick_link',
        'currency':        'usd',
        'initial_price':   round(float(amount), 2),
        'title':           (title or 'LazyDog Template')[:30],
        'unlimited_stock': True,
        'metadata':        _plan_metadata(kit_id, licence),
        # USD ONLY (Javed's decision, 9 Aug 2026). Whop defaults this to true,
        # which shows a Hong Kong buyer "HK$48.01" for a $6 kit. The site quotes
        # dollars, so checkout must charge dollars — the price shown must be the
        # price charged. It also keeps every contributor's share denominated in
        # the same currency the sale was advertised in.
        'adaptive_pricing_enabled': False,
    }
    _, body = _request('POST', '/plans', body=payload)
    if not body or not body.get('id'):
        print(f'[whop-sync] plan create FAILED for product {product_id}')
        return (None, None)
    pid = body['id']
    return (pid, body.get('purchase_url') or f'https://whop.com/checkout/{pid}')


def _attach_images(product_id, file_ids, attempts=4):
    """Attach uploaded images to a product's gallery, in order.

    gallery_images REPLACES the whole gallery, so pass every image at once.
    Whop returns 400 "File upload has not completed processing" if we attach
    immediately after the S3 PUT, so retry with a short backoff.
    """
    if not file_ids:
        return False
    body = {'gallery_images': [{'id': f} for f in file_ids]}
    for i in range(attempts):
        code, _ = _request('PATCH', f'/products/{product_id}', body=body)
        if code in (200, 201, 204):
            print(f'[whop-sync] {len(file_ids)} image(s) attached to {product_id}')
            return True
        time.sleep(2 + 2 * i)          # 2s, 4s, 6s, 8s
    print(f'[whop-sync] image attach gave up for {product_id}')
    return False


def _build_gallery(product_id, t):
    """Upload the kit's slide previews and attach them. Returns True on success.

    Best-effort throughout: a slide that fails to upload is skipped rather than
    losing the whole gallery.
    """
    urls = _kit_gallery_urls(t)
    if not urls:
        return False
    file_ids = []
    for u in urls:
        fid = _upload_image(u)
        if fid:
            file_ids.append(fid)
    if not file_ids:
        return False
    return _attach_images(product_id, file_ids)


# ------------------------------------------------------------------ gate
def _store_visibility(kit_doc):
    """'visible' if the kit should appear on the Whop store, else 'hidden'.

    listOnWhop controls SHOP-WINDOW VISIBILITY ONLY — it does not decide whether
    the product exists. Every sellable kit gets a product + plan regardless,
    because the website's own checkout needs that plan id.

    DEFAULT IS VISIBLE (changed 6 Aug 2026). It used to default to hidden, which
    caused two bugs on every newly uploaded kit:
      1. the kit arrived hidden and had to be un-hidden by hand;
      2. the Discover submission was REJECTED —
         400 "You must set your product to be visible to the public"
         — so new kits silently never reached the marketplace.
    A kit is only hidden now if listOnWhop is EXPLICITLY set to false, so
    opting out still works but nothing is hidden by accident.
    """
    t = kit_doc.get('template') or {}
    v = t.get('listOnWhop', kit_doc.get('listOnWhop'))
    return 'hidden' if v is False else 'visible'


def _should_sync(kit_doc):
    """Return (ok: bool, reason: str, price, category).

    NOTE: listOnWhop is deliberately NOT checked here. See _store_visibility —
    it only affects whether the finished product shows on the store page.
    Gating creation on it would leave opted-out kits with no plan, which would
    make them unsellable on the website too.
    """
    t = kit_doc.get('template') or {}
    category = str(t.get('category') or kit_doc.get('category') or '').strip().lower()
    status   = str(kit_doc.get('status') or t.get('status') or '').lower()
    price    = _parse_price(t.get('price'))

    if category not in SELLABLE_CATEGORIES:
        return (False, f'category "{category}" not sellable', price, category)
    if status != 'approved':
        return (False, f'status "{status}" != approved', price, category)
    if price is None:
        return (False, 'no valid price', price, category)
    return (True, 'ok', price, category)


def _sync_commercial_plan(doc_id, product_id, personal_price, title, t,
                          fs_client=None):
    """Create or update the Commercial-licence plan. Returns a Firestore patch
    dict (possibly empty) — the caller writes it.

    DANGER — READ BEFORE EDITING. sync_kit runs from an on_document_written
    trigger, and it writes back to the same document, which re-fires the
    trigger. Creation MUST therefore be guarded on the id being absent. If this
    function ever creates a plan unconditionally, every write to any template
    mints another Whop plan, forever. That is the single fastest way to get the
    Whop account flagged. The `if existing:` branch below is that guard — do not
    remove it.

    The Commercial plan lives under the SAME product as Personal. That matters:
    the payment webhook resolves a sale to a kit via product id, so keeping one
    product means a Commercial sale still resolves even if plan metadata is
    ever lost.
    """
    # `t` is the kit's template map, which is where commercialPrice lives.
    price = _commercial_price(personal_price, {'template': t})
    if not price:
        return {}

    existing = t.get('whopCommercialPlanId')
    if existing:
        # UPDATE path — never creates. Keeps price in step with the Personal
        # price and re-asserts the licence stamp.
        _request('PATCH', f'/plans/{existing}',
                 body={'initial_price': price,
                       'visibility': 'quick_link',
                       'metadata': _plan_metadata(doc_id, 'commercial'),
                       'adaptive_pricing_enabled': False})
        if t.get('whopCommercialPrice') == price:
            return {}
        return {'whopCommercialPrice': price}

    # CREATE path — reached only when no commercial plan id exists.
    plan_id, url = _create_plan(product_id, price,
                                f'{title} Commercial'[:30],
                                kit_id=doc_id, licence='commercial')
    if not plan_id:
        print(f'[whop-sync] commercial plan create FAILED for {doc_id}')
        return {}
    print(f'[whop-sync] created commercial plan {plan_id} (${price:.0f}) for {doc_id}')
    out = {'whopCommercialPlanId':      plan_id,
           'whopCommercialPurchaseUrl': url,
           'whopCommercialPrice':       price}

    # SAVE THE ID NOW, not with the rest of the patch at the end of sync_kit.
    # 9 Aug 2026: the caller batched this write until after the gallery rebuild
    # and Discover publish. A run that timed out in between left the plan alive
    # on Whop with nothing pointing at it, and the next run — seeing no id —
    # created ANOTHER. Six duplicates before it was spotted. The window between
    # "plan exists" and "we know about it" must be as close to zero as possible.
    if fs_client is not None:
        try:
            fs_client.collection(_COLLECTION).document(doc_id).set(
                {'template': out}, merge=True)
        except Exception as e:
            print(f'[whop-sync] URGENT: commercial plan {plan_id} created for '
                  f'{doc_id} but its id could not be saved: {e}')
    return out


# ------------------------------------------------------------------ take-down
def _takedown_kit(doc_id, kit_doc, fs_client, reason):
    """The kit already has a live Whop product but is no longer eligible
    (status flipped to rejected/pending, price removed, category changed).

    Hide it on Whop so it stops selling. Deliberately HIDE rather than delete:
    a rejection is often temporary, and deleting would orphan existing orders.
    Re-approving the kit puts it straight back (the edit path below PATCHes
    visibility from _store_visibility and re-submits to Discover).
    """
    t = kit_doc.get('template') or {}
    product_id = t.get('whopProductId') or kit_doc.get('whopProductId')
    if not product_id:
        print(f'[whop-sync] skip {doc_id}: {reason}')
        return
    if t.get('whopVisibility') == 'hidden':
        return                      # already down — don't hammer the API

    for _p in (t.get('whopPlanId') or kit_doc.get('whopPlanId'),
               t.get('whopCommercialPlanId')):
        if _p:
            # Hiding the product alone still leaves the checkout link buyable,
            # and the Commercial plan is a second buyable link — hide both.
            _request('PATCH', f'/plans/{_p}', body={'visibility': 'hidden'})

    code, _ = _request('PATCH', f'/products/{product_id}',
                       body={'visibility': 'hidden'})
    if code == 404:
        # Already removed on Whop by hand. Clear the pointers so the flags stop
        # claiming the kit is live (this is exactly what misled us on
        # "Arrowai Brand Guidelines Pitch Deck", 9 Aug 2026).
        fs_client.collection(_COLLECTION).document(doc_id).set(
            {'template': {'whopProductId':   None, 'whopPlanId':      None,
                          'whopPurchaseUrl': None, 'whopPublished':   False,
                          'whopImageDone':   False, 'whopImageCount':  0,
                          'whopVisibility':  None,
                          'whopTakedownReason': 'deleted on Whop'}},
            merge=True)
        print(f'[whop-sync] {product_id} already gone on Whop — cleared {doc_id}')
    elif code in (200, 201, 202, 204):
        fs_client.collection(_COLLECTION).document(doc_id).set(
            {'template': {'whopVisibility':     'hidden',
                          'whopPublished':      False,   # re-submit on re-approve
                          'whopTakedownReason': reason}},
            merge=True)
        print(f'[whop-sync] took down {product_id} for {doc_id}: {reason}')
    else:
        print(f'[whop-sync] TAKEDOWN FAILED {product_id} ({code}) for {doc_id}')


# ------------------------------------------------------------------ create / update
def sync_kit(doc_id, kit_doc, fs_client):
    """Create (or update) the Whop store product for one kit. Takes the product
    down when the kit stops being eligible."""
    ok, reason, price, category = _should_sync(kit_doc)
    if not ok:
        _takedown_kit(doc_id, kit_doc, fs_client, reason)
        return

    t     = kit_doc.get('template') or {}
    title = (t.get('name') or 'LazyDog Template')[:80]
    head  = _headline(t)
    desc  = _description(t)
    existing = t.get('whopProductId') or kit_doc.get('whopProductId')

    # Self-heal stale pointers: the product may have been deleted directly on
    # Whop, which leaves whopProductId/whopPlanId pointing at nothing. Without
    # this check the kit would take the PATCH path forever and never come back.
    if existing:
        chk, _ = _request('GET', f'/products/{existing}')
        if chk == 404:
            print(f'[whop-sync] product {existing} is gone on Whop — rebuilding {doc_id}')
            fs_client.collection(_COLLECTION).document(doc_id).set(
                {'template': {'whopProductId':   None, 'whopPlanId':     None,
                              'whopPurchaseUrl': None, 'whopPublished':  False,
                              'whopImageDone':   False, 'whopImageCount': 0}},
                merge=True)
            t = {k: v for k, v in t.items()
                 if k not in ('whopProductId', 'whopPlanId', 'whopPurchaseUrl')}
            kit_doc = dict(kit_doc)
            kit_doc['template'] = t
            kit_doc.pop('whopProductId', None)
            kit_doc.pop('whopPlanId', None)
            existing = None

    # ---- EDIT SYNC: product already exists -> PATCH price/title/desc ----
    if existing:
        plan_id = t.get('whopPlanId') or kit_doc.get('whopPlanId')

        # Self-heal: the product exists but never got a plan (so the store card
        # shows "--" and it cannot be bought). Create the missing plan.
        if not plan_id:
            plan_id, purchase_url = _create_plan(existing, price, title,
                                                 kit_id=doc_id, licence='personal')
            if plan_id:
                fs_client.collection(_COLLECTION).document(doc_id).set(
                    {'template': {'whopPlanId': plan_id,
                                  'whopPurchaseUrl': purchase_url}},
                    merge=True)
                print(f'[whop-sync] backfilled missing plan {plan_id} on {existing}')
        else:
            # 'visibility' here also un-does a previous take-down (see
            # _takedown_kit) when a rejected kit is later approved.
            # 'metadata' back-fills kitId/licence onto plans created before
            # 9 Aug 2026 — without it the webhook cannot tell which licence
            # was bought. Re-sending it every time is harmless (it overwrites
            # with the same values) and self-heals any plan we miss.
            _request('PATCH', f'/plans/{plan_id}',
                     body={'initial_price': price, 'visibility': 'visible',
                           'metadata': _plan_metadata(doc_id, 'personal'),
                           'adaptive_pricing_enabled': False})

        _vis = _store_visibility(kit_doc)
        _patch_body = {'title': title, 'headline': head, 'description': desc,
                       'visibility': _vis}
        _patch_body.update(_affiliate_fields(kit_doc))   # per-kit affiliate rate
        _request('PATCH', f'/products/{existing}', body=_patch_body)

        # Image and Discover-publish can fail on the first (create) pass —
        # the image needs time to finish processing, and publish is refused
        # until a headline exists. Retry them here until each one sticks.
        patch = {}
        patch.update(_sync_commercial_plan(doc_id, existing, price, title, t, fs_client))
        if t.get('whopVisibility') != _vis:
            patch['whopVisibility']     = _vis
            patch['whopTakedownReason'] = None
        # Rebuild the gallery when it has never been done OR when the number of
        # previews we would now upload differs from what is currently attached
        # (e.g. GALLERY_MAX changed, or the kit gained slides). Without this
        # count check, kits synced before the gallery feature keep their single
        # cover image forever, because whopImageDone was already true.
        want = len(_kit_gallery_urls(t))
        have = t.get('whopImageCount')
        if want and (not t.get('whopImageDone') or have != want):
            if _build_gallery(existing, t):
                patch['whopImageDone']  = True
                patch['whopImageCount'] = want
        if not t.get('whopPublished'):
            code, _ = _request('POST', f'/products/{existing}/publish', body={})
            if code in (200, 201, 202, 204):
                patch['whopPublished'] = True
                print(f'[whop-sync] submitted {existing} to Discover')
        if patch:
            fs_client.collection(_COLLECTION).document(doc_id).set(
                {'template': patch}, merge=True)

        print(f'[whop-sync] updated product {existing} for kit {doc_id}')
        return

    # ---- CREATE the product ----
    # NOTE: 'headline' is REQUIRED before Whop will accept a Discover publish.
    payload = {
        'company_id':  WHOP_COMPANY_ID,
        'title':       title,
        'headline':    head,
        'description': desc,
        'visibility':  _store_visibility(kit_doc),   # listOnWhop -> visible/hidden
        'metadata':    {'kitId': doc_id, 'slug': (t.get('slug') or '')},
    }
    payload.update(_affiliate_fields(kit_doc))   # per-kit affiliate rate
    _, body = _request('POST', '/products', body=payload)
    if not body or not body.get('id'):
        fs_client.collection(_COLLECTION).document(doc_id).set(
            {'template': {'whopSyncError': 'product create failed — see function logs'}},
            merge=True)
        print(f'[whop-sync] CREATE FAILED for {doc_id}')
        return

    product_id   = body['id']
    plan_id      = _extract_plan_id(body)
    purchase_url = body.get('purchase_url') or ''

    # ---- CREATE the plan (separate call — see _create_plan docstring) ----
    if not plan_id:
        plan_id, purchase_url = _create_plan(product_id, price, title,
                                             kit_id=doc_id, licence='personal')
    if plan_id and not purchase_url:
        purchase_url = f'https://whop.com/checkout/{plan_id}'

    # slide previews (best-effort — never blocks the listing; retried later)
    image_done = _build_gallery(product_id, t)

    # submit to Whop Discover (Whop reviews it before it goes public)
    pub_code, _ = _request('POST', f'/products/{product_id}/publish', body={})
    published = pub_code in (200, 201, 202, 204)

    _new = {
        'whopProductId':   product_id,
        'whopPlanId':      plan_id,
        'whopPurchaseUrl': purchase_url,
        'whopImageDone':   image_done,
        'whopImageCount':  len(_kit_gallery_urls(t)) if image_done else 0,
        'whopPublished':   published,
        'whopVisibility':  _store_visibility(kit_doc),
        'whopSyncError':   None,
    }
    # t has no whopCommercialPlanId on this path (brand new product), so this
    # always takes the CREATE branch — which is correct, and still guarded.
    _new.update(_sync_commercial_plan(doc_id, product_id, price, title, t, fs_client))
    fs_client.collection(_COLLECTION).document(doc_id).set(
        {'template': _new}, merge=True)
    print(f'[whop-sync] created product {product_id} / plan {plan_id} for kit {doc_id}')


# ------------------------------------------------------------------ delete / archive
def archive_kit(kit_doc):
    """Kit removed on the site -> take its product off the Whop store.
    Hard-delete if it never sold; otherwise archive (Whop blocks delete after
    a sale)."""
    t = kit_doc.get('template') or {}
    product_id = t.get('whopProductId') or kit_doc.get('whopProductId')
    if not product_id:
        return
    code, _ = _request('DELETE', f'/products/{product_id}')
    if code not in (200, 204):
        _request('PATCH', f'/products/{product_id}',
                 body={'visibility': 'archived'})
        print(f'[whop-sync] archived product {product_id} (delete not allowed)')
    else:
        print(f'[whop-sync] deleted product {product_id}')


# ------------------------------------------------------------------ cart checkout
def create_cart_checkout(total, cart_ref, buyer_email=''):
    """One Whop payment for a basket of several kits.

    Whop has no cart: a checkout charges ONE plan. The supported way to charge a
    basket is a "checkout configuration" with an inline plan at the basket total.
    VERIFIED against Whop's docs, 9 Aug 2026:
      - POST /checkout_configurations accepts an inline `plan` and `metadata`
      - "Payments and memberships created from a checkout session inherit its
        metadata" — so the payment webhook receives our metadata
      - the payment also carries `checkout_configuration_id`

    We deliberately put ONLY a short reference (cart_ref) in the metadata, never
    the basket itself. Whop caps metadata at 500 characters per value; a basket
    of any size would eventually be silently truncated and we would deliver the
    wrong kits. The real basket lives in Firestore under carts/{cart_ref}.

    We do NOT pass force_create_new_plan. Letting Whop reuse an equivalent plan
    keeps the account from filling up with one throwaway plan per checkout,
    which was a real risk flagged in review. Reuse is safe precisely because the
    cart reference rides on the checkout configuration, not on the plan.

    Returns (purchase_url, checkout_id) or (None, None).
    """
    try:
        amount = round(float(total), 2)
    except (TypeError, ValueError):
        return (None, None)
    if amount <= 0:
        return (None, None)

    payload = {
        'company_id': WHOP_COMPANY_ID,
        'currency':   'usd',
        'mode':       'payment',
        'plan': {
            'company_id':      WHOP_COMPANY_ID,
            'plan_type':       'one_time',
            'release_method':  'buy_now',
            'currency':        'usd',
            'initial_price':   amount,
            'title':           'LazyDog Templates order',
            # quick_link keeps basket plans off the public store listing.
            'visibility':      'quick_link',
            'unlimited_stock': True,
            'metadata':        {'kind': 'cart'},
        },
        # THIS is what the webhook reads back.
        'metadata': {'cartRef': str(cart_ref)[:100], 'kind': 'cart'},
    }
    code, body = _request('POST', '/checkout_configurations', body=payload)
    if not isinstance(body, dict) or not body.get('id'):
        print(f'[whop-cart] checkout config create FAILED ({code}) for {cart_ref}')
        return (None, None)

    # USD only. The inline `plan` object on POST /checkout_configurations does
    # NOT accept adaptive_pricing_enabled (checked against Whop's schema,
    # 9 Aug 2026), so the plan is created with Whop's default of ON and turned
    # off immediately afterwards. Best-effort: a basket that shows local
    # currency is a nuisance, not a reason to block the sale.
    plan = body.get('plan') or {}
    plan_id = plan.get('id') if isinstance(plan, dict) else None
    if plan_id:
        _request('PATCH', f'/plans/{plan_id}',
                 body={'adaptive_pricing_enabled': False})

    url = body.get('purchase_url') or ''
    if not url and plan_id:
        url = f'https://whop.com/checkout/{plan_id}?session={body["id"]}'
    print(f'[whop-cart] checkout {body["id"]} for cart {cart_ref} (${amount:.2f})')
    return (url or None, body['id'])


def cart_ref_from_checkout(checkout_id):
    """Second, independent way to recover the cart reference.

    If a payment arrives carrying checkout_configuration_id but no metadata (an
    API version change, a field rename), we can still read the configuration
    back and recover the basket. Money must never land with nothing delivered.
    """
    if not checkout_id:
        return ''
    _, body = _request('GET', f'/checkout_configurations/{checkout_id}')
    if isinstance(body, dict):
        meta = body.get('metadata') or {}
        if isinstance(meta, dict):
            return str(meta.get('cartRef') or '')
    return ''


# ------------------------------------------------------------------ backfill
def backfill_existing_kits(fs_client, only_docs=None, limit=None,
                           force_list=True, resync=False):
    """Migrate kits that don't yet have their own Whop product.

    only_docs  : iterable of doc ids to restrict to (use this to test ONE kit)
    limit      : stop after N kits
    force_list : treat kits as listOnWhop=True even if the flag is unset.
                 Default True — this is a deliberate migration, and the 11
                 existing kits were created before the flag existed.
    resync     : also re-run kits that ALREADY have a product. Use this to push
                 changed settings (e.g. the affiliate %) onto existing listings.
                 It never creates a duplicate — sync_kit takes the PATCH path.

    Returns a summary dict. Safe to run repeatedly: kits that already have a
    product are skipped unless resync=True.
    """
    done, skipped, failed = [], [], []
    for snap in fs_client.collection(_COLLECTION).stream():
        if only_docs and snap.id not in only_docs:
            continue
        kit = snap.to_dict() or {}
        t   = kit.get('template') or {}

        if t.get('whopProductId') and not resync:
            skipped.append(snap.id)          # already migrated
            continue

        ok, reason, _price, _cat = _should_sync(
            {**kit, 'template': {**t, 'listOnWhop': True}} if force_list else kit)
        if not ok:
            # Ineligible AND already on Whop = it must come down. Without this
            # the backfill silently walks past a rejected kit whose product is
            # still selling, and leaves stale whopProductId/whopPlanId behind.
            if t.get('whopProductId'):
                try:
                    _takedown_kit(snap.id, kit, fs_client, reason)
                except Exception as e:
                    print(f'[whop-sync] takedown FAILED for {snap.id}: {e}')
            skipped.append(f'{snap.id} ({reason})')
            continue

        if force_list:
            kit.setdefault('template', {})['listOnWhop'] = True
        try:
            sync_kit(snap.id, kit, fs_client)
            done.append(snap.id)
        except Exception as e:
            print(f'[whop-sync] backfill FAILED for {snap.id}: {e}')
            failed.append(snap.id)

        if limit and len(done) >= limit:
            break
        time.sleep(0.8)                       # gentle on Whop rate limits

    print(f'[whop-sync] backfill: {len(done)} synced, '
          f'{len(skipped)} skipped, {len(failed)} failed')
    return {'synced': done, 'skipped': skipped, 'failed': failed}
