// ============================================
// MASTER WATERMARK SWITCH — LazyDogTemplates
// ============================================
// WATERMARK_ON = true  → watermark on ALL previews (invoices + pitch deck slides)
// WATERMARK_ON = false → removes watermarks from ALL previews site-wide instantly
//
// Downloads (PPTX / PDF files) are NEVER watermarked — only previews are.
// ============================================

const WATERMARK_ON = true;

// ── SLIDE PREVIEW WATERMARKS ────────────────────────────────────────────────
// Adds a repeating diagonal "LazyDogTemplates" overlay over:
//   • Main slide preview image
//   • Lightbox (full-screen) view
//   • Thumbnail strip images
// The actual PPTX / PDF download files are untouched and stay clean.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  if (!WATERMARK_ON) return;

  // ── Inject CSS ──
  var s = document.createElement('style');
  s.textContent = [
    /* Overlay container — sits on top of any position:relative parent */
    '.wm-overlay{position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;border-radius:inherit;}',

    /* Subtle diagonal stripe tint */
    '.wm-overlay::before{content:"";position:absolute;inset:0;',
    'background:repeating-linear-gradient(-45deg,transparent,transparent 56px,rgba(255,255,255,0.03) 56px,rgba(255,255,255,0.03) 57px);}',

    /* Rotating text grid — extends beyond the box so it fills on rotation */
    '.wm-text{position:absolute;inset:-60%;width:220%;height:220%;',
    'display:flex;flex-wrap:wrap;align-items:center;align-content:center;',
    'justify-content:center;gap:44px 56px;transform:rotate(-28deg);pointer-events:none;}',

    /* Individual watermark label */
    '.wm-text span{font-family:"Poppins",Arial,sans-serif;font-size:15px;font-weight:700;',
    'color:rgba(255,255,255,0.20);white-space:nowrap;letter-spacing:2px;',
    'text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,0.35);}',

    /* Thumbnail variant — smaller text, tighter grid */
    '.wm-thumb .wm-text{gap:18px 22px;}',
    '.wm-thumb .wm-text span{font-size:8px;letter-spacing:1px;}',

    /* Wrapper div for each thumbnail */
    '.thumb-wm-wrap{position:relative;display:block;width:100%;}',
    '.thumb-wm-wrap img{width:100%;display:block;}',
  ].join('');
  document.head.appendChild(s);

  // ── Build a watermark overlay element ──
  window.buildWmOverlay = function (isThumb) {
    var overlay = document.createElement('div');
    overlay.className = 'wm-overlay' + (isThumb ? ' wm-thumb' : '');
    var grid = document.createElement('div');
    grid.className = 'wm-text';
    var count = isThumb ? 9 : 24;
    for (var i = 0; i < count; i++) {
      var sp = document.createElement('span');
      sp.textContent = 'LazyDogTemplates';
      grid.appendChild(sp);
    }
    overlay.appendChild(grid);
    return overlay;
  };

  // ── Wrap a thumbnail <img> in a relative div + watermark overlay ──
  // Called from pitch_deck_slides.html during thumbnail creation.
  window.wrapThumbWm = function (img) {
    var wrap = document.createElement('div');
    wrap.className = 'thumb-wm-wrap';
    // Preserve onclick and title from the original img
    wrap.style.cursor = 'pointer';
    wrap.appendChild(img);
    wrap.appendChild(buildWmOverlay(true));
    return wrap;
  };

  // ── Auto-inject watermark into main preview & lightbox ──
  function injectOverlays () {
    // Main preview box
    var mp = document.querySelector('.main-preview');
    if (mp && !mp.querySelector('.wm-overlay')) {
      // Insert before the hover-expand overlay so expand icon stays on top
      var expandEl = mp.querySelector('.hover-expand-overlay');
      mp.insertBefore(buildWmOverlay(false), expandEl || null);
    }

    // Lightbox full-screen image area
    var la = document.querySelector('.lb-img-area');
    if (la && !la.querySelector('.wm-overlay')) {
      la.appendChild(buildWmOverlay(false));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectOverlays);
  } else {
    injectOverlays();
  }
})();
