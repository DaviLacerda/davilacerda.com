/** The sounds a team card can play (`sfx` on a team in `src/content/personal.ts`). */
export type SfxId = "horn" | "crowd" | "court";

/**
 * A synthesized sound: builds its nodes on `ctx`, connects them to `out`,
 * starts at `at` (seconds, the context's clock) and returns when it has
 * fully ended, reverb included (at most two seconds later). Works the same
 * on an `AudioContext` and an `OfflineAudioContext`.
 */
export type Sound = (
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
) => number;

/** The longest a sound may last, tail included. */
export const MAX_SECONDS = 2;
