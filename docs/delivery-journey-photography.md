# Photographic parcel journey

The homepage defaults to twelve photographic illustrations with scroll-driven camera movement and dissolves. These are AI-generated still images, not filmed action or footage of actual HiParcelo facilities. People, vehicles and parcel poses do not move within an individual photograph. The existing nine chapter positions, HTML captions and illustrative 2 / 7 / 2 day timeline are retained.

The sequence covers open-box packing, sealed dispatch, aircraft loading, takeoff, ocean crossing, landing, customs handling, local truck loading, road travel, the courier approaching the house, placement and the delivered parcel. The approved parcel artwork and a shared courier/doorstep reference guide image consistency. All generated prompts and source filenames are recorded in `journey-photography-prompts.json`; the built-in image-generation tool produced the sources. `scripts/build-journey-photography.py --source-dir /path/to/originals` creates the project WebP assets.

## Rendering and loading

`hi-journey-photography.js` evaluates camera crops and opacity solely from scroll progress. There is no timer-based motion or continuous RAF loop. It draws only when scroll, size or a required image changes. Adjacent images prefetch without causing idle redraws. Reverse seeking reconstructs the same crops and blends. The original `hi-journey-model.js` remains unchanged at SHA-256 `02a227c947dbb0617507a9d0fd61ba7a45866b0aaf94fff1fbd4e92233a78123`.

The renderer uses native Canvas 2D and does not load the 3D renderer, its textures or a video. Wide takeoff and landing photos retain their full aircraft framing against a softly extended photographic background. Other scenes use focal crops and modest zooms. Incoming photos dissolve over an opaque outgoing frame, so a transition never exposes an empty canvas. The last decoded frame remains visible during a new image request.

The twelve desktop images total 2,694,042 bytes. Their twelve 840-pixel mobile variants total 961,516 bytes. The default first-photo poster is lazy loaded; the renderer initializes only as the story approaches the viewport. It requests the required scene and immediate neighbors, keeps a bounded decoded cache, and caps canvas pixel density at 1.5. It does not download the entire story up front. A resize can temporarily retain the old variant until the replacement decodes.

Reduced motion and disabled JavaScript show the complete server-rendered three-stage sequence with static photos. A missing image or unavailable canvas also switches to readable content. Keyboard skip exits the pinned story and moves focus. Theme editor unload and motion preference changes release listeners, images and pending image timers.

## Modes and verification

The theme editor's **Journey visuals** setting selects the photographic story or the original 3D journey. A configured Shopify-hosted film takes priority and uses the optional video renderer documented in `delivery-journey-film.md`. No production film is included.

Run `npm test`, `npm run test:photography`, and `npm run test:browser`. The photo browser suite verifies the actual Liquid homepage across five viewport sizes, all image transitions, reverse pixel equality, visible camera changes, idle frame/pixel stability, source selection, bounded caching, rapid seeking, reduced motion, no JavaScript, image/canvas failures, keyboard skip and editor reload. It writes internal screenshots under ignored `verification/photography/`. Playwright and Chromium are required; `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` can select existing installations. The video suite remains available with `npm run test:film` and requires FFmpeg.

The committed results are in `delivery-journey-photography-validation.json`. Headless-browser checks validate that environment; they do not establish actual iPhone/Android frame rates. Photographic stills are the completed available approach, and natural continuous filmed motion would require video source material.
