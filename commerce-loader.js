// ============================================================================
// commerce-loader.js
// The SINGLE, dedicated entry point that brings the cart + full commerce /
// financial engine + FastSpring checkout online.
//
// Deliberately SEPARATE from navbar.js: finance is critical and must not depend
// on the navigation bar's integrity. Each page includes this file directly
// (<script defer src="commerce-loader.js">), so the engine loads on its own.
// navbar.js only draws the cart icon and mirrors the count — it never loads the
// engine. If navbar breaks, finance still loads; if this breaks, navbar is fine.
//
// Everything here is NON-BLOCKING. Page rendering never depends on it, so a load
// failure can only leave checkout/ownership inert — it can never blank a page.
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

  // -- 2. FastSpring checkout script (Store Builder Library). Its callbacks
  //       route to the engine's handlers, installed on window by the bootstrap.
  //       TEST storefront for now — switch to live when testing passes.
  if (!document.getElementById("fsc-api")) {
    var fs = document.createElement("script");
    fs.id = "fsc-api";
    fs.type = "text/javascript";
    fs.src = "https://sbl.onfastspring.com/sbl/1.0.7/fastspring-builder.min.js";
    fs.setAttribute("data-storefront", "lazydogtemplates.test.onfastspring.com/popup-lazydogtemplates");
    fs.setAttribute("data-popup-webhook-received", "commerceCheckoutSuccess");
    fs.setAttribute("data-popup-closed", "commerceCheckoutCancel");
    document.head.appendChild(fs);
  }

  // -- 3. Full engine: auth, purchase library (ownership), Commerce->Finance
  //       bridge, checkout, finance recording. Loaded as a module, non-blocking.
  if (!document.getElementById("lazyCommerceEngine")) {
    var em = document.createElement("script");
    em.type = "module";
    em.id = "lazyCommerceEngine";
    em.textContent =
      "import { bootstrapCommerce } from './financail%20folder/integration/engine-bootstrap.js';\n" +
      "try {\n" +
      "  await bootstrapCommerce({\n" +
      "    fastspringStorefront: 'lazydogtemplates.test.onfastspring.com/popup-lazydogtemplates',\n" +
      "    fastspringProductPath: 'media-kit-templates',\n" +
      "    fastspringProductPrefix: 'templates-',\n" +
      "    currency: 'USD',\n" +
      "    basePlatformCommissionRate: 0.30\n" +
      "  });\n" +
      "  try { await window.Commerce.auth.onUserChange(function(){ if (window.nbUpdateCartBadge) window.nbUpdateCartBadge(); }); } catch (e) {}\n" +
      "} catch (err) { console.warn('[commerce] engine not loaded (cart still works):', err && err.message); }";
    document.head.appendChild(em);
  }
})();
