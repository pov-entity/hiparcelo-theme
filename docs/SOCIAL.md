# HiParcelo Social / Reels

## Route and launch state

- Page route: `/pages/social` (Shopify page uses template suffix `hp-social`).
- Section: `sections/hp-social-reels.liquid`, template: `templates/page.hp-social.json`.
- Styles and behavior: `assets/hp-social.css`, `assets/hp-social.js`.
- Source branch: `store/complete-foundation-2026-10-15`; review theme is `HiParcelo — Complete store review`.
- Header (desktop/mobile) and footer link to the social route in that review theme; the current MAIN theme is unaffected.
- No demonstration videos, reviews, follower counts or products are seeded or fabricated. Page displays a genuine empty state until reels are configured.

## Adding a Reel

1. Open Shopify Admin → Online Store → Themes → customize **HiParcelo — Complete store review**.
2. Use the **Social** page template (`hp-social`) and add a **Product reel** block.
3. Recommended: choose a Shopify-hosted video you own or are licensed to use. Native videos play muted, loop, and pause off screen; users can toggle mute/play.
4. Alternative: paste a public Instagram post or Reel URL into **Instagram Reel URL** and optionally select a licensed cover photo. The visitor clicks **Play Instagram Reel**. We validate hostname and post shortcode, then load Instagram's embed; Instagram owns playback and can refuse some content.
5. Supply an accurate title and short caption. Optionally choose an actual Shopify product for a direct **View product** link and its real current price.
6. Save and test on mobile/desktop (with and without reduced motion). Review third-party embed loading, permissions, and market-compliant product claims before launch.

## Technical and trust boundaries

- This theme does **not** scrape Instagram, use credentials, sync reels automatically, download third-party videos, fabricate customer engagement, or bypass Instagram restrictions. Automatic sync requires a separately approved, authorized Instagram / Meta integration and relevant media permissions.
- Native video autoplay follows browser policy: muted by default, never guaranteed. Instagram iframes are click-to-load, and may require visiting Instagram.
- One viewport-focused video plays at a time; IntersectionObserver pauses others. Supports keyboard up/down and next/previous buttons, scroll snapping, and user reduced-motion preferences.
- Product cards never simulate inventory, ratings, orders or discounts. A product link does not enable checkout by itself.
- Shopify Page publication and theme publication are separate. Only the unpublished review theme has this custom page design until the owner approves theme publication/deployment.
