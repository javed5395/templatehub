#!/usr/bin/env python3
"""
main.py — Lazydog Studio Firebase Cloud Function
=================================================
Trigger : Firebase Storage — object finalised in the PRIVATE bucket
          (any file matching *_SYSTEM.pdf)

What it does (in order):
  1. Ignores any upload that is NOT a _SYSTEM.pdf file.
  2. Downloads the _SYSTEM.pdf from private Storage.
  3. Extracts the encoded Section 11 metadata block from the PDF text.
  4. Decodes it using meta_codec — the private lookup table.
  5. Writes the decoded metadata as a structured document to Firestore
     (collection: "kits", document id: kit slug derived from filename).
  5b. Loads the deck's sibling "<base>.slots.json" capacity map (if it was
     uploaded alongside the _SYSTEM.pdf) and attaches it to the SAME kit
     document under the "slots" field, plus a small "capacity" summary.
     This is the per-deck fit map the autofill / feasibility engine reads.
  6. Strips Section 11 from the PDF and uploads the clean version to
     the PUBLIC Storage bucket so buyers can download it.
  7. Optionally deletes the _SYSTEM.pdf from private Storage after
     processing (set DELETE_SYSTEM_PDF = True below when ready).

Deploy:
    cd firebase/functions
    pip install -r requirements.txt
    firebase deploy --only functions

Upload convention (so the map is attached automatically):
    Upload BOTH files into the same private-bucket folder:
        kits/<name>/<name>_SYSTEM.pdf
        kits/<name>/<name>.slots.json
    generate_pdf.py already writes "<name>.slots.json" next to the PDF.

Environment variables (set in Firebase Console → Functions → Config):
    PRIVATE_BUCKET   — e.g. lazydog-studio-private
    PUBLIC_BUCKET    — e.g. lazydog-studio.appspot.com
    FIRESTORE_COLLECTION — default: "kits"
"""

from dotenv import load_dotenv
load_dotenv()
import io
import os
import re
import sys
import json
import tempfile
from pathlib import Path

# ── Firebase / GCP imports ────────────────────────────────────────────────────
from firebase_functions import storage_fn, https_fn, options
from firebase_admin import initialize_app, firestore, storage as fb_storage
import google.cloud.firestore

# ── PDF text extraction ───────────────────────────────────────────────────────
import pdfplumber          # pip install pdfplumber

# ── Private codec (same folder as this file after deploy) ────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from meta_codec import decode_section11_string
import content_fitter as cf   # server-side fit/fill (never shipped to client)
import ai_fill                 # model cascade (Haiku/Sonnet/Opus) — key from env, never client

# ─────────────────────────────────────────────────────────────────────────────
initialize_app()

# ── Config ────────────────────────────────────────────────────────────────────
PRIVATE_BUCKET        = os.environ.get('PRIVATE_BUCKET',        'lazydog-studio-private')
PUBLIC_BUCKET         = os.environ.get('PUBLIC_BUCKET',         'lazydog-studio.appspot.com')
FIRESTORE_COLLECTION  = os.environ.get('FIRESTORE_COLLECTION',  'kits')
SLOTS_COLLECTION      = os.environ.get('SLOTS_COLLECTION',      'kit_slots')  # PRIVATE — server-only read
DELETE_SYSTEM_PDF     = False   # set True once you've tested and are confident

# Suffix of the per-deck capacity map produced by generate_pdf.write_slots_sidecar
_SLOTS_SUFFIX = '.slots.json'

# Markers that wrap Section 11 in the PDF text (same as in template.html)
# pdfplumber extracts the visible text — these are the lines we search between.
_SEC11_START_PATTERN  = re.compile(r'SECTION\s+11', re.IGNORECASE)
_SEC11_LINE_PATTERN   = re.compile(
    # Real lines are "LABEL : CODE:values" -> normalised "LABEL:CODE:values".
    # Capture the "CODE:values" segment after the verbose label. Values may contain
    # hyphens, spaces and capitals (e.g. AUDIENCE), so the value part is permissive.
    r'^[A-Z0-9_]+:([A-Z0-9]{2,4}:.+)$'
)
_SEC11_END_MARKERS    = {'MARKETING', 'LOVED', 'NEED A CUSTOM', 'WANT YOUR'}


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — extract encoded Section 11 string from PDF text
# ══════════════════════════════════════════════════════════════════════════════
def _extract_section11(pdf_bytes: bytes) -> str:
    """
    Open the PDF bytes, find Section 11, collect all encoded field:value pairs,
    and return them as a pipe-separated string  e.g. 'F4:f1,f2|K3:d2,d7|...'

    Returns empty string if Section 11 is not found or has no coded lines.
    """
    parts = []
    in_section11 = False

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ''
            for line in text.splitlines():
                stripped = line.strip()

                # Detect Section 11 header
                if not in_section11:
                    if _SEC11_START_PATTERN.search(stripped):
                        in_section11 = True
                    continue

                # Collect encoded field lines FIRST.
                # "ASPECT_RATIO : AR:r1" -> normalised "ASPECT_RATIO:AR:r1" -> capture "AR:r1"
                normalised = re.sub(r'\s*:\s*', ':', stripped)
                m = _SEC11_LINE_PATTERN.match(normalised)
                if m:
                    parts.append(m.group(1))
                    continue

                # Only a NON-encoded line can end Section 11. Checked AFTER the pattern so an
                # AUDIENCE value like "Marketing agencies" is never mistaken for the MARKETING
                # box that follows the section (which previously dropped AUDIENCE + everything after it).
                if any(marker in stripped.upper() for marker in _SEC11_END_MARKERS):
                    break

    return '|'.join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — load the deck's sibling ".slots.json" capacity map from the bucket
# ══════════════════════════════════════════════════════════════════════════════
def _load_sibling_slots(private_client, system_filepath: str):
    """
    Given the path of an "<base>_SYSTEM.pdf" object in the private bucket, find
    and parse the paired "<base>.slots.json" in the SAME folder.

    Lookup order:
      1. Exact pair  — "<base>.slots.json" next to the PDF.
      2. Fallback    — the only "*.slots.json" in that folder, if exactly one.

    Returns the parsed dict, or None if not found / not valid JSON.
    """
    stem   = Path(system_filepath).stem                       # "<base>_SYSTEM"
    base   = re.sub(r'_SYSTEM$', '', stem, flags=re.IGNORECASE)
    parent = str(Path(system_filepath).parent).strip('.')     # "" for root
    prefix = (parent + '/') if parent and parent != '/' else ''

    # 1) exact pair
    candidate = f"{prefix}{base}{_SLOTS_SUFFIX}"
    blob = private_client.blob(candidate)
    try:
        if blob.exists():
            return json.loads(blob.download_as_bytes().decode('utf-8'))
    except Exception as e:
        print(f"  [WARN] could not read {candidate}: {e}")

    # 2) fallback — single *.slots.json in the same folder
    try:
        found = [b for b in private_client.list_blobs(prefix=prefix)
                 if b.name.lower().endswith(_SLOTS_SUFFIX)]
        if len(found) == 1:
            print(f"  Slots map (fallback match): {found[0].name}")
            return json.loads(found[0].download_as_bytes().decode('utf-8'))
        elif len(found) > 1:
            print(f"  [WARN] {len(found)} .slots.json files in {prefix} — cannot pick one")
    except Exception as e:
        print(f"  [WARN] slots fallback scan failed: {e}")

    return None


def _capacity_summary(slots_doc: dict) -> dict:
    """Small top-level summary pulled from the slots map (handy for quick reads
    without loading the full per-slide array)."""
    return {
        'slides':               slots_doc.get('slides'),
        'total_capacity_chars': slots_doc.get('total_capacity_chars'),
        'total_text_chars':     slots_doc.get('total_text_chars'),
        'cloneable_slots':      slots_doc.get('cloneable_slots'),
        'text_weight':          slots_doc.get('text_weight'),
        'image_weight':         slots_doc.get('image_weight'),
        'graph_weight':         slots_doc.get('graph_weight'),
    }


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — strip Section 11 from PDF bytes, return clean PDF bytes
# ══════════════════════════════════════════════════════════════════════════════
def _make_clean_pdf(system_pdf_bytes: bytes) -> bytes:
    """
    Remove Section 11 pages/content and return a clean PDF.

    Strategy: re-render using pypdf — copy all pages but suppress the
    Section 11 text by rebuilding from the HTML source is not available
    here, so instead we use a page-level approach:
      - If Section 11 occupies its own page → drop that page.
      - If Section 11 shares a page with other content → blank those lines
        by overlaying a white rectangle (pypdf approach).

    For simplicity (and because generate_pdf.py already produces both),
    this function is only called when the clean PDF is NOT already present.
    In normal workflow generate_pdf.py/batch_generate.py already wrote
    the clean PDF locally — this function is a server-side safety net.
    """
    try:
        from pypdf import PdfReader, PdfWriter
        from pypdf.generic import (
            ArrayObject, FloatObject, NameObject,
            RectangleObject, ContentStream, DecodedStreamObject
        )
    except ImportError:
        # pypdf not installed — return bytes unchanged (safe fallback,
        # the local clean PDF should already exist)
        return system_pdf_bytes

    reader = PdfReader(io.BytesIO(system_pdf_bytes))
    writer = PdfWriter()

    for page in reader.pages:
        text = page.extract_text() or ''
        if _SEC11_START_PATTERN.search(text):
            # This page contains Section 11 — skip it entirely
            continue
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — derive kit slug from filename
# e.g. "claudefreever_SYSTEM.pdf" → "claudefreever"
# ══════════════════════════════════════════════════════════════════════════════
def _slug_from_name(filename: str) -> str:
    stem = Path(filename).stem                  # e.g. "claudefreever_SYSTEM"
    slug = re.sub(r'_SYSTEM$', '', stem, flags=re.IGNORECASE)
    slug = re.sub(r'[^a-z0-9\-_]', '-', slug.lower()).strip('-')
    return slug or stem


# ══════════════════════════════════════════════════════════════════════════════
# CLOUD FUNCTION — triggers on any file uploaded to private Storage bucket
# ══════════════════════════════════════════════════════════════════════════════
@storage_fn.on_object_finalized(
    bucket=PRIVATE_BUCKET,
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
)
def process_system_pdf(event: storage_fn.CloudEvent) -> None:
    """
    Triggered when a file is written to the private bucket.
    Only processes files whose name ends with _SYSTEM.pdf (case-insensitive).
    """
    obj      = event.data
    filepath = obj.name          # full path inside bucket e.g. "kits/claudefreever_SYSTEM.pdf"
    filename = Path(filepath).name

    # ── Guard: only handle _SYSTEM.pdf files ─────────────────────────────────
    if not re.search(r'_SYSTEM\.pdf$', filename, re.IGNORECASE):
        print(f"[SKIP] Not a _SYSTEM.pdf file: {filename}")
        return

    print(f"[START] Processing: {filepath}")
    kit_slug = _slug_from_name(filename)
    print(f"  Kit slug: {kit_slug}")

    # ── Firestore handle + kit document reference (created either way) ────────
    db  = firestore.client()
    ref = db.collection(FIRESTORE_COLLECTION).document(kit_slug)

    # ── Step 1: Download _SYSTEM.pdf from private bucket ─────────────────────
    private_client = fb_storage.bucket(PRIVATE_BUCKET)
    blob           = private_client.blob(filepath)

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        tmp_path = tmp.name
    blob.download_to_filename(tmp_path)
    system_pdf_bytes = Path(tmp_path).read_bytes()
    print(f"  Downloaded: {len(system_pdf_bytes):,} bytes")

    # ── Step 2: Extract encoded Section 11 ───────────────────────────────────
    encoded_str = _extract_section11(system_pdf_bytes)
    if not encoded_str:
        print(f"  [WARN] No encoded Section 11 found in {filename} — metadata not updated")
    else:
        print(f"  Encoded metadata: {encoded_str[:80]}...")

        # ── Step 3: Decode metadata ───────────────────────────────────────────
        decoded = decode_section11_string(encoded_str)
        print(f"  Decoded fields: {list(decoded.keys())}")

        # ── Step 4: Write to Firestore ────────────────────────────────────────
        ref.set({
            'slug'          : kit_slug,
            'type'          : decoded.get('CONTENT_TYPE', ''),  # product category — same collection, filtered by type
            'encoded_raw'   : encoded_str,       # CODED metadata ONLY — search matches on these codes. Plain metadata is NEVER stored.
            'metadata'      : google.cloud.firestore.DELETE_FIELD,  # purge any plain metadata written by older runs
            'source_file'   : filepath,
            'processed_at'  : google.cloud.firestore.SERVER_TIMESTAMP,
        }, merge=True)
        print(f"  Firestore written: {FIRESTORE_COLLECTION}/{kit_slug}")

    # ── Step 4b: Attach the per-deck slots capacity map (if present) ──────────
    slots_doc = _load_sibling_slots(private_client, filepath)
    if slots_doc:
        # PUBLIC kit doc: only the small capacity SUMMARY (safe for search/display).
        ref.set({
            'slug'         : kit_slug,
            'capacity'     : _capacity_summary(slots_doc),
            'processed_at' : google.cloud.firestore.SERVER_TIMESTAMP,
        }, merge=True)
        # PRIVATE map: the FULL per-slide map goes to a server-only collection so the
        # matching/capacity logic is never exposed to the client.
        db.collection(SLOTS_COLLECTION).document(kit_slug).set({
            'slug'         : kit_slug,
            'slots'        : slots_doc,
            'slots_file'   : re.sub(r'_SYSTEM\.pdf$', _SLOTS_SUFFIX, filepath, flags=re.IGNORECASE),
            'processed_at' : google.cloud.firestore.SERVER_TIMESTAMP,
        }, merge=True)
        print(f"  Slots map stored (private {SLOTS_COLLECTION}/{kit_slug}): {slots_doc.get('slides')} slides, "
              f"capacity {slots_doc.get('total_capacity_chars')} chars")
    else:
        print(f"  [WARN] No {_SLOTS_SUFFIX} sibling found for {kit_slug} — "
              f"kit has no fit map yet (upload it next to the _SYSTEM.pdf).")

    # ── Step 5: Create and upload clean PDF to public bucket ─────────────────
    clean_bytes    = _make_clean_pdf(system_pdf_bytes)
    clean_filename = re.sub(r'_SYSTEM\.pdf$', '.pdf', filename, flags=re.IGNORECASE)
    clean_filepath = str(Path(filepath).parent / clean_filename)

    public_client = fb_storage.bucket(PUBLIC_BUCKET)
    clean_blob    = public_client.blob(clean_filepath)
    clean_blob.upload_from_string(clean_bytes, content_type='application/pdf')
    clean_blob.make_public()
    print(f"  Clean PDF uploaded: gs://{PUBLIC_BUCKET}/{clean_filepath}")
    print(f"  Public URL: {clean_blob.public_url}")

    # Update Firestore with the public download URL
    ref.set({'pdf_url': clean_blob.public_url}, merge=True)

    # ── Step 6: (Optional) Delete _SYSTEM.pdf from private bucket ────────────
    if DELETE_SYSTEM_PDF:
        blob.delete()
        print(f"  _SYSTEM.pdf deleted from private bucket.")
    else:
        print(f"  _SYSTEM.pdf kept in private bucket (DELETE_SYSTEM_PDF=False).")

    # Cleanup temp file
    Path(tmp_path).unlink(missing_ok=True)
    print(f"[DONE] {kit_slug}")


# ══════════════════════════════════════════════════════════════════════════════
# CALLABLE — server-side content fit / fill  (the "brain" stays on the back end)
# Client sends { kit: <slug>, content: <str|obj>, mode: 'fit'|'plan' } and gets
# back the fit result or the editor-ready fill plan. The per-slide map is read
# from the PRIVATE kit_slots collection (Admin SDK bypasses the read rule), so
# the matching logic and capacities never reach the browser.
# ══════════════════════════════════════════════════════════════════════════════
@https_fn.on_call(memory=options.MemoryOption.MB_256, timeout_sec=30)
def fit_content(req: https_fn.CallableRequest):
    data = req.data or {}
    slug    = str(data.get('kit', '')).strip()
    content = data.get('content')
    mode    = (data.get('mode') or 'plan').lower()
    if not slug or content is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                                  "Provide 'kit' (slug) and 'content'.")

    db   = firestore.client()
    snap = db.collection(SLOTS_COLLECTION).document(slug).get()
    if not snap.exists:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND,
                                  f"No fit map for kit '{slug}'.")
    deck = (snap.to_dict() or {}).get('slots')
    if not deck or not deck.get('slots'):
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND,
                                  f"Fit map for '{slug}' is empty.")

    if mode == 'fit':
        return cf.fit(content, deck)
    return cf.build_fill_plan(content, deck)


# ══════════════════════════════════════════════════════════════════════════════
# CALLABLES — AI fill cascade (server-side; API key in env, never client)
# ══════════════════════════════════════════════════════════════════════════════
@https_fn.on_call(memory=options.MemoryOption.MB_256, timeout_sec=60)
def smart_fill(req: https_fn.CallableRequest):
    """One multi-region slide: Haiku fill -> rule check -> Sonnet fix. -> {id:text}"""
    d = req.data or {}
    return ai_fill.smart_fill(d.get('title', ''), d.get('buyer', ''), d.get('regions', []))


@https_fn.on_call(memory=options.MemoryOption.MB_256, timeout_sec=60)
def qa_deck(req: https_fn.CallableRequest):
    """Opus review of key pages. -> {'fixes':[{idx,id,text}]}"""
    d = req.data or {}
    return {'fixes': ai_fill.qa_deck(d.get('deck', ''), d.get('brand', ''), d.get('pages', []))}


# ══════════════════════════════════════════════════════════════════════════════
# HTTP versions of the cascade — called by the editor's fill receiver (cross-origin,
# so CORS is open). Same logic as the callables above.
# ══════════════════════════════════════════════════════════════════════════════
_CORS = options.CorsOptions(cors_origins="*", cors_methods=["post", "options"])


@https_fn.on_request(memory=options.MemoryOption.MB_256, timeout_sec=60, cors=_CORS)
def smart_fill_http(req: https_fn.Request) -> https_fn.Response:
    d = req.get_json(silent=True) or {}
    out = ai_fill.smart_fill(d.get('title', ''), d.get('buyer', ''), d.get('regions', []))
    return https_fn.Response(json.dumps(out), mimetype='application/json')


@https_fn.on_request(memory=options.MemoryOption.MB_256, timeout_sec=60, cors=_CORS)
def qa_deck_http(req: https_fn.Request) -> https_fn.Response:
    d = req.get_json(silent=True) or {}
    out = {'fixes': ai_fill.qa_deck(d.get('deck', ''), d.get('brand', ''), d.get('pages', []))}
    return https_fn.Response(json.dumps(out), mimetype='application/json')
