import {
  chain,
  envelope,
  filter,
  gain,
  hit,
  noise,
  noiseSource,
  room,
  saturate,
} from "./dsp";
import type { Sound } from "./types";

/**
 * A basketball hitting the floor: a thump whose pitch drops fast, the
 * hollow ring of the ball's shell and the slap of leather on wood.
 */
function bounce(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  level: number,
) {
  const thump = ctx.createOscillator();
  thump.frequency.setValueAtTime(150, at);
  thump.frequency.exponentialRampToValueAtTime(58, at + 0.08);
  const thumpLevel = gain(ctx, 0);
  hit(thumpLevel.gain, at, level, 0.003, 0.2);
  chain(thump, thumpLevel, out);
  thump.start(at);
  thump.stop(at + 0.35);

  const shell = ctx.createOscillator();
  shell.type = "triangle";
  shell.frequency.setValueAtTime(430, at);
  shell.frequency.exponentialRampToValueAtTime(385, at + 0.1);
  const shellLevel = gain(ctx, 0);
  hit(shellLevel.gain, at, level * 0.22, 0.002, 0.1);
  chain(shell, shellLevel, out);
  shell.start(at);
  shell.stop(at + 0.2);

  const slap = noiseSource(ctx, noise(ctx, 1, "white", 51), at, at + 0.08, 0.2);
  const slapLevel = gain(ctx, 0);
  hit(slapLevel.gain, at, level * 0.5, 0.001, 0.035);
  chain(slap, filter(ctx, "bandpass", 950, 1.2), slapLevel, out);
}

/** A sneaker's squeak: a bright chirp with a fast flutter, twice. */
function squeak(ctx: BaseAudioContext, out: AudioNode, at: number) {
  const chirps: Array<
    [start: number, from: number, to: number, length: number, level: number]
  > = [
    [0, 1750, 2900, 0.13, 0.14],
    [0.16, 1950, 2700, 0.08, 0.1],
  ];
  for (const [start, from, to, length, level] of chirps) {
    const t = at + start;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length * 0.55);
    osc.frequency.exponentialRampToValueAtTime(to * 0.9, t + length);
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 42;
    const flutterDepth = gain(ctx, 160);
    chain(flutter, flutterDepth);
    flutterDepth.connect(osc.frequency);
    const amp = gain(ctx, 0);
    envelope(amp.gain, t, [
      [0, 0],
      [0.012, level],
      [length * 0.8, level * 0.8],
      [length, 0],
    ]);
    chain(
      osc,
      filter(ctx, "bandpass", 2400, 2),
      filter(ctx, "highpass", 900),
      amp,
      out,
    );
    osc.start(t);
    osc.stop(t + length + 0.02);
    flutter.start(t);
    flutter.stop(t + length + 0.02);
  }
}

/** Nothing but net: a breath of noise sweeping up, in two waves ("sh-wish"). */
function swish(ctx: BaseAudioContext, out: AudioNode, at: number) {
  const source = noiseSource(ctx, noise(ctx, 1, "white", 61), at, at + 0.4);
  const sweep = filter(ctx, "bandpass", 2400, 0.9);
  sweep.frequency.setValueAtTime(2400, at);
  sweep.frequency.exponentialRampToValueAtTime(6800, at + 0.3);
  const amp = gain(ctx, 0);
  envelope(amp.gain, at, [
    [0, 0],
    [0.05, 0.42],
    [0.11, 0.16],
    [0.18, 0.34],
    [0.36, 0],
  ]);
  chain(source, sweep, filter(ctx, "highpass", 1400), amp, out);
}

/** The arena's buzzer: two close tones beating against each other, gritty and short. */
function buzzer(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  length: number,
) {
  const amp = gain(ctx, 0);
  envelope(amp.gain, at, [
    [0, 0],
    [0.008, 0.1],
    [length - 0.03, 0.095],
    [length, 0],
  ]);
  const tone = filter(ctx, "lowpass", 1900, 0.7);
  chain(tone, saturate(ctx, 1.6), amp, out);
  for (const [type, frequency] of [
    ["sawtooth", 196],
    ["square", 207.65],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(tone);
    osc.start(at);
    osc.stop(at + length + 0.01);
  }
}

/**
 * Brooklyn Nets: a possession in under two seconds. Two dribbles, a sneaker
 * squeak, the swish of the net and the buzzer, in a gym's short echo.
 */
export const court: Sound = (ctx, out, at) => {
  const mix = gain(ctx, 1);
  bounce(ctx, mix, at + 0.02, 0.9);
  bounce(ctx, mix, at + 0.34, 0.75);
  squeak(ctx, mix, at + 0.5);
  swish(ctx, mix, at + 0.86);
  buzzer(ctx, mix, at + 1.2, 0.5);

  const dry = gain(ctx, 0.85);
  const wet = gain(ctx, 0.3);
  const gym = room(ctx, 0.3, 2.6, 17);
  mix.connect(dry);
  mix.connect(gym);
  gym.connect(wet);
  dry.connect(out);
  wet.connect(out);
  return at + 2;
};
