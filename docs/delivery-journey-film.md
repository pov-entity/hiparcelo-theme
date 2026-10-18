# Photographic delivery film

Status: optional film support is included alongside the default photographic still-image story. No production footage is included. The test clips are synthetic color patterns for verifying the player, not delivery footage. The production branch is `homepage/design-09`.

The requested look is a real camera observing real materials and people: natural smartphone exposure, daylight white balance, tactile cardboard, ordinary fabric creases, imperfect stone and timber, believable hand contact and camera depth. Further shading of the procedural 3D scene cannot supply that photographic quality. A filmed or generated video supplies the visuals; the existing scroll controller supplies the timing.

## Visual reference

`assets/hi-journey-film-doorstep-reference.webp` is a generated photographic art-direction keyframe. It is not proof of an actual HiParcelo delivery, a video, or a replacement for the full journey. Its derived placing image is used as an illustrated scene in the photographic story. The existing package photograph was the brand reference. The built-in image-generation tool created the new photograph; its output was encoded as WebP for this project.

Generation prompt:

> Use case: photorealistic-natural. Asset type: a photographic art-direction keyframe for the HiParcelo homepage delivery film, not a website mockup. Generate one single landscape 16:9 full-bleed photograph, preferably 3840x2160. Input image is a reference ONLY for the parcel's actual design: retain this same rigid deep navy blue cardboard mailer box, cream 'Hi Parcelo' wordmark and the small curved smile below the Hi. Do not reuse the reference's white studio backdrop. Primary request: make the delivery feel indistinguishable from a real very high-end smartphone video frame. A real delivery courier in a navy cotton polo, dark work trousers and practical shoes is gently lowering that navy parcel onto the pale stone step at the wooden front door of a real modern cream house. He bends naturally, and both anatomically correct hands grip the parcel at its sides. The package is medium shoebox size, about 32 x 24 x 18 cm, not a giant box. Capture just before the parcel touches the step. Camera: handheld smartphone about chest-height, looking down slightly toward the doorstep, normal 26 mm equivalent main-camera field of view, physically possible viewpoint. Wide clean framing that also crops into a center portrait view; courier and navy parcel clearly visible in center-right, actual home entrance and garden path in background. Natural smartphone computational HDR and daylight white balance, believable photographic exposure, crisp tactile focus on carton grain and hands, more gently resolved background, subtle sensor texture, natural skin pores, real fabric creases, imperfect paint and wood grain, individual grass blades and real leaves, soft late afternoon daylight with consistent contact shadows, no dramatic cinematic teal/orange grade. The real outdoor environment continues beyond all edges. No floating objects, no miniature set, no isometric view, no 3D render, no CGI look, no game aesthetics, no toy people, no excessively polished plastic, no exaggerated bokeh, no graphic overlays, no captions, no camera UI or phone frame, no watermark. The requested 'iPhone 18 Pro Max' feel means premium natural smartphone footage; do not show any phone, label camera specs, or invent device features.

The actual generated reference is 1672 × 941 pixels. It is a photographic visual target, not a claimed 4K deliverable or evidence of any device's specifications.

## Film content and timing

Produce a single complete journey, preserving the existing nine chapter boundaries. A 60-second master gives these edit positions; a different duration must retain the same percentages. The footage must be genuine continuous motion within shots. Do not substitute panning photographs for packing, walking, cargo handling or driving.

| Scroll | 60-second edit | Required content |
| --- | --- | --- |
| 0–10% | 0–6 s | Same navy parcel: product placed, protective packing added, lid closed, tape and label applied |
| 10–20% | 6–12 s | Same sealed parcel travels along real warehouse rollers toward dispatch |
| 20–30% | 12–18 s | Parcel enters aircraft cargo bay; hatch closes before takeoff |
| 30–53% | 18–31.8 s | Aircraft crosses the sea, with real ocean scale, atmosphere and cloud depth |
| 53–69% | 31.8–41.4 s | Aircraft lands before unloading; parcel passes through a believable customs handling area |
| 69–78% | 41.4–46.8 s | Same parcel loaded into navy delivery truck; rear doors close before departure |
| 78–89% | 46.8–53.4 s | Truck follows the road, approaches the neighborhood and parks |
| 89–96% | 53.4–57.6 s | Same courier leaves parked truck, collects parcel and approaches the house |
| 96–100% | 57.6–60 s | Courier gently places and releases parcel, then leaves it safely on the step |

Keep the parcel shape, scale, navy color, logo orientation, courier identity and clothing consistent between shots. Ground people and vehicles with correct contact, perspective and shadows. Use physically possible camera placements. The aerial shot should have the same natural photographic treatment; do not imply that it was literally filmed by a person standing next to an airborne aircraft.

## Player integration

The section now accepts a Shopify-hosted **Photographic journey film** plus an optional **Mobile journey film** in the theme editor. Both edits must align to the same chapter percentages. Only MP4 sources are used; HLS manifests are excluded because this experience seeks arbitrary paused positions. The browser selects a suitable rendition and changes sources when crossing the mobile breakpoint. If the mobile edit is absent, it crops the main film.

The video host must support byte-range requests and accurate seeking. Unsuccessful seeks are bounded and time out to the readable fallback instead of creating an event retry loop. The MP4 URL is assigned only as the section approaches the viewport. The video remains muted, inline and paused. There are no `play()` calls, autoplay or continuous RAF loops. Scroll progress requests a frame, and a seek in progress is allowed to settle before requesting the most recent target. It works forward and backward and holds the last valid frame at completion. It reuses the unchanged chapter model and existing captions, timeline and skip control. Film mode does not load WebGL or its material textures.

Reduced motion, disabled JavaScript, a failed/unsupported video, and a 12-second load timeout retain the server-rendered readable journey. Toggling reduced motion and unloading the section release the media source and cancel listeners. No film selected retains the previous 3D renderer.

## Encode and review

Use a 30 fps silent H.264 MP4 with fast-start metadata, frequent keyframes, no B-frames and a portable 4:2:0 pixel format. An example local encode is:

```sh
ffmpeg -i journey-master.mov -an -vf 'scale=1920:-2,fps=30' -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart journey-desktop.mp4
```

Prepare an equivalent portrait master for mobile. Inspect the actual Shopify MP4 renditions after upload: transcoding can change the keyframe spacing. Verify scrub latency, seek accuracy, compression, subject framing, loading and final-frame hold on an actual iPhone/Safari and Android device before publishing. Do not assume a successful software-browser test proves device performance.

Run `npm run test:film` with Playwright, Chromium and FFmpeg available. It creates ignored synthetic fixtures and tests the real Liquid output. `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` select existing installations. The existing `npm test` and `npm run test:browser` continue to verify the original motion and renderer when no film is selected.

The optional renderer passed 110 film seek poses across five viewport sizes and the checks recorded in `delivery-journey-film-validation.json`. The original model passed 14 tests and the 3D mode passed its existing 210-pose browser suite. These checks validate integration using synthetic clips; they do not verify footage quality or photographic motion.
