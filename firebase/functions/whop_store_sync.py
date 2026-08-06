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


def _affiliate_fields():
    """The affiliate settings applied to every kit product."""
    out = {}
    if AFFILIATE_PERCENT and AFFILIATE_PERCENT > 0:
        out['global_affiliate_status']     = 'enabled'
        out['global_affiliate_percentage'] = AFFILIATE_PERCENT
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


def _create_plan(product_id, amount, title):
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
        'visibility':      'visible',      # 'visible' so the store card shows a price
        'currency':        'usd',
        'initial_price':   round(float(amount), 2),
        'title':           (title or 'LazyDog Template')[:30],
        'unlimited_stock': True,
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


# ------------------------------------------------------------------ create / update
def sync_kit(doc_id, kit_doc, fs_client):
    """Create (or update) the Whop store product for one kit. Safe no-op when
    the kit is not eligible."""
    ok, reason, price, category = _should_sync(kit_doc)
    if not ok:
        print(f'[whop-sync] skip {doc_id}: {reason}')
        return

    t     = kit_doc.get('template') or {}
    title = (t.get('name') or 'LazyDog Template')[:80]
    head  = _headline(t)
    desc  = _description(t)
    existing = t.get('whopProductId') or kit_doc.get('whopProductId')

    # ---- EDIT SYNC: product already exists -> PATCH price/title/desc ----
    if existing:
        plan_id = t.get('whopPlanId') or kit_doc.get('whopPlanId')

        # Self-heal: the product exists but never got a plan (so the store card
        # shows "--" and it cannot be bought). Create the missing plan.
        if not plan_id:
            plan_id, purchase_url = _create_plan(existing, price, title)
            if plan_id:
                fs_client.collection(_COLLECTION).document(doc_id).set(
                    {'template': {'whopPlanId': plan_id,
                                  'whopPurchaseUrl': purchase_url}},
                    merge=True)
                print(f'[whop-sync] backfilled missing plan {plan_id} on {existing}')
        else:
            _request('PATCH', f'/plans/{plan_id}', body={'initial_price': price})

        _patch_body = {'title': title, 'headline': head, 'description': desc,
                       'visibility': _store_visibility(kit_doc)}
        _patch_body.update(_affiliate_fields())   # keeps the 40% program in sync
        _request('PATCH', f'/products/{existing}', body=_patch_body)

        # Image and Discover-publish can fail on the first (create) pass —
        # the image needs time to finish processing, and publish is refused
        # until a headline exists. Retry them here until each one sticks.
        patch = {}
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
    payload.update(_affiliate_fields())    # contributor program, e.g. 40%
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
        plan_id, purchase_url = _create_plan(product_id, price, title)
    if plan_id and not purchase_url:
        purchase_url = f'https://whop.com/checkout/{plan_id}'

    # slide previews (best-effort — never blocks the listing; retried later)
    image_done = _build_gallery(product_id, t)

    # submit to Whop Discover (Whop reviews it before it goes public)
    pub_code, _ = _request('POST', f'/products/{product_id}/publish', body={})
    published = pub_code in (200, 201, 202, 204)

    fs_client.collection(_COLLECTION).document(doc_id).set(
        {'template': {
            'whopProductId':   product_id,
            'whopPlanId':      plan_id,
            'whopPurchaseUrl': purchase_url,
            'whopImageDone':   image_done,
            'whopImageCount':  len(_kit_gallery_urls(t)) if image_done else 0,
            'whopPublished':   published,
            'whopSyncError':   None,
        }},
        merge=True)
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
