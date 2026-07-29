// ============================================================================
// commerce-loader.js
// The SINGLE, dedicated entry point that brings the cart + full commerce /
// financial engine online.
//
// Deliberately SEPARATE from navbar.js: finance is critical and must not depend
// on the navigation bar's integrity. Each page includes this file directly
// (<script defer src="commerce-loader.js">), so the engine loads on its own.
// navbar.js only draws the cart icon and mirrors the count — it never loads the
// engine. If navbar breaks, finance still loads; if this breaks, navbar is fine.
//
// Everything here is NON-BLOCKING. Page rendering never depends on it, so a load
// failure can only leave checkout/ownership inert — it can never blank a page.
//
// ── FASTSPRING REMOVED, 29 Jul 2026 ─────────────────────────────────────────
// Whop is the only payment provider. FastSpring's Store Builder Library used to
// be loaded here, which caused three problems on every page of the site:
//
//   1. TWO checkout systems were bound to the same "Buy it now" button. Which
//      one ran was decided by script load order — not by any deliberate choice.
//   2. It pointed at the TEST storefront
//      (lazydogtemplates.test.onfastspring.com), so any buyer who went down
//      that path could never actually pay. Money could not reach the owner.
//   3. It hardcoded a single product path, 'media-kit-templates'. Every item on
//      the site opened that same $7.99 product regardless of what the buyer had
//      clicked — wrong item, wrong price.
//
// Whop checkout now lives entirely in whop-checkout.js, which overrides
// buyItNow(), verifies the buyer is signed in, locks the checkout email to
// their account, and only unlocks a file once the SERVER has recorded the
// purchase via the Whop webhook.
//
// Apple Pay note: the .well-known/apple-developer-merchantid-domain-association
// file at the site root belongs to WHOP, not FastSpring. Do not delete it — it
// is what makes Apple Pay work on the live Whop checkout.
// ============================================================================
(function () {
  if (typeof window === "undefined" || !document || !document.head) return;

  // -- 1. Cart brain (basket persisted in the browser). Small, self-contained.
  if (!document.getElementById("lazyCartCore")) {
    var c = document.createElement("script");
    c.id = "lazyCartCore";
    c.src = "financail%20folder/cart_core.js";
    c.onload = function () { if (window.nbUpdateCartBadge) window.nbUpdateCartBadge(); };
    c.onerror = function () { /* cart unavailable; badge simply stays hidden */ };
    document.head.appendChild(c);
  }

  // -- 2. Full engine: auth, purchase library (ownership), Commerce->Finance
  //       bridge, checkout, finance recording. Loaded as a module, non-blocking.
  //       The fastspring* options are gone; the engine simply has no provider
  //       configured here, because Whop handles checkout in whop-checkout.js.
  if (!document.getElementById("lazyCommerceEngine")) {
    var em = document.createElement("script");
    em.type = "module";
    em.id = "lazyCommerceEngine";
    em.textContent =
      "import { bootstrapCommerce } from './financail%20folder/integration/engine-bootstrap.js';\n" +
      "try {\n" +
      "  await bootstrapCommerce({\n" +
      "    currency: 'USD',\n" +
      "    basePlatformCommissionRate: 0.30\n" +
      "  });\n" +
      "  try { await window.Commerce.auth.onUserChange(function(){ if (window.nbUpdateCartBadge) window.nbUpdateCartBadge(); }); } catch (e) {}\n" +
      "} catch (err) { console.warn('[commerce] engine not loaded (cart still works):', err && err.message); }";
    document.head.appendChild(em);
  }
})();
