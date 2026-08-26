# Higlobe Card Page Design QA

- Source visual truth: `/Users/lipe/.codex/generated_images/01a01a87-6904-7002-9dc5-1e484ebd444e/exec-3fec128e-95a1-42f9-9af2-9a093d3e90c2.png`
- Implementation route: `/higlobe-prototype`, with `Higlobe Card` selected
- Target state: active card, front face, details hidden
- Source dimensions: 1487 × 1058 px
- Intended implementation viewport: 1440 × 1024 CSS px; the generated source does not establish a device-pixel density
- Implementation screenshot: unavailable because the browser runtime reports no available in-app or connected browser backend.

## Full-view and focused comparison evidence

The selected Gallery Stage mock was opened at original resolution. It establishes the compact balance header, a centered pink-to-plum physical card with restrained depth and specular light, two actions, three recent card transactions, and the standard footer. The implementation follows that composition and reuses the dashboard's existing typography, surfaces, controls, transaction rows, motion curve, navigation, and breakpoints.

A browser-rendered implementation capture could not be created, so the required side-by-side full-view comparison and focused comparisons of the card scale, lighting, optical alignment, responsive layout, and interactive states remain blocked.

## Findings

- [Blocked] Browser-rendered visual and interaction evidence is unavailable.
  - Location: `/higlobe-prototype` with Higlobe Card selected, at 1440 × 1024 CSS px and the planned responsive breakpoints.
  - Evidence: browser discovery reports no available in-app or connected browser surface; the local route returns HTTP 200 and the production build succeeds.
  - Impact: exact screenshot fidelity, live pointer tilt, freeze settling, front/back flip, keyboard behavior, console state, and responsive overflow cannot receive the required browser pass.
  - Fix: connect the in-app browser, compare the active/front state beside the source, then exercise frozen, back, revealed, reduced-motion, 920 px, 640 px, and 430 px states.

## Implementation checks

- [x] Sidebar and homepage entry points activate Higlobe Card and use the dashboard's existing navigation reset behavior.
- [x] The existing compact balance/rate card remains above the Higlobe Card content.
- [x] Physical card is isolated behind explicit `status`, `face`, `detailsRevealed`, and `reducedMotion` inputs.
- [x] Card reuses the Higlobe asset and Hugeicons for NFC, freeze, unfreeze, flip, view, and merchant categories; the file-like SIM-card glyph was removed in the refinement pass.
- [x] Motion and CSS 3D provide restrained float, fine-pointer tilt, specular response, front/back faces, and a static reduced-motion path without a new dependency.
- [x] Freeze/unfreeze updates status immediately, pauses motion and highlight behavior, settles and desaturates the card, and persists while the dashboard remains mounted.
- [x] Show/Hide details uses a slower 780 ms flip; the back face pauses float and tilt, ignores hidden-face pointer events, and keeps Reveal/Hide reliably interactive. Card-number groups and individual CVV digits swap with a compact stagger while controlling whether full mock values are present in the DOM.
- [x] Leaving the card page unmounts its local face and reveal state while preserving the parent-owned frozen state.
- [x] Hidden faces are inert and hidden from assistive technology; action pressed states and status announcements are exposed.
- [x] The private transaction model accepts either image or Hugeicons visuals and renders merchant-category icons for card purchases.
- [x] The card ledger contains thirteen realistic mock purchases, remains collapsed to three rows by default, and exposes a centered Show 10 more / Show fewer control without linking to the full Transactions destination.
- [x] No redundant View All or View Transactions action was added.
- [x] Responsive styles cover desktop, 920 px, 640 px, and 430 px layouts with bottom-navigation clearance.
- [x] Targeted ESLint, TypeScript, production build, `git diff --check`, and local HTTP checks pass.
- [x] Full lint was rerun and reports only the pre-existing `BorderGlow.tsx` state-in-effect violation.
- [ ] Browser interaction, console, responsive screenshot, and source-comparison verification.

## Comparison history

No visual iteration could be recorded because an implementation screenshot was unavailable.

final result: blocked

---

# Invite Friend Modal Design QA

- Source visual truth: `.context/attachments/uVU9xk/CleanShot 2026-08-18 at 21.49.17@2x.jpg`
- Implementation route: `/higlobe-prototype`
- Target state: referral modal opened from `Invite a friend, earn $20`
- Target viewport: 1138 × 1144 CSS px (source is 2276 × 2288 px at `@2x`)
- Implementation screenshot: unavailable because no in-app or connected browser backend was available.

## Source comparison evidence

The source was inspected at original resolution. It establishes a centered white modal approximately 970 CSS px wide, a 24 px outer radius, a top-left close control, a centered paper-plane/title/subtitle group, three referral explanation columns, a bordered invitation panel with two actions, and a centered referral-validity footer. The screenshot's external `Frame 81` canvas label is intentionally excluded.

The implementation preserves the supplied inline paper-plane art and shared layout identifiers for the source card shell, plane, title, and subtitle. Following the scale review, the modal was intentionally reduced from the source canvas proportions to align with the dashboard's 808 px content column: the desktop surface is now 840 × 740 px at its maximum, and its typography follows the dashboard's 12–22 px hierarchy.

## Findings

- [Blocked] Browser-rendered visual comparison is unavailable.
  - Location: `/higlobe-prototype` at 1138 × 1144 CSS px, with the invite modal open.
  - Evidence: the browser runtime reports no available in-app or connected browser backend.
  - Impact: exact optical spacing, text wrapping, the shared-element interpolation, and animation reversal cannot receive a screenshot-based pass.
  - Fix: connect a browser, capture the open modal at the target viewport, compare it beside the source, and repeat at 640 px and a narrow mobile width.

## Implementation checks

- [x] 840 px desktop surface, 20 px radius, 740 px viewport-aware maximum presentation height, internal scrolling, and hidden scrollbar.
- [x] Plane, title, steps, action panel, buttons, and footer rescaled to the dashboard's existing visual hierarchy.
- [x] Full-screen mobile surface below 640 px with safe-area padding, stacked steps, and stacked actions.
- [x] Shared shell, plane, title, and subtitle transition using the existing smooth easing over 480 ms.
- [x] Backdrop and revealed content fade after the morph begins.
- [x] Closing presence keeps the source card inert and hover-free until the 480 ms reverse morph completes.
- [x] Close-button and backdrop dismissal share the same reverse-transition path; modal-only content exits before the shared elements.
- [x] Repeated cycles use one functional `closed → open → closing` state machine, preventing stale exit completion from overwriting a later opening.
- [x] The invite card's CSS transition, focus outline, shadow, and plane hover transforms are neutralized while Motion owns the shared transform.
- [x] Close button, Escape, and backdrop dismissal.
- [x] Body scroll locking, focus trap, initial close-button focus, and trigger focus restoration.
- [x] Background dashboard marked inert and hidden from assistive technology while open.
- [x] Reduced-motion path removes spatial layout animation.
- [x] Visual-only Copy Code and WhatsApp confirmation states; no clipboard write or external navigation.
- [x] Hugeicons `Share08Icon`, `HappyIcon`, `Money03Icon`, `Copy02Icon`, and `WhatsappIcon` used as specified.
- [x] Targeted lint, TypeScript, and production build pass.
- [ ] Browser interaction, console, screenshot, and animation-reversal verification.

final result: blocked

---

# Receive Flow Design QA

- Source visual truth: `.context/attachments/ZvVQvO/CleanShot 2026-08-19 at 11.41.39@2x.jpg`
- Implementation route: `/higlobe-prototype`, with `Receive` selected
- Target state: Receive chooser
- Source dimensions: 1784 × 1376 px at `@2x`
- Density-normalized source size: 892 × 688 CSS px at device scale factor 2
- Implementation screenshot: unavailable because the browser runtime reports no in-app or connected browser backend.

## Full-view and focused comparison evidence

The source was opened at original resolution. It establishes an active Receive navigation item and three equal action cards labeled Withdraw, Request a Payment, and Originators. The cards use pink Hugeicons, gray northeast arrows, the existing bordered surface treatment, and a footer aligned with the main content column. The source places the currency exchange on the left and the balance on the right, but the user's latest instruction explicitly supersedes that detail and restores the existing balance-left/exchange-right compact-card order.

A browser-rendered implementation capture could not be created. The required combined full-view comparison and focused comparisons of the compact balance alignment, icon optical sizing, typography, spacing, responsive behavior, colors, and interaction states therefore remain blocked. The normalized CSS size assumes the CleanShot `@2x` filename reflects an unscaled Retina capture; this assumption must be confirmed during the eventual browser capture.

## Findings

- [Blocked] Browser-rendered visual and interaction evidence is unavailable.
  - Location: `/higlobe-prototype` with Receive selected, at the normalized source viewport and responsive breakpoints.
  - Evidence: browser discovery returned no available in-app or connected browser surfaces; the existing local Next.js server returns HTTP 200 for `/higlobe-prototype`.
  - Impact: exact screenshot fidelity, breakpoint behavior, hover/focus/tap states, currency-menu interaction, Send regression behavior, console state, and live motion quality cannot receive the required browser pass.
  - Fix: connect the in-app browser, capture Receive beside the source at the confirmed source viewport, then repeat at desktop, 920 px, 640 px, and 430 px or narrower.

## Implementation checks

- [x] Receive navigation renders the shared compact money-flow shell and keeps Receive active across desktop, compact, and collapsed navigation.
- [x] Receive reuses the same flow chooser component, card structure, staggered entrance, responsive grid, hover/focus treatment, arrow motion, and footer layout as Send.
- [x] Receive actions use existing Hugeicons for Withdraw, Request a Payment, and Originators; no custom or placeholder artwork was added.
- [x] Receive remains a chooser-only scope: Withdraw enters its implemented flow, while Request a Payment and Originators provide polite prototype-status feedback instead of silently doing nothing.
- [x] Send retains its chooser-to-recipient transition, search state, and focus behavior through the same shared chooser component.
- [x] Send, Receive, and Transactions compact balance cards retain the restored balance-first/exchange-second order.
- [x] At 430 px and narrower, the restored order remains balance first and exchange second in the stacked compact card.
- [x] Expanded Home balance layout, currency selection, live-rate animation, reduced motion, modal behavior, and transaction rendering remain on their existing code paths.
- [x] Targeted ESLint passes for `HiglobePrototype.tsx`.
- [x] TypeScript, `git diff --check`, and the production build pass.
- [x] Full lint still reports only the pre-existing `BorderGlow.tsx` `react-hooks/set-state-in-effect` violation.
- [ ] Browser interaction, console inspection, responsive screenshots, and combined source comparison.

## Comparison history

No visual iteration could be recorded because browser discovery returned no connected browser surfaces.

final result: blocked

---

# Deposit Button-to-Card Expansion Design QA

- Source visual truth: `.context/attachments/N9weAc/CleanShot 2026-08-19 at 08.41.56@2x.jpg`
- Implementation route: `/higlobe-prototype`, with the Deposit dropdown opened from the balance card
- Source dimensions: 1190 × 1060 px at `@2x`
- Normalized CSS viewport: 595 × 530 px at device scale factor 2
- Intended implementation surface: a 400 px maximum-width card expanding leftward and downward from the trigger's top-right corner, with 16 px viewport clamping at every breakpoint
- Implementation screenshot: unavailable because browser discovery returned no in-app or connected browser surfaces.

## Full-view and focused comparison evidence

The source was opened at original resolution and normalized to its 595 × 530 CSS-pixel target. Its close control, centered pink–teal–pink coin cluster, title and two-line explanation, rounded PIX-code field, Copy Code action, and final-rate note are retained inside the selected compact dropdown treatment. The generated transparent coin asset was inspected independently at 448 × 224 px and matches the source composition and palette.

A browser-rendered implementation capture could not be created, so the required combined full-view comparison and focused typography, spacing, color, image-quality, and copy comparison remain blocked.

## Findings

- [Blocked] Browser-rendered visual and interaction evidence is unavailable.
  - Location: `/higlobe-prototype` at desktop, 640 px, and 390 px responsive widths.
  - Evidence: the in-app browser runtime reported no available browser surfaces; the existing local Next.js server returned HTTP 200 for `/higlobe-prototype`.
  - Impact: optical spacing, trigger alignment, viewport clamping, internal overflow, dropdown animation, keyboard focus movement, repeated open/close behavior, and browser console state cannot receive a live verification pass.
  - Fix: connect the in-app browser, capture the expansion on desktop, verify that the shell begins at the exact trigger bounds with no gap, then repeat at 640 px and 390 px.

## Implementation checks

- [x] Hero secondary action changed from Details to Deposit using the same `MoneyReceiveCircleIcon` as Receive navigation.
- [x] Deposit and Invite share one `closed → open → closing` dashboard state machine, preventing simultaneous overlay presentation.
- [x] The Deposit button and dropdown share shell, icon/artwork, and label/title layout identities using the Invite modal's 480 ms layout transition and easing.
- [x] Motion crossfading is disabled for the three destination elements so the dropdown is the sole visible shared-layout lead rather than appearing alongside a duplicate source button.
- [x] The source trigger retains its layout box and ref without an explicit opacity handoff; it remains pointer-inert, removed from Tab order, and hidden from assistive technology throughout open and closing phases.
- [x] Description, PIX field, Copy Code action, footer, and close control wait 140 ms before revealing and exit before the shared shell, artwork, and title reverse into the trigger.
- [x] The expanded surface begins at the trigger's top edge with no gap, keeps its right edge aligned when viewport space permits, and grows leftward and downward.
- [x] The same top-right-pinned geometry applies at 640 px and below using `min(400px, 100vw - 32px)`; viewport clamping replaces the former centered-card breakpoint treatment.
- [x] Placement is recalculated on open, resize, and captured scroll events; height is constrained to the space below the pinned top edge with internal scrolling and contained overscroll.
- [x] Deposit is a non-modal anchored `role="dialog"` above 640 px. At the existing full-screen mobile breakpoint it becomes an `aria-modal` dialog, locks body scrolling, and makes the covered dashboard inert and hidden from assistive technology.
- [x] The closed trigger opens Deposit and is fully absorbed while open. Outside pointer-down, Escape, and the close control dismiss it; Escape and explicit close restore trigger focus, while outside dismissal preserves the clicked target's focus.
- [x] Initial focus moves to the close control. Desktop preserves natural popover Tab traversal, while the full-screen mobile presentation traps focus until dismissal.
- [x] Invite remains the only true modal and retains its backdrop, body scroll lock, focus trap, inert background, and trigger-focus restoration.
- [x] The dropdown retains the Invite modal's 20 px radius, 22 px title, 14 px body/code/button, 12 px footer, and current coin scale, with only internal spacing compacted for the smaller surface.
- [x] PIX copy remains preview-only and changes to Copied! for 1.4 seconds without calling the Clipboard API.
- [x] Dedicated transparent 448 × 224 PNG coin asset rendered through Next Image; no CSS-drawn or placeholder artwork.
- [x] Targeted ESLint passes for the changed React components.
- [x] TypeScript, `git diff --check`, and the production build pass.
- [x] Full lint still reports only the pre-existing `BorderGlow.tsx` `react-hooks/set-state-in-effect` violation.
- [ ] Browser interaction, console, responsive screenshot, combined visual comparison, and invite-modal visual regression verification.

## Comparison history

No visual iteration could be recorded because browser discovery returned no connected browser surfaces after the shared-element morph update.

final result: blocked

---

# Send Flow Design QA

- Source visual truth:
  - `.context/attachments/MtrCfe/CleanShot 2026-08-19 at 08.26.58@2x.jpg` (chooser)
  - `.context/attachments/n4AXrX/CleanShot 2026-08-19 at 08.27.03@2x.jpg` (recipients)
- Implementation route: `/higlobe-prototype`, with `Send` selected
- Target states: Send chooser and recipient picker
- Source dimensions: 2546 × 1968 px each at `@2x`
- Target CSS viewport: 1273 × 984 px at device scale factor 2
- Implementation screenshot: unavailable because the browser runtime reports no in-app or connected browser backend.

## Full-view and focused comparison evidence

Both source screenshots were opened at original resolution. They establish the shared sidebar, compact balance/rate card, three equal payment-option cards, recipient search, add-recipient action, and three-row recipient list. A browser-rendered implementation capture could not be created, so neither the required full-view side-by-side comparison nor focused comparisons of typography, spacing, colors, asset rendering, and copy can be completed.

## Findings

- [Blocked] Browser-rendered visual and interaction evidence is unavailable.
  - Location: `/higlobe-prototype` at 1273 × 984 CSS px in both Send states, plus responsive widths.
  - Evidence: browser discovery returned no available in-app or connected browser surfaces.
  - Impact: exact typography, spacing rhythm, color rendering, image sharpness/crop, responsive overflow, focus movement, console state, and visual transition quality cannot receive the required comparison pass.
  - Fix: connect an in-app browser, capture both Send states at the normalized target viewport, compare each capture beside its source, then repeat at 920 px and a narrow mobile width.

## Implementation checks

- [x] Send entry and re-click reset to the chooser and clear the recipient query.
- [x] Home and Send share one persistent balance-card component; Motion reshapes the same mounted shell and the animated balance value is not restarted during navigation.
- [x] The balance shell now uses the shared 300 ms resize curve while its rate and value use the same-duration layout interpolation; topography and non-compact controls fade within that single coordinated morph.
- [x] The compact Send balance is 22 px at every responsive width, keeping it only modestly larger than the 16–24 px currency indicator while preserving the homepage hero's 32 px desktop and 44–58 px mobile scale.
- [x] Send options reuse the homepage feature-card structure and hover/focus/pressed behavior.
- [x] Recipient results reuse the homepage transaction-card and transaction-row structure and table behavior.
- [x] Send typography inherits the homepage scale directly: balance/rate styles from the shared hero, feature-card heading styles for actions, transaction-row text for recipients and search, and 12 px supporting copy.
- [x] Individual, Group, and Bitso controls share the same transition into recipient selection.
- [x] Only the active Send panel is mounted in normal document flow; stage changes use a 280 ms fade/8 px rise while the item wrappers retain the existing staggered entrance language.
- [x] Removing the persistent absolute-positioned page pair eliminates both recipient-over-chooser painting and the large stage-1-sized vertical offset shown in the 09:28 implementation capture.
- [x] Active Send content reuses the homepage `higlobe-enter` animation language with a tighter 12 px travel, subtle scale/blur, and 52 ms item stagger; chooser cards and recipient search/action/table animate through neutral wrappers so existing card transforms remain intact.
- [x] The moving balance and rate groups soften to 42% opacity with a 4 px mid-morph blur before resolving, reducing the perceived speed of their long layout interpolation without interrupting the persistent balance counter.
- [x] Inactive Send panels are inert and hidden from assistive technology; search focus moves only after the recipient panel becomes active.
- [x] Search filters Avengers LLC, Bank of Westeros, and Wayne Enterprises case-insensitively and provides an empty state.
- [x] Add-recipient and recipient selections produce lightweight in-app feedback without adding another route or flow step.
- [x] Recipient search receives focus when its animated state mounts.
- [x] Desktop three-column chooser and stacked mobile chooser styles are present.
- [x] Existing Higlobe, Bitso, flag, and recipient assets are reused; Hugeicons supply interface icons.
- [x] Send chooser artwork uses `User03Icon`, `UserGroup03Icon`, and the Bitso asset in common 56 px layout slots; the people glyphs render at a deliberately lighter 38 px while Bitso retains its existing 56 px asset size, with per-asset optical offsets preserving the shared title axis (scaled proportionally at the narrow breakpoint).
- [x] Reduced-motion behavior removes spatial transition timing.
- [x] Targeted ESLint passes for the changed React components.
- [x] TypeScript and the production build pass.
- [x] `/higlobe-prototype` returns HTTP 200 after the motion refinement, and `git diff --check` passes.
- [x] Full lint was rerun and still reports only the pre-existing `BorderGlow.tsx` state-in-effect violation.
- [ ] Browser interaction, console, responsive screenshot, and source-comparison verification.

## Comparison history

No visual iteration could be recorded because an implementation screenshot was unavailable.

final result: blocked

---

# Nxt Level Responsive Landing Page Design QA

- Source visual truth: `.context/nxt-level-qa/paper-source-1512x4926.png`
- Implementation route: `/nxt-level-prototype`
- Target state: default landing page with calculator defaults and unsubmitted contact form
- Source dimensions: 1512 × 4926 px at the Paper export's 1× density
- Comparison viewport: 1512 × 982 CSS px at device scale factor 1
- Implementation screenshot: `.context/nxt-level-qa/implementation-desktop-1512.png`
- Implementation dimensions: 1512 × 4990 px at 1× density
- Responsive evidence:
  - `.context/nxt-level-qa/implementation-desktop-1024.png` — 1024 × 4923 px
  - `.context/nxt-level-qa/implementation-tablet-768.png` — 768 × 6581 px
  - `.context/nxt-level-qa/implementation-mobile-390.png` — 390 × 7772 px

## Full-view and focused comparison evidence

The Paper source and the final 1512 px browser capture were opened together in the same comparison input at matched 1× density. The implementation preserves the source's centered hero, seven-logo proof cluster, expertise statement, three practice cards, five-stage search process, split calculator, three placement cards, four metrics, and split dark contact footer. The full-page height differs by 64 px (about 1.3%) because the functional calculator result adds explanatory labels and the local-only form adds a no-data notice; these are approved product-behavior additions and do not change the section order or proportions materially.

Focused browser captures were also opened at original resolution:

- `.context/nxt-level-qa/implementation-focus-hero.png` confirms the orb overlap, headline wrapping, audience line, and two CTAs.
- `.context/nxt-level-qa/implementation-focus-calculator.png` confirms field density, split-panel balance, burgundy estimate hierarchy, and the exact `$330k` / `$190k` / `$140k` defaults.
- `.context/nxt-level-qa/implementation-focus-contact.png` confirms footer contrast, two-column pitch/form layout, readable controls, and aligned bottom metadata.
- The logo cluster was inspected in the full desktop capture because it is rendered large enough there to judge sharpness and spacing; all seven marks are direct Paper exports.

## Findings

- No actionable P0, P1, or P2 findings remain after the second visual pass.
- The implementation intentionally provides more detail inside the calculator result than the structural Paper frame. This is consistent with the approved functional scope and remains visually subordinate to the annual total.
- No P3 follow-up is required for the structure-first milestone; deeper brand and art-direction refinements remain deliberately deferred rather than treated as fidelity defects.

## Required fidelity surfaces

- Fonts and typography: Plus Jakarta Sans renders with the intended weights, compact letter spacing, balanced hero wrapping, and readable small UI labels across all four widths.
- Spacing and layout rhythm: the 1256 px desktop content width, generous section cadence, desktop card tracks, tablet wrapping, and mobile stacking visually match the Paper structure without clipped content or horizontal overflow.
- Colors and tokens: white and neutral surfaces, charcoal footer, and muted burgundy accents render consistently; contrast and focus treatment remain clear in the inspected states.
- Image quality and assets: all seven client logos plus the hero and avatar orbs are local Paper exports. The final capture shows sharp scaling, correct transparency, and no placeholder or code-drawn substitute assets.
- Copy and content: all approved sections, claims, metrics, labels, and grammar corrections are present. Functional calculator and form guidance is concise and does not displace source content.

## Implementation checks

- [x] New route is isolated from the portfolio homepage and Higlobe prototype.
- [x] Static content remains server-rendered; only the calculator and contact form are client components.
- [x] Top Hire, Find, and Contact pills are non-interactive text.
- [x] Hero actions target the calculator and contact sections.
- [x] Calculator defaults server-render as `$330k` total, `$190k` cash, and `$140k` annualized equity.
- [x] Calculator guards empty, negative, and invalid numeric values.
- [x] Contact form includes required-field and email validation, local success messaging, focus movement to the first invalid field, and no network submission.
- [x] Responsive CSS covers desktop, tablet, and mobile section layouts with a two-column mobile metrics grid.
- [x] Focus-visible and reduced-motion styles are present.
- [x] Exact Paper client logos and reference orb assets are stored locally; Hugeicons supplies interface icons.
- [x] Playwright captured the live production route at 1512 px, 1024 px, 768 px, and 390 px; all widths report no horizontal overflow.
- [x] Default calculator values, live recalculation to `$355k`, and invalid numeric handling pass.
- [x] Empty contact submission exposes five errors and focuses the name field; invalid email focuses the email field; a valid local submission shows confirmation; editing clears the success state.
- [x] The first keyboard Tab target is `See the Numbers` with a visible 3 px outline; static header pills remain outside the tab order.
- [x] Both hero anchor CTAs reach their intended sections, and reduced-motion emulation resolves root scroll behavior to `auto`.
- [x] Browser console errors and uncaught page errors are both zero in the final production capture run.
- [x] The Paper source and final desktop screenshot were reviewed together, with focused hero, calculator, and contact evidence plus separate responsive review.
- [x] ESLint, TypeScript through the production build, route HTTP response, and `git diff --check` pass.

## Comparison history

1. First combined comparison at 1512 px found a P2 dark strip in the reserved scrollbar gutter. The route's white page was inheriting the portfolio root's dark HTML color scheme and body background outside the main content box.
2. The route stylesheet now scopes a white HTML/body background and light color scheme through `:has(.page)`, preserving all other routes. The unsupported `quality={100}` logo override was also removed to eliminate Next Image runtime warnings.
3. The page was rebuilt, recaptured at all four widths, and the revised 1512 px screenshot was compared with the Paper source in one input. The dark gutter is gone, the source structure remains intact, responsive screenshots remain overflow-free, and no P0/P1/P2 difference remains.

final result: passed

---

# Nxt Level Sculptural Bronze Hero Coin Design QA

- Art-direction truth: `/Users/lipe/.codex/generated_images/01a03b5e-a163-71e1-9879-cebedbf4cccd/exec-f4eb6a91-ff12-46dc-9b32-8e5e4053fe6b.png`
- Layout and typography truth: `.context/nxt-level-qa/paper-source-1512x4926.png`
- Implementation route: `/nxt-level-prototype`
- Target state: selected Option 3 coin retained through entrance, ambient float, pointer tilt, reduced motion, and WebGL-disabled fallback
- Matched coin comparison: `.context/nxt-level-qa/option-3-implementation-comparison.png`
- Focused implementation: `.context/nxt-level-qa/implementation-focus-hero.png`
- Interaction evidence:
  - `.context/nxt-level-qa/implementation-coin-neutral.png`
  - `.context/nxt-level-qa/implementation-coin-tilt-left.png`
  - `.context/nxt-level-qa/implementation-coin-tilt-right.png`
  - `.context/nxt-level-qa/implementation-coin-settled.png`
  - `.context/nxt-level-qa/implementation-coin-fallback.png`

## Full-view and focused comparison evidence

The selected Option 3 target and the rendered neutral coin were normalized to matched 280 × 280 px crops and opened together in one comparison input. The implementation retains the target's dark oxblood-bronze body, copper-worn horse relief, left-edge depth, rounded perimeter grooves, and compact floating shadow. The production hero capture confirms that the surrounding headline, audience line, CTAs, overlap, and 280 px desktop footprint remain unchanged.

The raster coin is now the persistent visual instead of a temporary loading layer. This removes the visible asset swap identified during review while preserving the chosen coin's exact texture and sculptural detail throughout the component's motion. The normal-motion captures show restrained left and right pointer response plus a smooth neutral return without a full spin or drag gesture.

## Findings

- No actionable P0, P1, or P2 findings remain after removing the alternate rendered face.
- The implementation coin is slightly cleaner and darker than the broad Option 3 composition crop, but this is the exact first-render asset explicitly selected during live review and is therefore the approved visual truth for the shipped component.
- No P3 follow-up is required for the approved motion direction.

## Motion, fallback, and responsive checks

- [x] The correct dark bronze coin is visible from first paint and remains visible after client readiness; no replacement artwork or flash occurs.
- [x] The stage retains a 280 × 280 px desktop footprint and a 216 × 216 px mobile footprint.
- [x] The 850 ms entrance preserves the existing hero reveal sequence; ambient motion uses a 6.8 s float with approximately ±6 px travel and ±1.5° roll.
- [x] Fine-pointer input produces restrained 10°/14° tilt, slight translation, a moving highlight, and a damped return after pointer exit.
- [x] Coarse-pointer behavior remains scroll-safe through `touch-action: pan-y`; no dragging, full spin, or scroll choreography was added.
- [x] Intersection and visibility observers pause animation offscreen or in hidden tabs, and all observers, listeners, and animation frames are released on unmount.
- [x] Reduced-motion output is static, removes the entrance animation and highlight, and reports no frame difference after 450 ms.
- [x] A WebGL-disabled browser run resolves to the fallback state with the approved coin image fully visible.
- [x] Responsive production captures at 1512, 1024, 768, and 390 px show no horizontal overflow or hero layout regression.
- [x] Neutral, left-tilt, right-tilt, and settled screenshots differ as expected; the approved relief, worn highlights, depth, and shadow remain readable in each state.
- [x] CTA anchors, calculator and form behavior, keyboard order, focus treatment, and static navigation pills remain unchanged.
- [x] Browser console errors and uncaught page errors are zero across the production QA run.
- [x] Targeted ESLint, TypeScript, production build, and `git diff --check` pass.

## Comparison history

1. The first interactive pass replaced the correct loading artwork with a procedurally shaded coin whose horse relief and copper tone did not match Option 3. This was a P1 art-direction mismatch.
2. The selected first-render coin was promoted to the persistent visual, and the entrance, ambient float, pointer tilt, moving highlight, visibility pausing, reduced-motion treatment, and fallback state were applied directly to it.
3. The production build was recaptured across all four target widths. The matched Option 3/implementation comparison and focused motion states show no remaining P0/P1/P2 difference, and the full interaction suite passes without console or page errors.

final result: passed

---

# Nxt Level Reveal Motion Design QA

- Source visual truth: `.context/nxt-level-qa/paper-source-1512x4926.png`
- Implementation route: `/nxt-level-prototype`
- Target state: settled default landing page plus normal-motion hero entry, calculator re-entry, calculator value update, and reduced-motion states
- Source dimensions: 1512 × 4926 px at 1× density
- Settled implementation screenshot: `.context/nxt-level-qa/implementation-desktop-1512.png`
- Settled implementation dimensions: 1512 × 4990 px at 1× density
- Comparison viewport: 1512 × 982 CSS px at device scale factor 1
- Responsive settled evidence:
  - `.context/nxt-level-qa/implementation-desktop-1024.png` — 1024 × 4923 px
  - `.context/nxt-level-qa/implementation-tablet-768.png` — 768 × 6581 px
  - `.context/nxt-level-qa/implementation-mobile-390.png` — 390 × 7772 px

## Full-view and focused comparison evidence

The original Paper export and the final settled 1512 px implementation capture were opened together in the same comparison input at matched 1× density. The animation hooks do not change the page's geometry, section order, typography, card dimensions, logo treatment, calculator layout, metrics, or footer. The settled capture remains visually equivalent to the previously passed structure-first implementation.

Motion was reviewed through focused browser frames:

- `.context/nxt-level-qa/motion-hero-start.png`, `.context/nxt-level-qa/motion-hero-mid.png`, and `.context/nxt-level-qa/motion-hero-settled.png` are 1512 × 982 px captures showing the load sequence from hidden state through staggered hero content to the fully resolved logo cluster.
- `.context/nxt-level-qa/motion-calculator-reentry-mid.png` and `.context/nxt-level-qa/motion-calculator-reentry-settled.png` are matched 1245 × 743 px element captures. The mid-state shows the intended soft lift/deblur at 33% opacity; the settled state returns to sharp 1.0 opacity without moving the calculator's layout position.
- The final responsive captures were inspected separately at 1024 px, 768 px, and 390 px. Every layout remains settled, complete, and free of horizontal overflow under reduced-motion emulation.

## Findings

- No actionable P0, P1, or P2 findings remain after the reduced-motion specificity fix.
- The brief blur visible during the calculator's mid-reveal is intentional, resolves within the 640 ms entrance, and does not affect the settled text or interaction state.
- No P3 polish issue remains for the approved restrained motion direction.

## Required fidelity surfaces

- Fonts and typography: reveal transforms do not change line breaks, weights, antialiasing, or hierarchy; all text returns to the same settled rendering as the passing static comparison.
- Spacing and layout rhythm: reveal motion uses compositor-only opacity, transform, and filter changes. The calculator output keeps the same `offsetTop` of 2956 before, during, and after replay, confirming no layout shift.
- Colors and tokens: the route retains its white, neutral, charcoal, and burgundy palette. Motion only changes temporary opacity and blur, with no new color or surface drift.
- Image quality and assets: direct Paper logo and orb exports remain unchanged. Logo staging resolves to the same sharp scale and transparency as the source-aligned settled view.
- Copy and content: no copy changed. Calculator digit spans preserve `$355k` visually while the parent exposes `Estimated annual total: $355,000` to assistive technology.

## Motion and interaction checks

- [x] One route-scoped observer controls all reveal elements without converting the server-rendered landing content into a client component.
- [x] Hero delays resolve to 0, 70, 130, 190, and 250 ms; practice cards resolve to 0, 70, and 140 ms.
- [x] The calculator output enters at full opacity, resets to `data-nxt-visible="false"` after leaving the viewport, and replays when it re-enters.
- [x] Calculator re-entry was sampled at 0.333 opacity mid-transition and 1.0 opacity after settling, with a stable layout position.
- [x] Recalculating the offer to `$355k` starts five character animations and retains the exact accessible full-currency label.
- [x] Reduced-motion emulation at 1512 px, 1024 px, 768 px, and 390 px produces opacity 1, transform `none`, filter `none`, transition duration `0s`, zero digit animations, and non-animated anchor scrolling.
- [x] Both anchor CTAs, calculator validation, contact validation and success, keyboard order, and the 3 px focus outline remain unchanged.
- [x] Browser console errors and uncaught page errors are zero across all final runs.
- [x] ESLint, the production build, and `git diff --check` pass.

## Comparison history

1. The first motion browser pass found a P2 accessibility mismatch: the higher-specificity visible reveal state overrode the reduced-motion declaration, leaving a 640 ms desktop transition, 560 ms mobile transition, and a settled transform matrix active.
2. The reduced-motion rule was strengthened at the route boundary so opacity, transform, filter, and transition always settle immediately. Digit animation was already disabled by the shared transition guard.
3. The production build was recaptured and retested. All four widths now report zero reveal duration and no transform, blur, or digit animation; the combined Paper/implementation comparison and focused motion frames show no remaining P0/P1/P2 issue.

final result: passed

---

# Nxt Level Brand Showcase Refinement Design QA

- Source visual truth: `.context/nxt-level-audit/13-desktop-full-accepted.png`, `.context/nxt-level-audit/14-mobile-full-accepted.png`, the approved Nxt Level brand-showcase refinement plan, and its Mobbin benchmark direction
- Implementation route: `/nxt-level-prototype`
- Target state: settled default landing page with calculator defaults, unsubmitted contact form, and the coin docked in normal motion
- Comparison viewport: 1512 × 982 CSS px at device scale factor 1
- Source dimensions: 1512 × 4750 px at 1× density
- Implementation screenshot: `.context/nxt-level-refinement-qa/final-full-1512.png`
- Implementation dimensions: 1512 × 4787 px at 1× density
- Responsive evidence: `.context/nxt-level-refinement-qa/final-full-320.png`, `final-full-390.png`, `final-full-768.png`, `final-full-1024.png`, and `final-full-1512.png`

## Full-view and focused comparison evidence

The accepted pre-refinement desktop capture and final browser render were placed together in `.context/nxt-level-refinement-qa/comparison-full-desktop.png`. The implementation preserves the original section order, chess imagery, copy, calculator behavior, placement content, and contact flow while making the approved hierarchy, rhythm, surface, and affordance changes. The page remains within 37 px of the source desktop height while the mobile composition is 322 px shorter through tighter cadence and more compact process cards.

Focused combined comparisons were opened and inspected for:

- Hero scale, decorative service descriptors, client-logo treatment, and CTA hierarchy: `.context/nxt-level-refinement-qa/comparison-hero.png`
- Calculator typography, controls, slider target area, result contrast, and unchanged values: `.context/nxt-level-refinement-qa/comparison-calculator.png`
- Contact hierarchy, visible labels, fields, and footer balance: `.context/nxt-level-refinement-qa/comparison-contact.png`
- Full 390 px responsive flow: `.context/nxt-level-refinement-qa/comparison-mobile.png`
- Final docked states: `.context/nxt-level-refinement-qa/final-docked-1512.png` and `final-docked-390.png`

## Findings

- No actionable P0, P1, or P2 findings remain after the three visual passes.
- The new desktop display scale is intentionally larger than the baseline and follows the approved brand-showcase direction; mobile headline sizing remains in the original 28–32 px range.
- The monochrome client-logo cloud intentionally preserves differences in each supplied raster mark's gray value rather than forcing dark filters that expose embedded white backgrounds.
- No P3 follow-up is required for the selected polish scope.

## Required fidelity surfaces

- Fonts and typography: Plus Jakarta Sans, weights, letter spacing, and copy are unchanged. The hero now reaches 48 px and section titles reach 32 px on wide desktop, with balanced wrapping and 26 px section titles on mobile.
- Spacing and layout rhythm: desktop, tablet, and mobile section cadence is tighter without changing content order. The 640–900 px practice layout resolves to two columns with the third card spanning the row, and all five tested widths remain free of horizontal overflow.
- Colors and tokens: the white, charcoal, burgundy, and copper palette remains intact. Borders and separators are clearer, shadows quieter, result artwork more visible, and the floating navigation uses an opaque blurred surface without background ghosting.
- Image quality and assets: all original chess, placement, process, calculator, and client-logo assets remain in use with unchanged crops. Logo reveal motion is isolated on wrappers so the monochrome image treatment and transparency both remain stable.
- Copy and content: no application copy, section order, calculator input, calculation, field, validation message, or success message changed.
- Icons and affordances: arrows remain on real CTAs and were removed from noninteractive practice cards. Existing Hugeicons remain aligned and no replacement or generated assets were introduced.

## Interaction and accessibility checks

- [x] 320, 390, 768, 1024, and 1512 px screenshots report no overflow, clipping, console error, or uncaught page error.
- [x] Hero CTAs remain 44 px high; the docked CTA is 44 px on desktop and mobile; sliders expose a 28 px interaction box.
- [x] The first keyboard target remains `See the Numbers` with a visible 3 px outline.
- [x] The custom role select works by keyboard and selects `Product Lead` through Arrow and Enter input.
- [x] Calculator defaults remain `$330k`, `$190k`, and `$140k`; the adjusted test remains `$565k`, `$265k`, and `$300k`.
- [x] Empty contact submission exposes five invalid fields and focuses `contact-name`; invalid email focuses `contact-email`; a valid submission keeps the approved success message.
- [x] Both hero anchors retain `#offer-calculator` and `#contact` behavior.
- [x] The coin docks successfully in normal motion, service descriptors are hidden in the mobile dock, and reduced-motion captures settle without reveal animation.
- [x] Full ESLint, TypeScript, production build, and `git diff --check` pass.

## Comparison history

1. Pass 1 found two P2 polish issues: reveal blur overrode the intended logo filter, and the enlarged practice heading wrapped on wide desktop while page content remained faintly visible through the docked navigation.
2. Reveal ownership moved to logo wrappers, heading widths expanded, and the navigation surface gained a stronger white backdrop and blur. Pass 2 confirmed the heading and dock fixes but exposed gray blocks around raster logos because brightness filtering darkened embedded white pixels.
3. The brightness transform was removed in favor of grayscale plus light contrast. Pass 3 shows clean transparent logo presentation, and the final combined desktop, focused, mobile, and docked comparisons show no remaining P0/P1/P2 issue.

final result: passed
