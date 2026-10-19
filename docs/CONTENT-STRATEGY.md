# HiParcelo content: the good-find feeling

The desired response is recognition, imagined everyday use, practical confidence and an easy next action. This is an editorial hypothesis; conversion improvement has not been measured.

| Touchpoint | Customer thought | Copy’s job |
| --- | --- | --- |
| Hero | I know that little hassle. | Create recognition with ordinary, specific moments. |
| Everyday cards | I can picture where I would use this. | Connect discovery to a routine and a reason to keep using it. |
| Delivery story | I understand the stages. | Explain packing, international handling and local delivery; distinguish illustration from a verified delivery estimate. |
| What makes a good find | I know what to check. | Explain purpose, contents, fit and the experience after choosing. |
| Guides | That answers my practical question. | Help with measurements, contents, cost and first use. |
| Delivery, returns and help | I can find the answer that matters to me. | Give a specific question and a useful route to the detail. |
| Product and cart | I know what I am about to choose. | Put fit, delivery, return information and contact beside the decision. |
| Contact and form feedback | A short question is enough. | Lower effort and explain what happened after submission. |
| About | This brand understands the moment. | Explain why familiar everyday workarounds are the starting point. |
| First find and mobile stories | There is a reason to come back. | Build focused anticipation while accurately stating availability. |

## Source of truth

Active theme copy lives in `locales/en.default.json`. The `hp_content` namespace contains complete page bodies, titles and descriptions for the existing HiParcelo page handles. `hp-page.liquid` uses these for the owned editorial and policy pages; other pages retain native `page.content`. Shopify’s existing privacy-choice page and its controls are preserved.

`docs/store-pages.json` is the readable page-content source with the purpose of each page. Keep its customer-visible values in sync with `hp_content` when editing. Existing Shopify page IDs, handles, publication states and template assignments are retained. The theme controls the visible owned-page bodies and metadata; native Admin body fields are not overwritten by this update.

The published theme is connected to `homepage/design-09`. Verify the connected theme’s files after the Git update. A repository commit by itself is not evidence of a completed storefront sync.

## Claims and launch state

Commerce stays disabled. Product, supplier and shipping testing are not claimed. The 2 + 7 + 2-day journey remains an explicitly illustrative example. Current imagery is identified as illustration. There is no customer review, urgency, scarcity, product outcome, delivery guarantee, free-return commitment or response-time claim.

Return, privacy, cookie and trading documents remain preparation notices. A confirmed product-country offer, legal seller disclosures and final operating terms remain necessary before opening orders. The public support address follows the owner’s instruction: `support@entity-e.com`. Mailbox deliverability and the Shopify contact form’s routing have not been tested in this change.

## Verification

Use the theme validator against every changed theme file. Render the actual Liquid homepage and all owned page templates with `npm run preview`. The preview also provides explicitly labelled local product/cart fixtures for layout review; those are not live store products. Existing animation model tests should continue to pass.

Relevant primary references: [Shopify storefront locales](https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files), [Shopify theme performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance), and [Your Europe consumer guarantees](https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/index_en.htm). No country-specific final policy has been established by this copy update.
