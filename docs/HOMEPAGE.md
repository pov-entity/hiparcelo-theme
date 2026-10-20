# Homepage controls

The approved page order is header, hero, three brand principles, product story, company introduction, delivery/returns/help, FAQs, closing invitation and footer.

Each homepage section is independently editable and reorderable in Shopify's theme editor. The header and footer are section groups.

## Shared settings

Theme settings → HiParcelo contains the first product, customer support email, verified seller identity and the navy/teal/surface colors. Selecting the first product provides real product links throughout the page. Section-level product selections are optional overrides.

Theme settings → Logo supplies the header logo. The initial text wordmark is a temporary brand treatment, not the owner's final logo.

Theme settings → Social media contains the actual profile links. Empty profiles are not rendered. The footer links only to policies that have real content in Shopify.

Customer support defaults to the store's contact email unless a customer-support email is configured. Confirm that mailbox before launch.

## Content and imagery

Headings and body text have editable overrides. Leaving them blank uses the translatable English defaults. The locale files contain all interface strings and theme-editor labels.

The two initial photographs are AI-generated illustrative concepts based on the approved design 09. They show a fictional organizer and plain parcel. They are not supplier evidence, actual packaging or a selected product. Each is visibly labeled.

Choose real imagery through the hero and product-story image pickers. A selected product's featured image is used when no separate image is assigned. Turn off the concept fallback after real assets are ready. The separate concept-label control can identify uploaded illustrative images.

The initial FAQs honestly describe preparation. Replace them with verified product-country, delivery and return information before launch. No review count, customer rating, dispatch speed, free shipping or tested-product claim has been invented.

## Returning to a product

On a product page, the header's script stores the product title and same-origin product path in sessionStorage for up to two hours. Returning to the homepage changes the offer links to “Back to [product]”. Numeric variant IDs are preserved. External links, invalid records, expired records and blocked storage fall back to the ordinary homepage links.

This behavior requires no external tracking service and sends no data to a server. It is confined to the current tab's session.

## Preview and verification

Run npm ci and npm run preview to view the actual custom Liquid sections locally. The preview uses mock Shopify objects, including an example contact email; it does not render Dawn's entire checkout or store infrastructure.

npm run preview -- --write produces a static local HTML snapshot.

Review the theme as an unpublished Shopify theme to verify native theme-editor controls, real product objects, policies, localization and the product/cart journey. The local preview and code validation do not establish that live Shopify integration has passed.

The current live store uses Horizon. This repository contains a separate Dawn-based HiParcelo theme.
