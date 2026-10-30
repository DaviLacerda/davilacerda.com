/**
 * Davi's mark: a calligraphic italic "d" (an elliptical bowl tilted about
 * 30°, its right side rising into the stem, the stem ending in a flag that
 * points back left). Traced from his logo file and redrawn with 15 curves.
 *
 * The one source of the geometry: `<BrandMark>`, the OG cards and
 * `scripts/brand.mjs` (the favicons, app icons and `public/brand/logo.svg`)
 * all read it, so edit it here and run `yarn brand`. Plain TypeScript with no
 * imports, because that script loads it with Node's type stripping.
 */
export const BRAND_MARK = {
  /** viewBox units; the glyph sits inside with 9 units of air on every side. */
  width: 961,
  height: 839,
  viewBox: "0 0 961 839",
  /** The filled glyph: the outline, then the bowl's counter (fill-rule evenodd). */
  glyph:
    "M880 10C870 11 611 99 605 102C586 115 599 149 627 161C643 168 644 168 705 153C851 119 825 109 732 308C727 319 727 319 707 315C544 284 333 331 197 424C54 521 -22 663 21 752C95 902 448 825 660 612C763 510 814 376 878 246C951 96 952 94 952 74C952 34 918 4 880 10ZM678 377C701 381 703 383 696 403C650 541 425 697 243 716C160 725 136 703 161 641C229 477 513 351 678 377Z",
  /**
   * The pen: the glyph's centre line in writing order (from the top of the
   * bowl beside the stem, round the bowl anticlockwise, up the stem, then
   * along the flag). Stroked `penWidth` wide with round caps it covers every
   * pixel of the glyph (the farthest is 76 units away), so as a mask it draws
   * the "d" on. It starts clear of the stem, which only appears when the pen
   * comes back up the bowl's right side, and stops where its round end just
   * covers the flag's tip, so the last frame is the last of the ink.
   */
  pen: "M665 343C399 298 -11 581 96 731C161 821 366 745 445 705C656 599 698 507 789 308C807 270 873 143 882 103C888 75 881 63 860 67C805 77 715 106 660 119",
  penWidth: 160,
  /** Length of `pen` in viewBox units, rounded up (the dash that draws it). */
  penLength: 2186,
} as const;

/** Width of the mark at a given height (for fixed-size renderers). */
export function brandMarkWidth(height: number) {
  return Math.round((height * BRAND_MARK.width) / BRAND_MARK.height);
}
