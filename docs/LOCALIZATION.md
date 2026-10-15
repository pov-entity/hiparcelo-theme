# HiParcelo European language foundation

Prepared on 15 October 2026 for the unpublished **HiParcelo — Complete store review** theme (`191222808943`). English remains the primary language. French (`fr`), German (`de`), Spanish (`es`), Italian (`it`), Dutch (`nl`) and European Portuguese (`pt-PT`) are enabled as **unpublished** language drafts. This is a first language wave, not coverage of every European language or an approval to sell in those countries.

## What is translated

- 221 custom storefront strings per added language, plus 20 prepared page heading and introduction strings per language. The existing Shopify theme translations are preserved.
- Homepage, navigation, footer, product and cart interface, help and FAQ answers, contact labels and status messages, tracking guidance, preparation notices, password screen, 404 and concept-image descriptions.
- Native titles and page body content for the 13 new pages, plus the existing Contact title and privacy-choice title/body: **174 native page-field translations** across 15 resources. Page handles remain stable; translated internal page links retain the language prefix.
- Ten generic page templates use a named translation key for their headings and introduction. To replace these with custom section text, clear the translation content key in the editor and translate the replacement content before activating languages.

## Navigation and layout

Header, footer and password templates use Shopify's native localization form. It offers only the languages Shopify exposes for the current storefront context, selects the active language, works without JavaScript and uses language names rather than country flags. With English as the only public language, customers are not offered unpublished options.

Localized page URLs are joined safely whether `routes.root_url` is `/`, `/fr` or a regional prefix. Product-return history is separated by language so a previous language's product title is not inserted into the current navigation. The mobile menu breakpoint and text wrapping allow for longer translated text. No automatic currency conversion, delivery destination or country redirection is inferred from language choice.

The extra native policy links are suppressed while the preparation notice is enabled, keeping unreviewed default policy text out of the draft footer. The existing Shopify privacy-choice resource is preserved. Its six translated draft bodies localize the page text and widget labels, add an explicit preparation notice, and preserve the native scripts and widget container. This is a US-specific control, not a complete European consent setup; the original English source remains unchanged and needs operational/legal alignment before launch.

## Validation and installation

- Official Shopify theme validation: all 31 changed theme files passed; the helper reported non-blocking snippet-reference/parameter warnings despite the snippet being rendered and exercised by local checks.
- Local Liquid rendering: 19 route states in each of seven languages, **133 route states** total; **535 internal route-manifest links per language**, 3,745 total. Checks cover translation presence, placeholders, unique IDs, labels, selected language, hidden unavailable language options, disabled and enabled contact fixtures, cart fixtures and purchase/sold-out gates.
- Localized page HTML is checked for balanced allowed tags and valid language-prefixed internal links.
- Shopify accepted all 31 theme files without user errors or pending jobs. Remote checksums match the local files exactly.
- All 174 saved native page-field translations match their submitted values, with no outdated flags. All six added locales and the review theme remain unpublished.

The local renderer substitutes Shopify forms and resources with fixtures. It does not prove browser layout, Shopify's localization POST, real checkout, payment, notification delivery, contact delivery or carrier tracking. No product or order fixture was sent to Shopify.

## Review and activation

Review **Online Store → Themes → HiParcelo — Complete store review → Preview**, using the preview's language selection where Shopify exposes the unpublished locale. Hidden pages require authenticated page preview or the theme editor. Local language render outputs can also be regenerated with `HP_LOCALE=fr npm run preview:store` and the other locale codes.

Before publication, select one product-country offer, substantiate product information and economics, confirm the seller identity, payment eligibility, actual delivery and return arrangements, support destination, tax/currency presentation and privacy/consent configuration. Country-specific legal review and native-speaker review of the commercial offer remain outstanding; translation is not legal approval or delivery coverage.

The only configured market at audit time was **United States**. No European markets, country availability, checkout permissions, currency settings, live redirects, accounts, paid apps or subscriptions were created or activated. The MAIN theme, primary language, hidden-page visibility, commerce gate and contact-submission gate were not changed by this localization work.

Checkout and email notifications use Shopify-managed content. Shopify provides supported translations after language publication, but the actual checkout, notification templates and customer privacy controls still need preview and end-to-end review. There are no real products to translate yet; future product titles, descriptions, variants, image text, SEO fields, specifications and offers must be localized and reviewed when selected.

## Maintaining the content

`docs/localization-copy.tsv` is the custom storefront translation source. `docs/localization/pages-*.json` holds localized page content. `npm run localization:build` rebuilds theme locale additions without replacing Shopify's standard translation keys. Register updated page body/title translations against fresh Shopify translatable-content digests whenever source pages change; a theme upload alone does not update native page translations. The authenticated Shopify source digests and write payloads are intentionally not stored in the repository.

Primary references:

- https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files
- https://shopify.dev/docs/apps/build/markets/manage-translated-content
- https://shopify.dev/docs/api/liquid/tags/form
- https://help.shopify.com/en/manual/international/languages
- https://help.shopify.com/en/manual/international/languages/checkout-and-notifications
- https://help.shopify.com/en/manual/online-store/themes/adding-themes

Do not merge the review branch into `homepage/design-09` or publish the theme/languages automatically: that base branch is connected to the MAIN theme.
