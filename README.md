# HiParcelo theme

A Shopify Online Store 2.0 theme for HiParcelo. Based on Shopify Dawn 16.0.0, source commit `258f00f64365e2018ca4c62778a6bf55a5d3cd18`.

The theme implements the approved design 09 and the agreed homepage structure:

1. Simple header and navigation.
2. “See it online. Make it yours.” hero.
3. Three brand principles.
4. “From screen to your space” product story.
5. Company introduction and selection approach.
6. Delivery, returns and customer help.
7. Accessible FAQ accordions.
8. Closing invitation.
9. Seller, policy and social footer.

The homepage is composed of independently editable Shopify sections. Shared settings select the real first product, support email and verified seller identity. Offer links can return a visitor to the product viewed earlier in the current tab.

The initial concept photographs are visibly labeled. No product has been selected or advertised as available. Native product, collection, cart and account templates are retained from Dawn.

The complete draft is on branch homepage/design-09. The main branch initially contains repository setup; review and merge the draft before using main as a Shopify theme source.

See [homepage controls](docs/HOMEPAGE.md) and [image provenance](docs/ASSETS.md).

For local preview, run npm ci and npm run preview. The preview renders the actual custom Liquid sections against mock Shopify objects. Native Shopify preview and checkout verification are separate checks.

Add the draft branch as an unpublished theme in Shopify for native review. This repository update does not publish the theme or change the live Horizon theme.

Upstream: https://github.com/Shopify/dawn

Dawn's MIT license and copyright notice are preserved in `LICENSE.md`.
