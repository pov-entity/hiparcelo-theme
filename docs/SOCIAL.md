# HiParcelo Social / Reels

## Route and launch state

- Page route: `/pages/social` (Shopify page uses template suffix `hp-social`).
- Section: `sections/hp-social-reels.liquid`, template: `templates/page.hp-social.json`.
- Styles and behavior: `assets/hp-social.css`, `assets/hp-social.js`.
- Source branch: `store/complete-foundation-2026-10-15`; review theme is `HiParcelo — Complete store review`.
- The Social link exists in the **mobile menu only**. It is removed from the review theme desktop header and footer, and from the global Shopify Main menu. The current MAIN theme assets are unaffected.
- No demonstration videos, reviews, follower counts or products are seeded or fabricated. Page displays a genuine empty state until reels are configured.

## Adding a Reel

1. Open Shopify Admin → Online Store → Themes → customize **HiParcelo — Complete store review**.
2. Use the **Social** page template (`hp-social`) and add a **Product reel** block.
3. Recommended: choose a Shopify-hosted video you own or are licensed to use. Native videos play muted, loop, and pause off screen; users can toggle mute/play.
4. Alternative: paste a public Instagram post or Reel URL into **Instagram Reel URL** and optionally select a licensed cover photo. The visitor clicks **Play Instagram Reel**. We validate hostname and post shortcode, then load Instagram's embed; Instagram owns playback and can refuse some content.
5. Supply an accurate title and short caption. Optionally choose an actual Shopify product for a direct **View product** link and its real current price.
6. Save and test on **mobile** and check desktop redirects to the homepage (with and without reduced motion). Desktop Shopify theme-editor preview remains accessible to configure the page. Review third-party embed loading, permissions, and market-compliant product claims before launch.

## Mobile-only experience

- Social is designed exclusively for phone-width viewports (749 CSS pixels or narrower). The desktop menu and footer do not advertise it.
- At 750 CSS pixels and wider, direct navigation to the Social page redirects to the localized store homepage using `window.location.replace`. CSS also hides the feed if JavaScript is unavailable. Desktop detection is viewport-based, not a security control.
- Shopify theme-editor design mode deliberately bypasses the redirect and can display the page on desktop to allow configuration.
- The live MAIN theme is not changed; this behavior is active in the unpublished review theme until the merchant approves deployment.

## Technical and trust boundaries

- This theme does **not** scrape Instagram, use credentials, sync reels automatically, download third-party videos, fabricate customer engagement, or bypass Instagram restrictions. Automatic sync requires a separately approved, authorized Instagram / Meta integration and relevant media permissions.
- Native video autoplay follows browser policy: muted by default, never guaranteed. Instagram iframes are click-to-load, and may require visiting Instagram.
- One viewport-focused video plays at a time; IntersectionObserver pauses others. Supports keyboard up/down and next/previous buttons, scroll snapping, and user reduced-motion preferences.
- Product cards never simulate inventory, ratings, orders or discounts. A product link does not enable checkout by itself.
- Shopify Page publication and theme publication are separate. The page resource is published, but the full video-feed design only exists in the unpublished review theme. The current MAIN theme is not changed. The store remains on a trial plan and may still require an online-store password.
