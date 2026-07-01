# Commerce ↔ Financial Integration Foundation

**Status:** Foundation complete and verified. **No existing page or engine file was modified.**
**Branch:** `integration/commerce-finance-foundation`
**Scope:** Foundation only. Page-by-page migration has **not** started (awaiting approval).

---

## What this is

The marketplace's commerce engine (`commerce.js`) and financial engine
(`sales_records.js`, `sales-records_1.js`, `sales_record-2.js`) were complete
in isolation but **never wired together** — nothing loaded them, the
Commerce→Financial bridge did not exist, the two families used incompatible
Firebase SDK styles, and the financial core was missing its Module 1–2
foundation. This `integration/` folder is the additive glue that connects them
into one working stack, on one Firebase connection, behind one entry point.

Everything here is **new**. The five engine files are imported **as-is**.

---

## Files (load order = dependency order)

| # | File | Role |
|---|------|------|
| 1 | `canonical-order-schema.js` | The one order shape shared by every layer, plus pure adapters (`fromFastSpring`, `toSalesRecords`, `toLibraryOrder`, `validate`). |
| 2 | `firestore-compat.js` | v8-style Firestore facade over the v9 modular API, so the v8 financial engine runs on commerce.js's v9 connection. Installs `window.firebase.firestore.FieldValue`. |
| 3 | `financial-foundation.js` | Supplies the financial core's **missing Modules 1–2** (event bus, config, logger, validator, `_ensureFirebase`, and the `recordSale` ledger writer) as the globals `sales_records.js` expects. |
| 4 | `commerce-finance-bridge.js` | The missing link: on every successful checkout, canonical order → `recordSale` → `processTransaction`. Also installs `Commerce.order` / `Commerce.finance` (which `cart_core.js` requires). |
| 5 | `engine-bootstrap.js` | Single entry point. Initializes Firebase, installs globals, imports + registers all engines on `window` in order, wires the bridge, returns a linkage report. |
| — | `__tests__/foundation.test.mjs` | Headless Node verification (12 tests, all green). |

---

## How a page will use it (migration phase — not applied yet)

```html
<!-- FastSpring payload script stays in <head> as today -->
<script id="fsc-api" src="https://d1f8f9xcsvx3ha.cloudfront.net/sbl/0.9.0/fastspring-builder.min.js"
        data-storefront="youraccount.onfastspring.com/popup-store"
        data-popup-webhook-received="commerceCheckoutSuccess"
        data-popup-closed="commerceCheckoutCancel"></script>

<script type="module">
  import { bootstrapCommerce } from './financail folder/integration/engine-bootstrap.js';

  const report = await bootstrapCommerce({
    fastspringStorefront: 'youraccount.onfastspring.com',
    fastspringProductPrefix: 'templates-',
    currency: 'USD',
    basePlatformCommissionRate: 0.30   // <-- confirm the real platform rate
  });
  console.table(report.checks);   // all checks should be ok:true

  // After bootstrap the page just calls the engine — no inline commerce logic:
  //   Commerce.handleDownload({ id: productId, title })   // opens checkout
  //   Commerce.library.getOwnedProducts(uid)              // buyer library
  //   Commerce.finance.status(orderId)                    // settlement gate
</script>
```

`window.commerceCheckoutSuccess` is wired to the **bridge**, so a completed
purchase automatically flows through the full financial lifecycle.

---

## Data flow (after bootstrap)

```
FastSpring success (fsc.js)
   → window.commerceCheckoutSuccess(payload)
   → Commerce.bridge.onCheckoutSuccess(payload)
        1. resolveProduct() enriches each line (sellerId, commission…)
        2. OrderSchema.fromFastSpring() → canonical order
        3. Commerce.order.create()      → orders/{orderId}      (buyer library reads this)
        4. SalesRecords.ledger.recordSale()               → salesRecords/{saleId}
        5. SalesRecordsContinuation.transaction.process() → transactions/{saleId}  (commission split)
        6. Commerce.order.updateFinancialStatus()         → financialStatus: "settled"
```

Downstream financial modules (payouts, settlement, refunds, reporting, exports,
audit) are unchanged and already keyed off `transactions` / `salesRecords`.

---

## Config to confirm before migration

- **`basePlatformCommissionRate`** — defaults to `0.30`. Set the real platform rate.
- **`resolveProduct(productId)`** — the default reads `products/{id}` then
  `productDrafts/{id}` for `{ sellerId, productTitle, commissionRate, unitAmount }`.
  Confirm the real product/catalog schema and pass a custom resolver if needed.
  FastSpring payloads carry no `sellerId`, so this lookup is how each sale is
  attributed to a contributor.

## Known engine issue (left untouched, needs a one-line fix during migration)

`cart_core.js` line ~120, `Commerce.library.ownsProduct`:
```js
const masterRecords = masterRecords || await Commerce.library.list(buyerId); // TDZ self-reference
```
This throws whenever `ownsProduct` is called. `list`, `hasAccess`, and
`getOwnedProducts` are unaffected. Fix (rename the const) is queued for the
migration phase per the "don't modify engines yet" instruction.
