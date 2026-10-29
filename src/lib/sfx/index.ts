import { court } from "./court";
import { crowd } from "./crowd";
import { chain, gain } from "./dsp";
import { horn } from "./horn";
import { MAX_SECONDS, type SfxId, type Sound } from "./types";

export type { SfxId, Sound } from "./types";
export { MAX_SECONDS } from "./types";

/** Every sound, by the name a team picks in `src/content/personal.ts`. */
export const sounds: Record<SfxId, Sound> = { horn, crowd, court };

/**
 * The output every sound goes through: a low level (they are a garnish),
 * then a limiter so that nothing clips. Returns its input.
 */
export function output(ctx: BaseAudioContext): AudioNode {
  const level = gain(ctx, 0.3);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  chain(level, limiter, gain(ctx, 0.9), ctx.destination);
  return level;
}

/**
 * Starts sound `id` at `at` into `input` (the output's input), through a
 * gain of its own: the handle to fade it out early. However the sound is
 * built, that gain closes over its last 100ms, two seconds after the start.
 */
export function voice(
  ctx: BaseAudioContext,
  input: AudioNode,
  id: SfxId,
  at: number,
): GainNode {
  const node = gain(ctx, 1);
  node.connect(input);
  sounds[id](ctx, node, at);
  node.gain.setValueAtTime(1, at + MAX_SECONDS - 0.1);
  node.gain.linearRampToValueAtTime(0, at + MAX_SECONDS);
  return node;
}
