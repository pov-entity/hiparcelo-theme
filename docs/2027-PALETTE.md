# HiParcelo — reference palette

The approved palette was supplied as a visual reference on 2026-10-17.

| Role | Name in reference | Hex | Usage |
| --- | --- | --- | --- |
| Base dark | Charleston Green | `#2A2829` | Brand header/footer, hero, text |
| Quiet highlight | Dark Sky Blue | `#97B4DE` | Abstract parcel, minimal details |
| Functional accent | Blue | `#263A99` | Primary actions, active tab, links |
| Primary canvas | Alabaster | `#F0EBE5` | Main content and page surfaces |
| Secondary neutral | Pastel Gray | `#DCD0BE` | Cards, information sections |

This replaces the previous navy/white/red scheme. The main visual objective is **fewer competing accents and a calmer premium feeling**, retaining the 2027 motion/interaction language without neon effects. This is a palette implementation, not an assertion of conversion lift.

Implementation: `assets/hp27-palette.css` loads after `assets/hp27.css`; `sections/hp27-hero.liquid` uses the five approved colors in its abstract parcel graphic. Both are reusable in the unpublished Shopify 2027 preview.
