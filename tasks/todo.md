# Flag wiring audit + fix

## Root causes
1. `[hidden]` defeated by author `display` rules. Breaks: show_qr, show_raffle_qr,
   show_recommendations (#rec-head + #recommendations), payment_v2 (#payments).
2. `home.js` featured badge gated on flag *value* only, ignores `hasFeature`.

## Fixes
- [x] styles.css: add `[hidden]{display:none!important}` (fixes all toggles) + `.flag-tag` styles
- [x] home.js: gate featured highlight on `on("featured_product")`
- [x] product.js: gate recommended_quantity value on `on("recommended_quantity")`
- [x] shared.js: add FLAG_META (states+source), flagTagHTML(), renderFlagTags(); QR card hosts
- [x] index.html / product.html / checkout.html: add `.flag-tag-host[data-flag]` beside each element
- [x] you.html / you.js: add "Possible states" + "Source" columns to live flag table
- [x] flags.json: fix stale show_qr description
- [x] README.md: refresh flag table with states/source + audit note (premium_users unused)

## Verify
- [x] All 13 flags map to a UI element + caption; /you table shows states/source
- [x] With flags off: no QR, no recs, no payments, no featured badge (headless Chrome, live env)

## Review
Live env confirmed the exact reported conditions (featured_product off+value, show_qr/raffle
off) plus a third latent bug of the same class: recommended_quantity off but value=3 was being
applied. Two root causes, two fixes:
1. `[hidden]` overridden by author `display` rules (`.qr-card`, `.recommendations`,
   `.panel-head`, `.payment-options`) — fixed with one global `!important` guard. This silently
   broke 5 elements, not just the 2 QRs the user saw.
2. Value-only reads ignored enabled state — fixed by gating featured_product & recommended_quantity
   on hasFeature().
Self-documenting layer added per "display state possibilities and sources": inline `.flag-tag`
captions on every driven element + Possible-states/Source columns on /you. Verified in headless
Chrome against the live Flagsmith environment (project 39600).
Note: premium_users segment is seeded but bound to no flag.

## Revision (post-review by FE owner)
Adam reversed the "Both" decision: the storefront must NEVER visually reveal
flag wiring — it looked like console output bolted onto a retail page. Removed:
inline .flag-tag captions (all storefront pages + QR cards), FLAG_META /
flagTagHTML / renderFlagTags in shared.js, .flag-tag CSS, and the /you table's
Possible-states/Source columns (reverted to Flag|Enabled|Value). README now
states the flag table is the single wiring source of truth; /you is the live
state surface. KEPT the two correctness fixes (enabled-state gating;
[hidden]{display:none!important}) — those make the UI silently obey flag state,
which is the actual requirement. Re-verified clean storefront in headless Chrome.
