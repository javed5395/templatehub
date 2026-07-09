# LazyDog Templates — Working Notes & Observations

A living list. Javed adds points; Claude removes them once fixed. Newest observations near the top of OPEN.

---

## OPEN — needs attention

1. **Download formats.** Right now a download only gives **PPTX**. Add a choice so the buyer can download as **PPTX / PDF / PNG** (and any other formats a product has). — *Javed, requested.*

2. **FastSpring pricing (temporary hack in place).** For the first pipeline test, **every "Buy it now" opens ONE product** (`media-kit-templates`, $7.99) regardless of the item, just to prove payment → record → unlock. Real per-item pricing still to do — either **price-point products** (a few FastSpring products, one per price) or **dynamic pricing** (one product, price passed at checkout, which needs a tiny serverless signer since the site is static).

3. **FastSpring go-live.** Currently the **TEST** storefront (`lazydogtemplates.test.onfastspring.com/popup-lazydogtemplates`). Switch to the **LIVE** storefront once testing passes.

4. **User account / login details.** To be set up (FastSpring live credentials / any account details). — *Javed will provide.*

5. **Verify Firestore records after a test purchase.** Check that a completed test order writes to `orders`, `salesRecords`, and `transactions`, and that the seller split is recorded.

6. **Known bug — buyer library `ownsProduct`.** In `financail folder/commerce_purchase-varification.js` (~line 120) there is a self-reference bug: `const masterRecords = masterRecords || …`. It throws when `ownsProduct` is called. `list` / `hasAccess` / `getOwnedProducts` are unaffected. Needs a one-line fix during a clean-up pass.

7. **Smoke-test the engine's first real browser load.** The full commerce+finance engine now loads in the browser for the first time. On the deployed site, open the console (F12) and confirm the `[commerce]` bootstrap report; flag any errors.

8. **Sections are empty until products are uploaded.** Career docs (`resume_cv`), social kits (`social_media_kit`), web kits (`web_kit`) will show products only once items are uploaded under those categories via the upload form. This is expected.

---

## DONE — recently resolved (kept for reference; prune anytime)

- **Finance decoupled from navbar.** Loading moved into a dedicated `commerce-loader.js` included on every page; navbar keeps only the cart icon UI. (Fixes the single-point-of-failure risk.)
- **Cart checkout = one combined payment** (never one charge per item).
- **Button roles fixed:** "Buy it now" = direct buy; "Add to basket" = cart; "Download" = locked until paid.
- **All 5 sections Firebase-driven end-to-end** (product pages + folder pages): pitch decks, media kits, career docs, social kits, web kits.
- **Cart basket icon + live count** added to the top bar (site-wide), with a slide-out panel to view/remove items.
- **"Website Kit"** category added to the seller upload form.
- **Integration foundation built** (canonical order schema, v8↔v9 Firestore shim, missing financial Modules 1–2, Commerce→Finance bridge, catalog, bootstrap loader) — the glue that was missing between the engines.
