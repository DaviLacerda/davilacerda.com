import type { Field } from "./field";

/**
 * The ASCII backdrops: the team cards' sports (`ascii` on a team in
 * `src/content/personal.ts`) and the Work answers' scenes.
 */
export type AsciiScene =
  | "basketball"
  | "soccer"
  | "longship"
  | "copilot"
  | "invoice"
  | "agents"
  | "send";

/**
 * A procedural ASCII animation. Scenes keep their own state and draw in card
 * units: the card's height is 1, its width is `field.width`. The team scenes
 * compose from the right edge, where a card has the least text; the Work
 * scenes in the space the card's content leaves (`field.free`, `freeRect`).
 */
export type Scene = {
  /** Moves the scene on by `dt` seconds. `energy`, 0 to 1, is how lively it is (hover, focus, a tap). */
  step(dt: number, energy: number): void;
  /** Draws the current moment into the field (already cleared). */
  draw(field: Field, energy: number): void;
  /** Sets the scene on its still frame, the one shown with reduced motion. */
  still(): void;
};
