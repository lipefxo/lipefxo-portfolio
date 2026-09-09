/** Automatic dusk response: off above +2°, fully on below −2°.
 * Driven by solar elevation, so it also fades out through sunrise in every season.
 */
export function lightingLevelForSun(elevation: number): number {
  if (!Number.isFinite(elevation)) return 0;
  const amount = Math.max(0, Math.min(1, (2 - elevation) / 4));
  return amount * amount * (3 - 2 * amount);
}
