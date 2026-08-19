# Invite Friend Modal Design QA

- Source visual truth: `.context/attachments/uVU9xk/CleanShot 2026-08-18 at 21.49.17@2x.jpg`
- Implementation route: `/paper-dashboard`
- Target state: referral modal opened from `Invite a friend, earn $20`
- Target viewport: 1138 × 1144 CSS px (source is 2276 × 2288 px at `@2x`)
- Implementation screenshot: unavailable because no in-app or connected browser backend was available.

## Source comparison evidence

The source was inspected at original resolution. It establishes a centered white modal approximately 970 CSS px wide, a 24 px outer radius, a top-left close control, a centered paper-plane/title/subtitle group, three referral explanation columns, a bordered invitation panel with two actions, and a centered referral-validity footer. The screenshot's external `Frame 81` canvas label is intentionally excluded.

The implementation preserves the supplied inline paper-plane art and shared layout identifiers for the source card shell, plane, title, and subtitle. Following the scale review, the modal was intentionally reduced from the source canvas proportions to align with the dashboard's 808 px content column: the desktop surface is now 840 × 740 px at its maximum, and its typography follows the dashboard's 12–22 px hierarchy.

## Findings

- [Blocked] Browser-rendered visual comparison is unavailable.
  - Location: `/paper-dashboard` at 1138 × 1144 CSS px, with the invite modal open.
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
- [x] Close button, Escape, and backdrop dismissal.
- [x] Body scroll locking, focus trap, initial close-button focus, and trigger focus restoration.
- [x] Background dashboard marked inert and hidden from assistive technology while open.
- [x] Reduced-motion path removes spatial layout animation.
- [x] Visual-only Copy Code and WhatsApp confirmation states; no clipboard write or external navigation.
- [x] Hugeicons `Share08Icon`, `HappyIcon`, `Money03Icon`, `Copy02Icon`, and `WhatsappIcon` used as specified.
- [x] Targeted lint, TypeScript, and production build pass.
- [ ] Browser interaction, console, screenshot, and animation-reversal verification.

final result: blocked
