import type { Field } from "./field";

/** The ASCII backdrops a team card can have (`ascii` on a team in `src/content/personal.ts`). */
export type AsciiScene = "basketball" | "soccer" | "longship";

/**
 * A procedural ASCII animation. Scenes keep their own state and draw in card
 * units: the card's height is 1, its width is `field.width`, and they compose
 * from the right edge, where a card has the least text.
 */
export type Scene = {
  /** Moves the scene on by `dt` seconds. `energy`, 0 to 1, is how lively it is (hover, focus, a tap). */
  step(dt: number, energy: number): void;
  /** Draws the current moment into the field (already cleared). */
  draw(field: Field, energy: number): void;
  /** Sets the scene on its still frame, the one shown with reduced motion. */
  still(): void;
};
