# HiParcelo 2027 — brand palette

Approved visual distribution target for the 2027 preview:

| Role | Target visual share | Hex | Recommended usage |
|---|---:|---|---|
| White | 50% | `#FFFFFF` | Page canvas, content, articles, guides |
| Navy | 33% | `#0F2747` | Hero, navigation, footer, dark finale, strong typography |
| Light grey | 12% | `#F2F4F7` | Alternate surfaces, cards, dividers |
| Red accent | 5% | `#E53935` | Details, status marks, active states, focus |

These proportions are design targets, not automatic measurements of every viewport. Responsive layouts change coverage.

Accessibility: use `#C62828` as the button/text red where smaller text needs stronger contrast; retain brand red `#E53935` as the designated accent. No external fonts, apps, or paid assets. Animations honor reduced-motion preferences.

Implementation: `assets/hp27-palette.css` loads after `assets/hp27.css`. It overrides brand colors without replacing the homepage sections and keeps the base interactive behavior.
