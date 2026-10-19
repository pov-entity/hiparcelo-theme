# HiParcelo theme

A Shopify Online Store 2.0 theme for HiParcelo. Based on Shopify Dawn 16.0.0, source commit `258f00f64365e2018ca4c62778a6bf55a5d3cd18`.

The theme implements HiParcelo's discovery website and the current customer journey:

1. Simple header and navigation.
2. “A small find. A little relief.” hero and everyday-use stories.
3. An explicitly illustrated, scroll-controlled delivery journey.
4. Purpose, contents, fit and service questions behind the first find.
5. Practical guides, delivery, returns and customer help.
6. Accessible FAQ accordions and a simple invitation to ask a question.
7. Company, support and policy footer.

The homepage is composed of Shopify sections with translatable content. Shared settings select the real first product, support email and verified seller identity. Purchase questions sit beside product and cart decisions.

The initial concept photographs are visibly labeled. No product has been selected or advertised as available. Native product, collection, cart and account templates are retained from Dawn.

The published Shopify theme is connected to branch `homepage/design-09`. The repository default `main` remains the original setup branch. Verify Shopify's theme-file sync after updating the connected branch.

The current visual direction uses a cinematic photographic hero, floating pill navigation, serif accents, overlapping discovery cards, glass panels and a navy/cream identity adapted from the owner's reference.

See [visual direction and image prompt](docs/ATMOSPHERE-DESIGN.md), [content purpose and implementation](docs/CONTENT-STRATEGY.md), [complete page copy](docs/store-pages.json), [homepage controls](docs/HOMEPAGE.md) and [image provenance](docs/ASSETS.md).

For local preview, run `npm ci` and `npm run preview`. The preview renders actual custom Liquid sections and all owned content pages against mock Shopify objects. `/products/layout-fixture` and `/cart?filled=1` are explicitly local fixtures. Native Shopify preview and checkout verification are separate checks.

Commerce remains disabled while the first offer is prepared. Policy pages remain preparation notices until the actual product, destination and operating terms are confirmed.

Upstream: https://github.com/Shopify/dawn

Dawn's MIT license and copyright notice are preserved in `LICENSE.md`.
