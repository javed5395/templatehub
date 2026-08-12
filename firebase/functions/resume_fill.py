"""
resume_fill.py — career-document CONTENT filler (server-side, PRIVATE)

Haiku only. Deliberately.

ai_fill.py runs a three-model cascade because a fifty-slide deck is a hard
problem: Haiku drifts across that much material, so Sonnet repairs it and Opus
audits the result. A career document is not that problem. The buyer has already
written the facts; this is restructuring known text into a fixed set of fields
with character limits. Haiku does that reliably at roughly a cent a document,
where the full cascade would cost six for quality nobody would be able to see.

If output quality ever disappoints, MODEL_RESUME below is one environment
variable — raise it to Sonnet without touching anything else.

The shape of the document is NOT decided here. This module returns data only.
The layout, typography and rendering all live in the site's own templates, the
same ones the free sample pages use, so what a buyer generates looks exactly
like what they just read. That separation is the point: the model fills, the
site shapes.

The API key comes from ANTHROPIC_API_KEY (Firebase env), never the browser.
"""

import os, json, re, urllib.request

API_KEY      = os.environ.get('ANTHROPIC_API_KEY', '')
MODEL_RESUME = os.environ.get('LAZYDOG_MODEL_RESUME', 'claude-haiku-4-5-20251001')
_URL         = 'https://api.anthropic.com/v1/messages'

# A resume is small. This ceiling is generous for the longest realistic career
# and still bounds the cost of a runaway generation.
MAX_TOKENS   = 2000

# Buyer input is truncated rather than refused: someone pasting their whole
# LinkedIn export should get a resume, not an error.
MAX_INPUT_CHARS = 12000


def _call(model, system, prompt, max_tokens=MAX_TOKENS):
    if not API_KEY:
        raise RuntimeError('ANTHROPIC_API_KEY not set')
    body = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }).encode('utf-8')
    req = urllib.request.Request(_URL, data=body, headers={
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode('utf-8'))
    return "".join(b.get('text', '') for b in data.get('content', [])
                   if b.get('type') == 'text')


def _json(t):
    """Pull the JSON object out of a reply that may have prose around it."""
    a, b = t.find('{'), t.rfind('}')
    if a >= 0 and b > a:
        try:
            return json.loads(t[a:b + 1])
        except Exception:
            pass
    return {}


# ── the shape the site renders ────────────────────────────────────────────────
# These field names match the sample-page renderer exactly. Change one here and
# you must change it there; they are one contract in two files.

SYSTEM = (
    "You restructure a person's existing career information into a fixed set of "
    "resume fields. You are not a writer of fiction and not a flatterer.\n\n"
    "ABSOLUTE RULES:\n"
    "1. Never invent a fact. No employer, date, qualification, tool or number "
    "may appear in your output unless it appears in the person's material. If a "
    "field has no source, omit it.\n"
    "2. Never inflate. Do not turn 'helped with' into 'led'. Do not add "
    "adjectives the person did not earn.\n"
    "3. Keep every number exactly as given. Numbers are the most valuable thing "
    "in a resume and the easiest to destroy.\n"
    "4. Write bullets that start with a verb and state a result where the person "
    "gave one. No 'responsible for'. No 'duties included'.\n"
    "5. Plain language. No 'results-driven', 'passionate', 'detail-oriented', "
    "'team player', 'synergy', 'leverage' as a verb.\n"
    "6. Return ONLY a JSON object. No commentary before or after it."
)

SCHEMA_NOTE = """Return exactly this JSON shape:

{
  "name": "",
  "role": "",
  "contact": "email · phone · city",
  "profile": "",
  "jobs": [
    {"title": "", "org": "", "dates": "", "bullets": ["", "", ""]}
  ],
  "education":   [{"what": "", "where": ""}],
  "credentials": [{"what": "", "where": ""}],
  "skills": [],
  "missing": []
}

Field rules:
- profile: 2-3 sentences, max 320 characters. What they do, how long, their
  single strongest proven result. No opening with "I am a".
- jobs: newest first, at most 5. Each 2-4 bullets, each bullet under 200
  characters. Only jobs the person actually listed.
- skills: 6-12 items, only tools and methods evidenced in their material.
- credentials: licences, registrations and certifications only.
- missing: a list of short plain-English notes naming anything important the
  resume needs but their material did not contain — for example "no dates for
  the second job" or "no numbers anywhere; add one result per job". This is
  honest feedback for the person, not an error. Empty list if nothing is
  missing."""


def fill(buyer_text: str, target_role: str = '', doc_style: str = 'ats') -> dict:
    """
    buyer_text  — whatever the person pasted: an old resume, a LinkedIn dump,
                  or a few rough paragraphs.
    target_role — the job they are aiming at, if they said. Used to decide what
                  to lead with, never to invent experience they lack.
    doc_style   — which sample set they came from, so emphasis matches the
                  layout they chose.
    """
    text = (buyer_text or '').strip()[:MAX_INPUT_CHARS]
    if len(text) < 40:
        return {'error': 'too_short',
                'detail': 'Paste a bit more — an old resume, or a few lines per job.'}

    emphasis = {
        'ats':      "This will be read by applicant tracking software first. Use "
                    "plain section wording and the exact terms a recruiter would "
                    "search. No invented keywords.",
        'exec':     "This is a senior appointment. Lead with scope and outcome — "
                    "budget, headcount, revenue — wherever the person gave them.",
        'graduate': "This person is early in their career. Treat coursework, "
                    "final-year projects and part-time work as real experience "
                    "and write them with the same seriousness.",
        'change':   "This person is changing field. Lead with what transfers to "
                    "the target role and state the previous field plainly, "
                    "without apologising for it.",
    }.get(doc_style, '')

    prompt = (
        "Here is the person's own material:\n\"\"\"\n" + text + "\n\"\"\"\n\n"
        + (f"Role they are targeting: {target_role.strip()[:120]}\n\n" if target_role else "")
        + (emphasis + "\n\n" if emphasis else "")
        + SCHEMA_NOTE
    )

    out = _json(_call(MODEL_RESUME, SYSTEM, prompt))
    return _shape(out)


def _shape(d: dict) -> dict:
    """
    Force the model's reply into the exact structure the renderer expects.

    The renderer indexes into these keys directly. A missing key or a string
    where a list belongs would throw at render time, in front of a buyer, so
    every field is coerced here rather than trusted.
    """
    if not isinstance(d, dict) or not d:
        return {'error': 'no_output',
                'detail': 'Could not read that. Try pasting your existing resume text.'}

    s   = lambda v, n=400: str(v or '').strip()[:n]
    lst = lambda v: v if isinstance(v, list) else []

    jobs = []
    for j in lst(d.get('jobs'))[:5]:
        if not isinstance(j, dict):
            continue
        bullets = [s(b, 220) for b in lst(j.get('bullets'))[:4] if s(b)]
        if not (s(j.get('title')) or s(j.get('org'))):
            continue
        jobs.append({'title': s(j.get('title'), 120),
                     'org':   s(j.get('org'), 120),
                     'dates': s(j.get('dates'), 40),
                     'bullets': bullets})

    pair = lambda k: [{'what': s(x.get('what'), 160), 'where': s(x.get('where'), 160)}
                      for x in lst(d.get(k))[:4]
                      if isinstance(x, dict) and s(x.get('what'))]

    return {
        'name':        s(d.get('name'), 80) or 'Your Name',
        'role':        s(d.get('role'), 120),
        'contact':     s(d.get('contact'), 160),
        'profile':     s(d.get('profile'), 400),
        'jobs':        jobs,
        'education':   pair('education'),
        'credentials': pair('credentials'),
        'skills':      [s(x, 40) for x in lst(d.get('skills'))[:12] if s(x)],
        'missing':     [s(x, 200) for x in lst(d.get('missing'))[:6] if s(x)],
    }
