# Terrain village explorer

Unlisted route `/terrain` — reachable by URL, not linked from the homepage. The simplified full-screen viewer offers A / Promenade and C / Garden Comb, 3D and plan cameras, fit-site, orbit/zoom/pan and each updated Image Gen concept.

## Implemented program

Both versions have four 6 × 17 m (102 m²) single-storey pavilion volumes with verandas, masonry/glazing, and rooftop solar; an 18 × 8 m social pavilion for meetings and parties; one 3 × 7 m pool and deck; two parking spaces per home plus four visitor spaces; shared ground-mounted solar; paved pedestrian/vehicle connections, defined garden spaces, native trees and yellow/purple ipês. Room counts describe the intended three-bedroom program; detailed internal floor plans are not modeled. Homes are intended to contain independent daily facilities.

A faces each long veranda toward the shared promenade. C rotates homes perpendicular to the promenade, creates side garden rooms and gives each short end a modeled entrance.

## Structure

- `terrainModel.ts`: original survey trace and pixel-to-metre conversion.
- `villageModel.ts`: deterministic geometry/materials in a road-aligned metre frame, plus exported footprint data.
- `terrainScene.ts`: full-lot surface, survey placement, procedural grass, environment lighting, shadows, camera, layout switching and resource disposal.
- `TerrainExplorer.tsx`: dynamically loads the scene, minimal controls and native concept-image dialog.
- `public/terrain/concepts/`: updated A/C images with pool and rooftop solar, generated with the built-in Image Gen tool. Prompts are saved in `output/terrain-concepts/pool-solar-prompts.md`.

The two village groups are built once and toggled so switching preserves the camera and avoids recreating geometry. Rendering runs on demand with orbit damping. Trees use instanced foliage and all GPU resources are disposed on unmount. No external model/texture downloads or new dependencies are needed.

## Accuracy

The supplied survey annotates lot 75 as 20,003 m². Boundaries were traced at approximately 5.8 pixels/metre; geometry is not a replacement for survey coordinates. Surface elevation is assumed flat. The supplied Maps pin is (-15.594963,-47.772479), but the model is not georeferenced and the presentation camera does not establish true north. Pool, solar, buildings and vehicle lanes are conceptual: internal plans, drainage, turning clearances and solar capacity remain unresolved. Generated images illustrate character; measured 3D geometry does not reproduce every image detail.

## Verification

- `node --test src/app/terrain/villageModel.test.ts`: residential area targets, footprint containment and non-overlap for both layouts.
- `pnpm exec eslint src/app/terrain`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- Browser smoke test in `.context/village-check.cjs`: rendered layout changes, both plan views, orbit/zoom, repeated switching, image dialog, mobile controls and no page errors.

## Materials and sun study

`realisticMaterials.ts` uses Image Gen masonry and lawn albedos, metre-scaled box UVs, fine surface relief, limestone/interlocking paving, timber grain, standing seams and physical glazing. The generated originals are retained; runtime WebP copies total approximately 1.3 MB. Prompts: `output/terrain-concepts/texture-prompts.md`. These are real-time materials, not a claim of photographic or path-traced equivalence to the concept images.

`solarPosition.ts` computes solar azimuth and elevation using NOAA/Meeus equations at latitude −15.594963, longitude −47.772479. Dates and times use fixed Brasília UTC−3. The controls provide a local date, time slider, sunrise/noon/sunset shortcuts, play/pause and north rotation. The model starts with north along world +X, inferred from increasing northings toward the right of the scanned survey; correction remains available because scan alignment is approximate. Shadow direction follows the computed sun. Atmospheric brightness/colour are tuned for visual exploration; terrain obstruction, weather, refraction at arbitrary times and site elevation are not modeled.

Solar references: [NOAA equations](https://gml.noaa.gov/grad/solcalc/calcdetails.html), [independent USNO rise/set comparison](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-09-09&coords=-15.594963,-47.772479&tz=-3). The sun disk is excluded from reflection-map generation to prevent HDR overflow. Near/below the horizon the last stable environment probe is retained and dimmed while actual direct sunlight is disabled below the horizon.

Garden Comb cars, bays, curb openings and pedestrian links now share exported placement data. Regression checks include roof/veranda clearance and vehicle access, rather than only wall footprints.

## Automatic evening lighting

`villageLighting.ts` adds warm interior and veranda fixtures, illuminated promenade bollards, parking and social-approach lamps, and a turquoise pool glow in both layouts. House fixtures inherit the house transform, including Garden Comb rotations. Glazing materials are cloned so vehicle windows remain unaffected.

`nightLighting.ts` smoothly fades lighting from off at a solar elevation of +2° to full intensity at −2°, reversing at sunrise. The sun panel reports daylight, twilight, or automatic night lighting. Eight shadow-free point lights per visible layout provide local illumination; repeated landscape fixtures use emissive lenses and gradient light pools to keep rendering inexpensive. This is visual lighting, not a photometric design calculation.

Run `node --test src/app/terrain/*.test.ts` for all 13 geometry, solar, twilight, and fixture tests. Browser verification in `.context/night-check.cjs` covers daylight/night transitions, switching layouts after dark, sunset dimming, mobile controls, visible illumination, and console errors.
