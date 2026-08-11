#!/usr/bin/env python3
"""
sitemap_sync.py — Auto-regenerate & publish sitemap.xml on kit/blog approval
==============================================================================
Problem this fixes: sitemap.xml is a static file in the repo that nobody
(and nothing) was regenerating. New media kits / pitch decks went live on
the site (Firestore status -> 'approved') but never made it into the
sitemap, so Google never learned the URLs existed — confirmed via Search
Console URL Inspection ("URL is unknown to Google", "No referring sitemaps
detected") on 7 Aug 2026.

What this does: fires on every write to Firestore `templates/{docId}`. If
the write touches a doc's approved status (newly approved, or un-approved),
it rebuilds the ENTIRE sitemap.xml from the current live Firestore data —
same query shape the site's own folder pages already use — and pushes the
file straight to the GitHub Pages repo via the GitHub Contents API. No
local git/push step required; the moment you approve a kit, the sitemap
updates within seconds.

URL sources:
  - Fixed static pages (home, folder pages, invoice, faq, etc.)
  - templates/{id} where status=='approved', one query per
    template.category (media_kit, pitch_deck, web_kit, resume_cv,
    digital_keynotes) -> the matching *_slides.html?firebase=<id>
  - templates/{id} where category=='blog' AND status=='approved'
    (index-free single-field query, status filtered in Python — mirrors
    blog.html's own query) -> blog-view.html?id=<id>

Setup (one-time, do this yourself — never paste the token into chat):
  1. GitHub -> Settings -> Developer settings -> Fine-grained tokens
     -> new token scoped to ONLY the javed5395/templatehub repo,
     permission "Contents: Read and write".
  2. In a terminal, from the firebase/ project folder:
         firebase functions:secrets:set GITHUB_TOKEN
     (paste the token when prompted — this goes straight into Firebase's
     secret manager, not into any file here.)
  3. Deploy just this function:
         firebase deploy --only functions:sync_sitemap
  4. Test it: approve any pending kit in the admin panel and check
         https://www.lazydogtemplates.com/sitemap.xml
     a few seconds later — the new URL should be in there.

If GITHUB_TOKEN isn't set yet, the function logs an error and does nothing
destructive — it never touches the live site without a successful push.
"""
import os
import json
import base64
import datetime
import urllib.request
import urllib.error

from firebase_functions import firestore_fn, options
from firebase_admin import firestore

# ── Config ────────────────────────────────────────────────────────────────
GITHUB_REPO   = os.environ.get('GITHUB_REPO',   'javed5395/templatehub')
GITHUB_BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
SITE_ROOT     = 'https://www.lazydogtemplates.com'
SITEMAP_PATH  = 'sitemap.xml'   # path of the file inside the repo

# Firestore `template.category` value -> the slides page that renders it
_CATEGORY_PAGE = {
    'media_kit':       'media_kits_slides.html',
    'pitch_deck':       'pitch_deck_slides.html',
    'web_kit':          'web_kit_slides.html',
    'resume_cv':        'career_docs_slides.html',
    'digital_keynotes': 'digital_keynote_slides.html',
}

# Fixed pages that never come from Firestore. (path, priority) — priority
# values mirror what was already in the hand-written sitemap.xml.
_STATIC_URLS = [
    ('/',                                1.0),
    ('/main.html',                       1.0),
    ('/lazydog_studio.html',             0.9),
    ('/pitch_deck_folder_section.html',  0.8),
    ('/media_kits_folder_section.html',  0.8),
    ('/web_kit_folder_file.html',        0.8),
    ('/career_docs_folder_section.html', 0.8),
    ('/digital_keynote-folder.html',     0.8),
    ('/blog.html',                       0.8),
    ('/coming_soon.html',                0.8),
    ('/whats_new_keynote.html',          0.7),
    ('/Hexa_Promptbox.html',             0.8),
    ('/invoice.html',                    0.9),
    ('/welcome_window.html',             0.7),
    ('/faq.html',                        0.6),
    ('/terms.html',                      0.4),
    ('/upload_form.html',                0.7),  # Seller Portal — public, no noindex
    ('/editor.html',                     0.6),  # design canvas/editor tool
]


# ==============================================================================
# BUILD — query Firestore for everything currently live, emit sitemap XML
# ==============================================================================
def _build_sitemap_xml() -> str:
    db = firestore.client()
    today = datetime.date.today().isoformat()
    urls = [(SITE_ROOT + path, priority) for path, priority in _STATIC_URLS]

    # One approved-kits query per category — same shape the live folder
    # pages already run (composite index already exists for these).
    for cat, page in _CATEGORY_PAGE.items():
        snap = (db.collection('templates')
                  .where('status', '==', 'approved')
                  .where('template.category', '==', cat)
                  .get())
        for doc in snap:
            urls.append((f"{SITE_ROOT}/{page}?firebase={doc.id}", 0.75))

    # Blog posts: index-free single-field query, status filtered here —
    # mirrors blog.html's own loadBlogGrid() query exactly.
    blog_snap = db.collection('templates').where('category', '==', 'blog').get()
    for doc in blog_snap:
        d = doc.to_dict() or {}
        if d.get('status') == 'approved':
            urls.append((f"{SITE_ROOT}/blog-view.html?id={doc.id}", 0.75))

    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, priority in urls:
        parts.append(
            f"<url><loc>{loc}</loc><lastmod>{today}</lastmod>"
            f"<changefreq>weekly</changefreq><priority>{priority}</priority></url>"
        )
    parts.append('</urlset>')
    xml = '\n'.join(parts)
    print(f"[sitemap] built {len(urls)} URLs ({len(urls) - len(_STATIC_URLS)} from Firestore)")
    return xml


# ==============================================================================
# GITHUB — push the rebuilt file via the Contents API (no local git needed)
# ==============================================================================
def _github_headers() -> dict:
    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        raise RuntimeError(
            "GITHUB_TOKEN not set. Run 'firebase functions:secrets:set GITHUB_TOKEN' "
            "and redeploy — see this file's header for the full setup steps."
        )
    return {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'lazydog-sitemap-sync',
    }


def _github_get_sha() -> str:
    """Current sitemap.xml blob SHA on GitHub (required to update an existing
    file via the Contents API), or '' if the file doesn't exist yet."""
    url = f'https://api.github.com/repos/{GITHUB_REPO}/contents/{SITEMAP_PATH}?ref={GITHUB_BRANCH}'
    req = urllib.request.Request(url, headers=_github_headers())
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode()).get('sha', '')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return ''
        raise


def _github_put_sitemap(xml: str, sha: str) -> None:
    url = f'https://api.github.com/repos/{GITHUB_REPO}/contents/{SITEMAP_PATH}'
    payload = {
        'message': 'chore: auto-update sitemap.xml (Firestore templates changed)',
        'content': base64.b64encode(xml.encode()).decode(),
        'branch': GITHUB_BRANCH,
    }
    if sha:
        payload['sha'] = sha
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers=_github_headers(), method='PUT',
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        resp.read()


# ==============================================================================
# TRIGGER — any write to templates/{docId}
# ==============================================================================
@firestore_fn.on_document_written(
    document='templates/{docId}',
    memory=options.MemoryOption.MB_256,
    timeout_sec=60,
    secrets=['GITHUB_TOKEN'],
)
def sync_sitemap(event: firestore_fn.Event) -> None:
    """Cheap no-op guard first: most writes to `templates` (edits, capacity
    updates, etc.) don't change what's live. Only rebuild when this specific
    write flips status into or out of 'approved' — a page appearing or
    disappearing from the public site is the only thing the sitemap cares
    about."""
    before = (event.data.before.to_dict() if event.data.before else {}) or {}
    after  = (event.data.after.to_dict()  if event.data.after  else {}) or {}
    if before.get('status') != 'approved' and after.get('status') != 'approved':
        return

    print('[sitemap] approved-status change detected — rebuilding sitemap.xml')
    try:
        xml = _build_sitemap_xml()
        sha = _github_get_sha()
        _github_put_sitemap(xml, sha)
        print(f'[sitemap] pushed to {GITHUB_REPO}@{GITHUB_BRANCH}')
    except Exception as e:
        # Never let a sitemap push failure look like a silent success —
        # but also never let it break the approval flow itself (this
        # function only reacts to writes, it doesn't gate them).
        print(f'[sitemap] FAILED: {e}')
