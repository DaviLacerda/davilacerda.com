/**
 * The forms Piet, piecet's mascot, takes as he rides down a page, one per
 * section (see `PietGuide`): like on piecet.com, where he turns into a brain
 * in the "second brain" section, his outline morphs from one form to the
 * next as the reader crosses a heading. Every form is drawn in Piet's own
 * box (823 x 595) around his eyes, so the eyes stay put.
 */
export const pietShapes = [
  /** Piet himself: the puzzle piece, arms out. */
  "piece",
  /** A speech bubble: a voice note, something said. */
  "bubble",
  /** An iPhone. */
  "phone",
  /** A circle, like a word circled in a notebook. */
  "circle",
  /** A heart: a like. */
  "heart",
  /** A brain, with folds: the second brain. */
  "brain",
] as const;

export type PietShape = (typeof pietShapes)[number];

export function isPietShape(value: unknown): value is PietShape {
  return (
    typeof value === "string" &&
    (pietShapes as readonly string[]).includes(value)
  );
}

/** Brain outline from piecet.com (resampled), clockwise from the top. */
const BRAIN =
  "411 89 422 73 436 60 451 48 469 41 489 40 508 45 525 54 540 66 552 82 555 99 574 95 593 99 611 107 627 118 641 132 652 148 660 165 664 185 663 204 657 218 674 226 687 241 696 259 701 278 703 297 701 316 696 335 687 353 674 368 657 376 663 390 664 409 660 429 652 446 641 462 627 476 611 487 593 495 574 499 555 495 552 512 540 528 525 540 508 549 489 554 469 553 451 546 436 534 422 521 411 505 400 521 386 534 371 546 353 553 333 554 314 549 297 540 282 528 270 512 267 495 248 499 229 495 211 487 195 476 181 462 170 446 162 429 158 409 159 390 165 376 148 368 135 353 126 335 121 316 119 297 121 278 126 259 135 241 148 226 165 218 159 204 158 185 162 165 170 148 181 132 195 118 211 107 229 99 248 95 267 99 270 82 282 66 297 54 314 45 333 40 353 41 371 48 386 60 400 73";

/** Each form as an SVG path, sampled into points in the browser. */
export const pietShapePaths: Record<PietShape, string> = {
  piece:
    "M 259 0 L 324 0 C 336.15 0 346 9.85 346 22 L 346 47.25 C 322.69 73.85 327.98 110.2 358.3 131.8 C 388.63 153.4 434.37 153.4 464.7 131.8 C 495.02 110.2 500.31 73.85 477 47.25 L 477 22 C 477 9.85 486.85 0 499 0 L 564 0 C 633.04 0 689 55.96 689 125 L 689 470 C 689 539.04 633.04 595 564 595 L 499 595 C 486.85 595 477 585.15 477 573 L 477 547.75 C 500.31 521.15 495.02 484.8 464.7 463.2 C 434.37 441.6 388.63 441.6 358.3 463.2 C 327.98 484.8 322.69 521.15 346 547.75 L 346 573 C 346 585.15 336.15 595 324 595 L 259 595 C 189.96 595 134 539.04 134 470 L 134 125 C 134 55.96 189.96 0 259 0 Z",
  bubble:
    "M 240 100 H 582 A 92 92 0 0 1 674 192 V 388 A 92 92 0 0 1 582 480 H 340 L 228 572 L 250 480 H 240 A 92 92 0 0 1 148 388 V 192 A 92 92 0 0 1 240 100 Z",
  phone:
    "M 330 4 H 492 A 92 92 0 0 1 584 96 V 499 A 92 92 0 0 1 492 591 H 330 A 92 92 0 0 1 238 499 V 96 A 92 92 0 0 1 330 4 Z",
  circle: "M 411 27 A 270 270 0 1 1 410.9 27 Z",
  heart:
    "M 411 168 C 362 52 134 54 134 236 C 134 382 318 468 411 568 C 504 468 688 382 688 236 C 688 54 460 52 411 168 Z",
  brain: `M ${BRAIN} Z`,
};
