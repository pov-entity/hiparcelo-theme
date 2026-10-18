# Continuous HiParcelo delivery journey

The homepage's existing `hi-delivery-journey` section now renders a continuous 3D environment. It replaces the flat image animation. It uses native WebGL, custom geometry and the existing parcel artwork. No paid services, runtime libraries, external font requests or tracking are added.

The approved logo is preserved unchanged in `assets/hi-journey-approved-logo.png`. The five existing visual references are retained in the asset manifest. They guide the navy and cream models; they are not used as moving background layers.

## Integration and controls

The unpublished photographic-film draft adds an optional MP4 renderer. Its visual reference, shot contract, implementation, validation and remaining footage requirement are documented in [delivery-journey-film.md](delivery-journey-film.md). With no film selected, this 3D journey remains the default.

`templates/index.json` already places the section after `recognize`. The section loads its controller and styles from Shopify's asset CDN. Versioned world and model URLs are passed by Liquid, preventing stale relative module imports after theme updates. Model and renderer modules load only as the storytelling section approaches the viewport.

The theme editor exposes illustrative durations for packing, international transit/customs and local delivery, plus the shipping policy link and desktop/mobile scroll distance. Defaults are 2 / 7 / 2 days. These are not route evidence or promises. The section's disclosure links to the configured shipping page, otherwise Shopify's shipping policy, otherwise the theme's `/pages/shipping` route. The real shipping commitment remains the published policy and checkout information.

## Scene contract

| Scroll | Entry and action | Exit | Camera |
| --- | --- | --- | --- |
| 0–10% | Packing arm places product, protection is added, hinged lid closes, tape and label are applied | Same sealed parcel on workstation | Warehouse overview moves toward the workstation |
| 10–20% | Parcel follows rollers and a dispatch trolley | Trolley arrives beside aircraft cargo ramp | Follow parcel, then establish the aircraft |
| 20–30% | Ramp carries parcel through open cargo door, hatch closes, taxi and takeoff follow | Parcel occluded inside airborne aircraft | Close loading view on the cargo side, then overhead pullback |
| 30–53% | Aircraft crosses one ocean surface between physical coastlines | Destination approach | Continuous overhead tracking, water and clouds controlled by scroll |
| 53–69% | Wheels deploy, touch down, aircraft decelerates; only then is parcel unloaded and sent through the customs scanner | Parcel reaches local loading bay | Track landing, then follow the physical trolley and belt |
| 69–78% | Parcel moves through open rear doors; doors close before truck departure | Parcel rigidly attached inside truck | Follow loading into a wider road view |
| 78–89% | Truck follows the arc-length road, wheels spin and steer, then parks | Truck stopped | Continuous road tracking toward neighborhood |
| 89–96% | Cab door opens, courier exits, walks to rear doors, collects parcel and follows garden path | Courier at porch with same parcel | Move from overhead to a closer entrance view |
| 96–100% | Courier lowers and releases parcel, then walks away | Parcel rests on doorstep, logo and completion copy appear | Hold the final doorstep composition |

## Deterministic animation

The visual refinement preserves the motion model byte for byte (SHA-256 `02a227c947dbb0617507a9d0fd61ba7a45866b0aaf94fff1fbd4e92233a78123`). Paths, handoffs, camera choreography, scroll ranges and timing are unchanged. The result is richer real-time 3D; it is not photographic footage.

`evaluateJourney(progress, mobile)` is a pure function. The current scroll coordinate controls geometry, doors, wheel rotation, walking, water, captions and camera. There is no elapsed-time motion or autoplay loop. Scrolling stops the scene on the next display frame. Reverse and arbitrary seeking reconstruct the same pose.

Aircraft translation is continuous; altitude uses smooth takeoff and landing ramps. Parcel coordinates follow the aircraft's pitch while inside. During road travel the parcel is transformed by the truck's actual heading. During carrying it follows the courier's local hand position. Cargo is occluded by 3D geometry and hinged doors, rather than faded away.

The renderer uses an orthographic tracking camera, depth-tested occlusion, a directional shadow map with percentage-closer filtering, metallic/roughness shading, Fresnel sky reflections, tone mapping and contact shading. Paint, brushed metal, plaster, timber, glass, fabric, rubber, cardboard, grass and paving have distinct finishes. Two 1024-pixel procedural atlases supply color variation, fine surface normals and roughness; `scripts/build-journey-materials.py` rebuilds them deterministically. They load only with the renderer. Individual two-sided leaves cast matching clipped shadows. Ocean normals combine irregular ripples with larger swells, sky reflection and sun glints. Profiled aircraft geometry, a curved cargo hatch, engine fans, rounded tyres and cab surfaces, vehicle fittings and courier details replace the simplest shapes. Fixed airframe, truck and wheel meshes and repeated rounded/spherical forms are cached. Road movement uses arc-length lookup so bends do not change travel speed. Tablet framing reserves enough horizontal space for the wings. Geometry dimensions remain constant at every zoom level.

## Accessibility and lifecycle

The canvas is decorative. A complete HTML sequence remains available to assistive technology and becomes the visible experience for reduced motion, disabled JavaScript, unavailable WebGL or graphics context loss. Reduced-motion visitors do not load the 3D modules. A keyboard-operable skip link jumps beyond the pinned story and moves focus. Essential stage information and the shipping disclosure are server-rendered.

The canvas dimensions and scroll area are reserved before renderer initialization. The renderer caps pixel density, culls distant geographic chunks, reuses cached geometry, and stops rendering outside the section or while the document is hidden. Theme editor load/unload events initialize and dispose listeners, observers and GPU resources. Preference changes can dispose and restore the animation.

## Validation

Run `npm test` for the deterministic model checks and `npm run preview` for the actual Liquid homepage preview. The model suite exercises 10,001 poses, continuity at all handoffs, forward/reverse equality, physical cargo anchors, landing before unloading, parking before courier exit, road alignment and the final parcel hold.

Browser verification passed 185 forward poses and 25 reverse poses across 1440×900, 390×844, 320×568, 768×1024 and 844×390 viewports. No overflow, JavaScript errors or WebGL errors were reported. Stopped scrolling produced no additional frames and identical canvas pixels. Reduced-motion toggling, keyboard skip, editor reload, disabled JavaScript, unavailable WebGL and context-loss fallback all passed. The realism update's median CPU render submission took 10.2 ms, with a 22.7 ms 95th percentile and 60.2 ms maximum in the software-rendered Chromium environment. These are not customer-device FPS measurements.

Run `npm run test:browser` in an environment with Playwright and Chromium installed. `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` optionally select an existing installation. The script starts and stops the actual Liquid preview, writes internal captures under ignored `verification/`, and produces a machine-readable report. The committed validation summary is `docs/delivery-journey-validation.json`. Browser measurements describe the test environment, not guaranteed customer-device frame rates. A representative iOS Safari/Android device check remains useful before a public traffic campaign.
