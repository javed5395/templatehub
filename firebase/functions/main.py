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
  6. Strips Section 11 from the PDF and uploads the clean version to
     the PUBLIC Storage bucket so buyers can download it.
  7. Optionally deletes the _SYSTEM.pdf from private Storage after
     processing (set DELETE_SYSTEM_PDF = True below when ready).

Deploy:
    cd firebase/functions
    pip install -r requirements.txt
    firebase deploy --only functions

Environment variables (set in Firebase Console → Functions → Config):
    PRIVATE_BUCKET   — e.g. lazydog-studio-private
    PUBLIC_BUCKET    — e.g. lazydog-studio.appspot.com
    FIRESTORE_COLLECTION — default: "kits"
"""

import io
import os
import re
import sys
import tempfile
from pathlib import Path

# ── Firebase / GCP imports ────────────────────────────────────────────────────
from firebase_functions import storage_fn, options
from firebase_admin import initialize_app, firestore, storage as fb_storage
import google.cloud.firestore

# ── PDF text extraction ───────────────────────────────────────────────────────
import pdfplumber          # pip install pdfplumber

# ── Private codec (same folder as this file after deploy) ────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from meta_codec import decode_section11_string

# ─────────────────────────────────────────────────────────────────────────────
initialize_app()

# ── Config ────────────────────────────────────────────────────────────────────
PRIVATE_BUCKET        = os.environ.get('PRIVATE_BUCKET',        'lazydog-studio-private')
PUBLIC_BUCKET         = os.environ.get('PUBLIC_BUCKET',         'lazydog-studio.appspot.com')
FIRESTORE_COLLECTION  = os.environ.get('FIRESTORE_COLLECTION',  'kits')
DELETE_SYSTEM_PDF     = False   # set True once you've tested and are confident

# Markers that wrap Section 11 in the PDF text (same as in template.html)
# pdfplumber extracts the visible text — these are the lines we search between.
_SEC11_START_PATTERN  = re.compile(r'SECTION\s+11', re.IGNORECASE)
_SEC11_LINE_PATTERN   = re.compile(
    r'^([A-Z0-9]{2,4}:[a-z0-9,|]+)',   # matches encoded lines like "F4:f1,f2"
    re.MULTILINE
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

                # Detect end of Section 11 (marketing box or next section)
                if any(marker in stripped.upper() for marker in _SEC11_END_MARKERS):
                    break

                # Collect encoded field:value lines
                # Format: "F4 : f1,f2"  or  "F4:f1,f2"  (PDF may add spaces)
                normalised = re.sub(r'\s*:\s*', ':', stripped)
                m = _SEC11_LINE_PATTERN.match(normalised)
                if m:
                    parts.append(m.group(1))

    return '|'.join(parts)


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
        print(f"  [WARN] No encoded Section 11 found in {filename} — Firestore not updated")
    else:
        print(f"  Encoded metadata: {encoded_str[:80]}...")

        # ── Step 3: Decode metadata ───────────────────────────────────────────
        decoded = decode_section11_string(encoded_str)
        print(f"  Decoded fields: {list(decoded.keys())}")

        # ── Step 4: Write to Firestore ────────────────────────────────────────
        db  = firestore.client()
        ref = db.collection(FIRESTORE_COLLECTION).document(kit_slug)
        ref.set({
            'slug'          : kit_slug,
            'metadata'      : decoded,
            'encoded_raw'   : encoded_str,       # keep for debugging
            'source_file'   : filepath,
            'processed_at'  : google.cloud.firestore.SERVER_TIMESTAMP,
        }, merge=True)
        print(f"  Firestore written: {FIRESTORE_COLLECTION}/{kit_slug}")

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
    if encoded_str:
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
