# HiParcelo complete-store foundation — 15 October 2026

## Deployment

- Unpublished review theme: **HiParcelo — Complete store review**.
- Theme ID: `191222808943`.
- Store: `m00iny-0a.myshopify.com`.
- Source branch: `store/complete-foundation-2026-10-15`.
- Based on homepage source commit `457a5be4dbc8439403a155c287f4fe43eeef911a`.
- The existing MAIN theme `191219925359` and connected `homepage/design-09` branch were not modified by this build.
- The existing Contact resource and Shopify's Your Privacy Choices resource are preserved.
- No products, paid apps, payment changes, advertising, billing changes, real orders or commercial publication were created.

## Store experience

The approved navy/teal/white design now extends to branded information pages, contact, help, tracking guidance, a reusable product template, a cart, a 404 page and a preparation/password page. Navigation connects the dedicated page routes instead of only homepage anchors.

One company-backed consumer brand and one focused first offer remain the model. The concept photographs are visibly labeled; no catalog, customer reviews, medical benefits, stock counts, urgency, delivery guarantees or invented operator details were added.

## Draft pages in Shopify

| Route | Title | Shopify Page ID | Publication |
|---|---|---|---|
| /pages/about | About HiParcelo | 709249532271 | Hidden draft |
| /pages/help | Help centre | 709249565039 | Hidden draft |
| /pages/shipping | Delivery information | 709249597807 | Hidden draft |
| /pages/returns | Returns & refunds | 709249630575 | Hidden draft |
| /pages/track-order | Track your order | 709249663343 | Hidden draft |
| /pages/privacy | Privacy information | 709249696111 | Hidden draft |
| /pages/terms | Terms of service | 709249728879 | Hidden draft |
| /pages/cookies | Cookies & preferences | 709249761647 | Hidden draft |
| /pages/first-find | Our first find | 709249794415 | Hidden draft |
| /pages/guides | Useful guides | 709249827183 | Hidden draft |
| /pages/guide-fit | Check the fit before you choose | 709249859951 | Hidden draft |
| /pages/guide-before-ordering | A clear buying checklist | 709249892719 | Hidden draft |
| /pages/guide-use-and-care | Get the useful details first | 709249925487 | Hidden draft |

Contact already exists at `/pages/contact`; only its template in the unpublished review theme was redesigned.

Page content is kept in `docs/store-pages.json` and in the native hidden Shopify pages. Each new page has its branded `hp-*` template suffix assigned. Shipping, returns, privacy, terms and cookies display preparation-draft notices.

Hidden resources are not public storefront pages. Review them through the authenticated Shopify page preview/theme editor. Their ordinary URLs must not be advertised as launched pages while hidden. Publication and any required menu activation must be coordinated only after approval.

## Editor controls and commerce

Theme settings → Store readiness:

- **Show preparation notice:** enabled.
- **Enable purchase controls:** disabled.
- **Enable contact form:** disabled.

The product template reads actual Shopify product, variant, availability, description, images and prices when a real product exists. The new store currently has no products. The first-find page is an explicitly non-purchasable concept preview.

Purchase controls and checkout are disabled in the review theme. There is no fake checkout or simulated payment outcome. Enabling them later requires verified offer, payment, fulfillment, returns and compliance readiness; a theme checkbox does not itself authorize launch.

The native Shopify contact form is implemented with name, email, topic, optional order reference, message, errors and success states. Its preview is disabled until the owner verifies the recipient destination and separately approves an end-to-end test. A successful-looking preview is not proof of email delivery.

Tracking uses the secure order-status-link approach and optional authenticated account access. It does not expose orders from an order number alone, fetch carrier data or invent shipment events. It is a tracking-help page, not a custom live tracking API.

Shopify's existing Your Privacy Choices page is linked and unchanged. The draft cookie page does not claim to be a working consent manager. No analytics, pixels or new third-party scripts were added.

## Verification

- Official Shopify Liquid/theme validation: **41 changed theme files passed**, revision 3.
- Native theme file write: **41 files accepted**, no user errors.
- Local Liquid rendering: **19 page states rendered**.
- **535 internal links checked** against the intended route manifest.
- Unique IDs, label targets and translation lookups passed.
- Product controls tested with commerce off, commerce on and sold-out fixtures.
- Contact preview and activated-form markup tested with local fixtures.
- Empty/filled cart and checkout gates tested with local fixtures.
- Local fixtures were not sent to Shopify and do not represent actual products or orders.
- Native visual browser rendering, actual checkout/payment, native contact delivery and real carrier tracking remain to be reviewed or tested. Local rendering does not establish these integrations.
- Browser executables were unavailable in the local runtime. The storefront is still password protected.

To reproduce local functional checks:

```bash
node scripts/store-preview.mjs
```

This writes ignored local review HTML and a validation summary under `preview-output/store`. Its form handling is explicitly mocked and it does not submit to Shopify.

## Launch gates still open

1. Choose one actual product-country offer, substantiate value and full after-tax economics.
2. Confirm the exact legal operator, applicable market disclosures and policy terms.
3. Verify destination, full delivery route, returns address/costs and end-to-end receipt evidence. The 15-day objective is not a published guarantee.
4. Approve licensed/verified product photography, specifications, limitations and any claims.
5. Verify payment eligibility and actual trial expiry; no paid plan has been selected here.
6. Verify support ownership, inbox delivery, customer privacy/consent and order-status access.
7. Review mobile/desktop native rendering and the entire real product/cart flow.
8. Approve coordinated page visibility, native checkout policies, theme publication and only then commerce activation.

The separate draft PR targets the existing homepage branch for review only. That branch is connected to the MAIN theme; merging into it can change the live theme. Do not merge or publish automatically.

## Documentation consulted

- https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form
- https://shopify.dev/docs/storefronts/themes/architecture/templates/product/overview
- https://shopify.dev/docs/storefronts/themes/best-practices/performance

These inform implementation, not a claim of conversion performance or legal approval.
