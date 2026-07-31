# Fable → Opus · editor.html fix brief (purple imported-frame bug)

**Date:** 30 Jul 2026 · **Author:** Fable · **File touched:** `website/editor.html` (ONE line + comment)
**Authority:** Javed granted senior cross-zone repair; change is surgical and follows your own existing pattern.

## Symptom
In the PUBLIC editor, an **imported pptx picture-frame** (e.g. the Founders & Fortune deck)
turns into a **purple box (#7C3AED)** when the user double-clicks or drags it. The BRAIN
(`editor_brain.html`) renders the same deck perfectly — so the engine/parse is fine; the bug
is editor-side only.

## Root cause (confirmed, not guessed)
`editor.html` line ~6539, inside the resize-mask keeper:
```js
fc.on('object:modified', function (e) { if (e.target && e.target.isFrame) refreshFrame(e.target); });
```
This fires `refreshFrame()` on **every** frame that is modified — including imported picture-frames.
An imported pptx picture-frame has **no `frameSrc` and no `frameKind`**: its **pattern fill IS the
photo**. Your own `rehydrateFrames()` already documents this (line ~12181):
> *"an IMPORTED pptx picture-frame — no frameSrc/frameKind, its pattern fill already IS the photo.
> refreshFrame() would wipe it to the placeholder purple on every page revisit."*

So `refreshFrame()` on such a frame **wipes its photo to the #7C3AED placeholder** → purple.
`rehydrateFrames()` guards this correctly; the `object:modified` handler at 6539 did **not**.

## The fix (applied)
Guard 6539 with the **same condition rehydrateFrames uses** — only refresh USER frames:
```js
fc.on('object:modified', function (e) {
  if (e.target && e.target.isFrame && (e.target.frameSrc || e.target.frameKind)) refreshFrame(e.target);
});
```
Imported picture-frames (neither `frameSrc` nor `frameKind`) are now left untouched — their
pattern-fill photo survives double-click/drag. User frames still refresh exactly as before.

## Why this is safe
- Mirrors your existing `rehydrateFrames()` rule — no new architecture.
- Imported frames' pattern fill scales with the fabric object on resize automatically, so they
  don't need `refreshFrame()` anyway; NOT calling it is strictly safer than wiping to purple.
- One line changed; nothing else in your frame lifecycle touched.

## To verify
Deploy/publish editor.html → import a flat/Canva picture-frame deck → double-click and drag a
frame → it should keep its photo, no purple.

## Open (your call, your zone)
If imported frames ever need a *real* re-fit on heavy resize, that's a separate enhancement in your
lifecycle — this fix only stops the destruction. Ping me if you want to pair on it.
