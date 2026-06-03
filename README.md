# Acme Outfitters public demo

A multi-page, identity-aware, flag-driven storefront. Vanilla HTML/CSS/JS, Flagsmith
SaaS, deployed to Vercel. Sibling to the in-cluster demo at
`repro-playground/devopscon-k8s-demo/ui/` and the booth SPA at
`repro-playground/devopscon-demo/`.

What this one is for: a permanent, public URL you can hand to anyone, that
demonstrates Flagsmith feature flags + identity-based segments through a real
e-commerce funnel (catalog, product detail, checkout, persona controls).

## Pages

- `/` (`index.html`) Catalog. Reads `dark_mode`, `sale_banner`, `sale_banner_text`,
  `featured_product`, `show_recommendations`.
- `/product?id=hoodie` (`product.html`) Detail page. Reads `dark_mode`,
  `show_reviews`, `early_access_badge`, `recommended_quantity`.
- `/checkout` (`checkout.html`) Cart and checkout. Reads `dark_mode`,
  `free_shipping`, `checkout_v2`, `payment_v2`.
- `/you` (`you.html`) Persona switcher, live flag values, segment membership.

## Personas

`/you` lets a visitor switch personas. Each persona sets traits on
`flagsmith.identify()` so segment-targeted flags evaluate accordingly.

| Persona | Traits | Matches segment |
|---|---|---|
| Visitor | none | none (env defaults only) |
| Free tier user | `tier=free` | none |
| Premium tier user | `tier=premium` | `premium_users` |
| Beta tester | `beta_optin=true` | `beta_testers` |
| Returning user | `visits=5` | `returning_users` |

Persona persists in `localStorage` and follows the visitor across pages.

## One-time Flagsmith setup

1. Sign up at https://app.flagsmith.com.
2. Create a project (any name). Note the numeric project id from the URL.
3. In the project, create at least one environment (Development is fine). In
   that environment, copy the **client-side env ID** (Environments > SDK Keys).
4. Account icon > Organisation settings > **API Tokens** > Create. This is the
   admin token used by `seed.sh`. Treat as secret.

Local seed:

```
cp .env.example .env
# edit .env with FLAGSMITH_PROJECT_ID and FLAGSMITH_API_TOKEN
bash scripts/seed.sh
bash scripts/validate.sh
```

`seed.sh` creates the 11 flags and 3 segments declared in `flags.json`. It's
idempotent. `validate.sh` confirms they exist.

Then edit `public/config.js` and replace `REPLACE_ME_WITH_YOUR_FLAGSMITH_ENV_ID`
with the client-side env ID from step 3. Commit.

## Local smoke test

```
python3 -m http.server 8080 -d public
# open http://localhost:8080/
```

Toggle flags in the Flagsmith UI; the page picks them up within ~15 s.

## Deploy to Vercel

1. Push this directory to a Git repo.
2. In Vercel: New Project > Import the repo. Set:
   - Framework preset: **Other**
   - Root Directory: this directory (if the repo has multiple projects)
   - The other fields default from `vercel.json` (build command, output dir).
3. Add Environment Variables (Project Settings > Environment Variables):
   - `FLAGSMITH_PROJECT_ID`
   - `FLAGSMITH_API_TOKEN`
4. Deploy. First build runs `validate.sh`; if any flag or segment is missing,
   it falls through to `seed.sh` and creates them. Subsequent builds see them
   all present and skip the seed step.

## Files

- `flags.json` Declarative source of truth. Both scripts read this. Edit to add
  or remove flags / segments; re-run seed.
- `scripts/validate.sh` Build-time check. Exits 0 if all flags + segments exist,
  1 otherwise.
- `scripts/seed.sh` Creates missing flags + segments via Flagsmith Admin API.
  Idempotent. Existing items report "exists" and are skipped.
- `vercel.json` Build command + output dir + cache headers.
- `public/config.js` Client-side env ID, hardcoded. Public per the Flagsmith
  security model.
- `public/shared.js` Flagsmith init, persona helpers, theme + persona-chip
  rendering. Imported by every page.
- `public/{index,product,checkout,you}.{html,js}` Per-page markup and behavior.
- `public/styles.css` Acme Outfitters look and feel.

## What changes when you flip a flag

- `dark_mode`: storefront theme swaps light / dark on every page.
- `sale_banner` + `sale_banner_text`: gold promo bar on `/`.
- `featured_product`: highlights a catalog card (match by product name).
- `show_recommendations`: shows the "You might also like" rail on `/` (set per
  `returning_users` segment for the demo).
- `show_reviews`: reviews block on `/product`.
- `early_access_badge`: beta badge on `/product` (set per `beta_testers`).
- `recommended_quantity`: default quantity in the qty picker on `/product`.
- `free_shipping`: zeroes the shipping line, shows FREE badge on `/checkout`.
- `checkout_v2`: 3-step Proceed-to-checkout flips to one-click Express.
- `payment_v2`: shows Apple Pay / Google Pay buttons on `/checkout`.

## Out of scope

- Real payments. Checkout is presentational.
- Multi-environment seed. `flags.json` seeds into the one project; whichever
  environment the client-side env ID points at is what visitors see.
- Cluster panel, observability, chaos. Those are k8s-demo territory.
