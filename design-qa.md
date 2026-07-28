# Listening Console 3D perspective design QA

## Shared-plane desk gear correction (v2)

- Re-rendered each product against two locked turntable cameras:
  - Desktop uses the integrated console's front-center, shallow 0.62 surface
    compression.
  - Mobile uses the standalone turntable's front-left three-quarter azimuth.
- Desktop and mobile now load separate versioned assets. The previous cutouts
  remain unreferenced for non-destructive comparison.
- The ATH-M50x pads sit on the plane with both exterior logo plates
  foreshortened, the Magi65 deck is visibly compressed, and the mouse and open
  AirPods case have grounded base footprints instead of catalog-style overhead
  angles.
- Chroma-key removal, edge contraction, despill, tight cropping, and alpha-WebP
  optimization were completed locally. The previous horizontal edge streaks
  are absent.
- Alpha QA across split light/dark backgrounds:
  `.context/desk-gear-v2-alpha-qa.jpg`.
- Static perspective and placement checks:
  - Desktop: `.context/listening-console-shared-plane-v2-static.jpg`.
  - Mobile: `.context/listening-console-shared-plane-v2-mobile-static.jpg`.
- Every object retains its independent outer position layer, stable
  `data-gear-id`, `data-gear-motion` wrapper, and item-specific transform
  origin. Variant-specific bottom anchors now place each cutout by its contact
  point.
- Per-object CSS contact ellipses and a shared upper-left directional drop
  shadow ground the set consistently without baking shadows into the assets.
- The decorative layer remains pointer-transparent, assistive-technology
  hidden, reveal-driven, and instantaneous under reduced motion.

### Shared-plane verification completed

- `pnpm lint`: passed.
- In-place Turbopack production build: passed.
- Development server render: HTTP 200.
- Rendered HTML contains all four stable gear identifiers.
- All eight desktop/mobile v2 assets return HTTP 200.
- All asset corners are fully transparent; the light/dark QA sheet shows no
  visible chroma fringe, clipping, or horizontal alpha streak.
- Final v2 asset payload before Next image optimization: 404,684 bytes.

### Shared-plane verification remaining

- Live browser captures at 1420px, 1024px, 390px, and 320px in both themes.
- Pointer and keyboard regression pass for record inspection, platter
  placement/ejection, and viewer overlay stacking.
- The supported in-app browser control surface is not exposed in this
  workspace, so live capture and interaction checks remain blocked.

- Source visual truth: `.context/attachments/RECdcW/CleanShot 2026-07-28 at 06.58.47@2x.jpg`
- Source pixels: `1420 × 594`
- Rejected flat comparison: `.context/attachments/LH7WSj/CleanShot 2026-07-28 at 06.58.53@2x.jpg`
- Previous implementation capture: `.context/attachments/MmcpVq/CleanShot 2026-07-28 at 07.24.15@2x.jpg`
- Latest user-provided implementation capture: `.context/attachments/fSdxNR/CleanShot 2026-07-28 at 07.43.20@2x.jpg`
- Latest implementation capture pixels: `2734 × 1189`, desktop light theme, initial interaction state
- Latest 3D viewer feedback capture: `.context/attachments/cNOr1i/CleanShot 2026-07-28 at 08.11.15@2x.jpg`
- Latest floating-view feedback capture: `.context/attachments/Kk8fkt/CleanShot 2026-07-28 at 08.15.34@2x.jpg`
- Latest record-framing feedback capture: `.context/attachments/SZrtyD/CleanShot 2026-07-28 at 08.22.15@2x.jpg`
- Latest width-boundary feedback capture: `.context/attachments/JVM0We/CleanShot 2026-07-28 at 08.23.17@2x.jpg`
- Latest normalized comparison: `.context/listening-console-target-current-v3-comparison.jpg`
- Intended final comparison viewport: `1420 × 594`, desktop light theme, initial interaction state
- Implementation URL: local home page, `#on-rotation`
- Post-fix implementation screenshot: unavailable
- Density normalization: the supplied implementation capture was center-fit to
  `1420 × 594` for structural comparison only; theme and viewport state differ.

## Full-view comparison evidence

The target and the user-provided implementation capture were placed together
at a normalized size and inspected. That comparison exposed four P1 structural
differences: a detached turntable, a duplicate detached control strip, a console
that was too narrow, and live sleeves misaligned with the cabinet dividers.

Those issues were rebuilt around one integrated generated shell and a matching
foreground occlusion layer. A static asset composite was inspected at
`.context/listening-console-v2-static-composite.jpg`; it confirms the revised
asset geometry and overlay coordinates are aligned, but it is not a
browser-rendered implementation screenshot.

The latest light-theme capture isolates the remaining P1 defect: the lower
foreground fascia/rail paints correctly, but the full integrated shell does not.
That makes the scene appear cut across its middle and leaves the records and
turntable controls floating over the page background. The full-resolution shell
is now painted directly as the scene background instead of relying on a
fill-positioned image layer; the foreground occlusion image and live controls
remain above it.

## Focused region comparison evidence

Blocked after the fix because the required in-app Browser control surface is
still unavailable. The final live page therefore cannot be captured in the same
theme, viewport, and interaction state as the target.

The same limitation applies to the new interactive 3D inspection state. Its
record, sleeve, placement, ejection, and replacement states compile and are
present in the production output, but still require a live screenshot and
pointer/touch pass before visual QA can be marked complete.

The supplied 3D viewer capture exposed an overly modal presentation: a large
rounded frame, dark radial wash, inspection header, and shared cream action
tray visually separated the object from the physical console. Those layers are
now removed. The object and independent pill controls float directly above the
shelf, whose brightness is preserved with only a 1.25px blur.

The follow-up capture confirmed that the frame was gone, then isolated the
remaining sleeve-view chrome and a dark rectangular ground-shadow plane beneath
the model. The sleeve view now has no visible close or action controls, the
Three.js shadow plane has been removed, and the shelf blur is reduced to 0.75px.
Backdrop click and Escape remain the dismissal paths.

The latest record capture exposed two final framing defects: the disc projection
was clipped at the lower canvas edge, and the focused canvas drew a rounded white
outline around the inspection area. The record camera is now pulled back and
vertically centered so the complete tilted disc remains inside the transparent
canvas, and the canvas-specific focus ring has been removed.

The latest width-boundary feedback marks the page/text content bounds over the
desktop scene. The previous console used `calc(100% + 12rem)` and an asymmetric
horizontal translation, so it overflowed too far and unevenly on both sides of
that frame. The desktop scene is now centered at `109.65%` of the section width:
its 4.4% internal frame inset lands on the text/page boundary while only the
outer wood shell bleeds past it. All percentage-positioned records, controls,
imagery, and hit targets scale together.

## Findings

- P1 fixed in code: cabinet, turntable, and fascia are now one continuous object.
- P1 fixed in code: the desktop console breaks out to nearly the full viewport
  width, matching the source silhouette.
- P1 fixed in code: record bays and sleeves share the generated shell's measured
  coordinates; the foreground rail occludes sleeve bottoms.
- P1 fixed in code: metadata now sits directly over the shell's blank brushed
  metal panel instead of creating a second panel below it.
- P1 fixed in code: the full shell is now a direct image background at the base
  of the scene, restoring the bay backs, wood deck, and cream turntable recess
  without the mid-shelf cutoff.
- P2 fixed in code: the console is widened, shifted left, and vertically tightened
  to match the target's normalized bounds.
- P2 fixed in code: embedded fascia copy keeps dark ink on the light metal panel
  in both themes.
- Remaining: browser-rendered fidelity, console state, and live drag behavior
  still require a post-fix capture.
- P1 fixed in code: the turntable now starts empty and record/sleeve inspection
  no longer shares the Spotify navigation action.
- P1 fixed in code: the lazy 3D viewer includes physical vinyl and sleeve
  materials, generated album-specific label/back/spine textures, explicit
  placement actions, platter ejection, and sequential record replacement.
- P1 fixed in code: the 3D viewer no longer reads as a modal card; the frame,
  dark overlay, visual heading, and shared action container have been removed.
- P1 fixed in code: sleeve inspection is now control-free and the generated
  ground-shadow mesh/texture has been removed from the 3D scene.
- P1 fixed in code: record inspection is also control-free; the visible rotation
  helper has been removed, and Escape is registered as a document-level exit
  shortcut while either 3D object is open.
- P1 fixed in code: the record camera now provides enough projection margin for
  the full disc at its idle angle, with no bottom-edge clipping.
- P2 fixed in code: the canvas no longer paints a rounded white focus frame
  around the floating record.
- P2 fixed in code: the desktop console replaces the oversized 12rem breakout
  with a centered 109.65% width, aligning its 4.4% internal frame with the
  text/page boundary.

## Verification completed

- `pnpm lint`: passed.
- `pnpm build`: passed.
- Home page server render: passed.
- The new integrated shell and foreground assets return HTTP 200.
- The rendered home-page markup includes the section copy and Spotify album URL.
- The production home page renders the empty-platter prompt.
- The 545 KB uncompressed Three.js viewer chunk is absent from the initial HTML
  and is requested only after viewer preload/open.
- Source inspection confirms that only explicit Spotify anchors use the album
  URL; viewer and placement actions contain no `window.open` call.

## Comparison history

- Initial pass: blocked before visual comparison because no supported in-app
  Browser control tool was exposed.
- User capture pass: structural comparison completed; four P1 issues identified
  and rebuilt.
- Second user capture pass: integrated construction confirmed; one P1 layering
  issue and three P2 alignment/contrast issues fixed.
- Light-theme user capture pass: isolated the cutoff to the integrated shell
  layer; replaced that layer's rendering path while preserving the real asset.
- Post-fix pass: blocked pending a live browser capture of this final adjustment.

## Follow-up polish

- Capture the initial desktop state at the source width, with the full section
  visible.
- Compare the full section and focused console region beside the selected source.
- Exercise successful/missed drag, tap, keyboard, reduced-motion, mobile, and
  dark-theme states; fix any P0/P1/P2 differences before marking QA passed.

## Warm amber CRT metadata display

- Source visual truth:
  - Metadata placement:
    `.context/attachments/0Zova5/CleanShot 2026-07-28 at 08.36.38@2x.jpg`
    (`892 × 320` pixels).
  - CRT material reference:
    `.context/attachments/TGdI44/CleanShot 2026-07-28 at 08.36.34@2x.jpg`
    (`582 × 462` pixels).
  - Pre-change metadata crop:
    `.context/attachments/7KV12Q/CleanShot 2026-07-28 at 08.35.40@2x.jpg`
    (`1012 × 318` pixels).
  - First CRT implementation feedback:
    `.context/attachments/fd6Kps/CleanShot 2026-07-28 at 10.03.56@2x.jpg`
    (`1056 × 492` pixels).
  - Proportional CRT implementation feedback:
    `.context/attachments/MzZmo1/CleanShot 2026-07-28 at 10.15.26@2x.jpg`
    (`2302 × 848` pixels).
- Generated asset:
  `public/on-rotation/crt-amber-display.png` (`1400 × 211` pixels).
- Implementation route/state: local home page, `#on-rotation`, desktop light
  theme, initial Bad Bunny selection.
- Browser DOM viewport checked: `1596 × 1050` CSS pixels at device pixel ratio
  `2`.
- Post-fix implementation screenshot: pending the user's visual verification
  pass.

### CRT verification completed

- Generated raster asset was opened and inspected before integration. The blank
  screen has a 6.64:1 aspect ratio, a thin dark bezel, warm smoked glass,
  embedded scanlines, and no baked text or logos.
- The live browser rendered the visible CRT as `DeBÍ TiRAR MáS FOToS` /
  `Bad Bunny`; the optimized visible image loaded at `420 × 63` intrinsic
  pixels.
- Selecting the Multitude sleeve changed the visible CRT to `Multitude` /
  `Stromae`, kept the correct Spotify album URL, opened the existing inspection
  dialog, and restored focus to the same sleeve after Escape.
- Decorative glass/signal layers are hidden from assistive technology while
  title and artist remain real DOM text.
- Reduced-motion takes the static branch for both the continuous signal motion
  and album-change transition.
- `pnpm lint`, `pnpm build`, `git diff --check`, home-page HTTP response, and
  CRT asset HTTP response all passed.

### CRT sizing correction

- P1 identified from the first user capture: the screen was visibly compressed
  into a thin strip and clipped the metadata.
- Browser measurement confirmed the mismatch: the raster rendered at
  `354.13 × 12.85` CSS pixels (`27.56:1`) while the source asset is `6.64:1`.
- Fixed by sizing the raster inside a flex slot, replacing percentage block
  padding with a stable 3px inset, and using a pre-transform `1498:211` aspect
  ratio that compensates for the console's existing `scaleY(1.07)`.
- Post-fix browser measurement is `281.26 × 42.39` CSS pixels (`6.635:1`);
  the visible title/artist area is `241.88 × 30.54` CSS pixels and both lines
  fit without clipping.
- Post-fix `pnpm lint` and `pnpm build`: passed.

### CRT perspective and alignment correction

- P2 identified from the proportional user capture: the scale was correct, but
  the screen remained front-on and sat too far inside the metadata track.
- The embedded screen is now left-anchored with a measured `4.48px` track inset
  instead of the previous approximately `46px` centered inset.
- Follow-up capture
  `.context/attachments/frvJXa/CleanShot 2026-07-28 at 10.22.29@2x.jpg`
  (`1202 × 554` pixels) showed that the `skewY` correction still read as a
  straight, pasted-on parallelogram rather than the shelf's receding plane.
- Replaced that two-dimensional skew with
  `perspective(900px) rotateY(3deg) skewX(1.1deg)`, anchored at `left center`.
  The complete bezel, glass, signal effects, and live text now share one
  trapezoidal transform while retaining the approved scale and left inset.
- The mobile treatment remains flat and unchanged.
- Prior live DOM verification retained the initial Bad Bunny title/artist and
  the corrected source aspect. For this perspective revision, `pnpm lint`,
  `pnpm build`, and `git diff --check`: passed.

### CRT visual comparison status

- Full-view comparison evidence: pending the user's visual pass.
- Focused metadata comparison evidence: pending the user's visual pass.
- Fonts/typography: Geist Mono hierarchy and verbatim title capitalization are
  implemented; visual optical-weight confirmation is pending.
- Spacing/layout rhythm: the CRT remains inside the first control-panel track;
  desktop, tablet, and stacked-mobile visual confirmation is pending.
- Colors/tokens: warm amber text and dark smoked glass are implemented in both
  themes; contrast and bloom balance require visual confirmation.
- Image quality: the project uses the generated raster surface rather than CSS
  art; final resampling and corner treatment require visual confirmation.
- Copy/content: title, artist, and Spotify mapping are functionally verified.
- Blocking finding: visual evidence is still required at desktop light/dark,
  1024px, 390px, and 320px before the CRT change can receive a passing design-QA
  result.

## Platter alignment and vinyl groove correction

- Source visual truth:
  `.context/attachments/BwskoL/CleanShot 2026-07-28 at 13.01.29@2x.jpg`
  (`712 × 552` pixels).
- Source state: desktop light theme with a record placed on the platter.
- Implementation route/state: local home page, `#on-rotation`, matching platter
  state after placing a record.
- Implementation screenshot: unavailable because the supported in-app browser
  and local Computer Use browser surfaces did not respond in this workspace.
- Intended comparison viewport: the same `712 × 552` focused console crop at
  `@2x`; density normalization cannot be completed without a post-fix capture.

### Findings and fixes

- P1 fixed in code: the record anchor previously began at `14.5%` with a `51%`
  diameter, while the photographed rubber mat begins farther right and is
  narrower. The anchor is now centered at the mat's measured position with
  `left: 17%`, `top: 17%`, `size: 49%`, and a `0.6` perspective compression.
- P2 fixed in code: the non-WebGL fallback record had an additional `2%` inset,
  making it visibly smaller than the persistent record. The inset is now `0.5%`
  so both rendering paths use the corrected platter footprint.
- P2 fixed in code: the 3D vinyl's concentric grooves were only a low-amplitude
  bump map and disappeared at the platter angle. The existing high-resolution
  vinyl texture now drives roughness and clearcoat roughness, while the
  procedural groove map has a stronger bump scale. The texture remains
  non-color data, so its baked generic label colors do not leak around the live
  album label.

### Required fidelity surfaces

- Fonts and typography: unchanged by this correction.
- Spacing and layout rhythm: platter anchor geometry corrected from the supplied
  focused capture; live confirmation is pending.
- Colors and visual tokens: the existing physical-vinyl color and album accent
  lighting are preserved.
- Image quality and asset fidelity: the existing `1254 × 1254` vinyl raster is
  reused as a material response map with anisotropic filtering; no placeholder
  or code-drawn replacement asset was introduced.
- Copy and content: unchanged.

### Verification

- `pnpm lint`: passed.
- `pnpm build`: passed.
- `git diff --check`: passed.
- Focused post-fix comparison: blocked pending a browser-rendered capture in the
  same state and crop.

final result: blocked
