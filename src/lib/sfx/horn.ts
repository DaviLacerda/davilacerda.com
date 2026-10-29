import {
  chain,
  envelope,
  filter,
  gain,
  noise,
  noiseSource,
  room,
  saturate,
} from "./dsp";
import type { Sound } from "./types";

/** D2: deep enough to feel, high enough for laptop speakers to carry. */
const ROOT = 73.42;

/**
 * Minnesota Vikings: one long blast of a war horn, Gjallarhorn style.
 *
 * Three detuned sawtooths on a low D, an octave above and a sine an octave
 * below, scooping up into pitch like a player's lips; a slow swell (450ms);
 * a low-pass that opens with the swell, as brass gets brighter when blown
 * harder, a nasal peak around 460Hz and soft saturation for the blare; a
 * vibrato that grows in; breath noise; and a generated hall around it.
 * 1.45s of horn, about half a second of hall.
 */
export const horn: Sound = (ctx, out, at) => {
  const end = at + 1.45;
  const stop = end + 0.05;

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.Q.value = 0.9;
  envelope(tone.frequency, at, [
    [0, 140],
    [0.45, 1150],
    [1.0, 900],
    [1.25, 760],
    [1.45, 180],
  ]);
  const nasal = filter(ctx, "peaking", 460, 1.1, 5);
  const blare = saturate(ctx, 2.2);
  const amp = gain(ctx, 0);
  envelope(amp.gain, at, [
    [0, 0],
    [0.09, 0.22],
    [0.45, 0.82],
    [0.8, 0.74],
    [1.2, 0.7],
    [1.45, 0],
  ]);
  chain(tone, nasal, blare, amp);

  // The vibrato grows in once the note has settled (detune in cents).
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 4.7;
  const depth = gain(ctx, 0);
  envelope(depth.gain, at, [
    [0, 0],
    [0.5, 0],
    [1.05, 13],
  ]);
  vibrato.connect(depth);
  vibrato.start(at);
  vibrato.stop(stop);

  const voices: Array<
    [
      type: OscillatorType,
      ratio: number,
      cents: number,
      level: number,
      filtered: boolean,
    ]
  > = [
    ["sawtooth", 1, -9, 0.3, true],
    ["sawtooth", 1, -2, 0.3, true],
    ["sawtooth", 1, 6, 0.3, true],
    ["sawtooth", 2, 4, 0.1, true],
    ["sine", 0.5, 0, 0.32, false],
  ];
  for (const [type, ratio, cents, level, filtered] of voices) {
    const osc = ctx.createOscillator();
    osc.type = type;
    const pitch = ROOT * ratio;
    // A scoop up from a semitone and a half below, and a sag at the end.
    osc.frequency.setValueAtTime(pitch * 2 ** (-1.6 / 12), at);
    osc.frequency.exponentialRampToValueAtTime(pitch, at + 0.32);
    osc.frequency.setValueAtTime(pitch, at + 1.2);
    osc.frequency.exponentialRampToValueAtTime(pitch * 2 ** (-0.5 / 12), end);
    osc.detune.value = cents;
    depth.connect(osc.detune);
    const share = gain(ctx, level);
    osc.connect(share);
    share.connect(filtered ? tone : amp);
    osc.start(at);
    osc.stop(stop);
  }

  // Breath through the horn.
  const breath = noiseSource(ctx, noise(ctx, 2, "pink", 11), at, stop);
  const breathLevel = gain(ctx, 0);
  envelope(breathLevel.gain, at, [
    [0, 0],
    [0.12, 0.09],
    [0.5, 0.05],
    [1.45, 0],
  ]);
  chain(breath, filter(ctx, "bandpass", 1100, 0.8), breathLevel, amp);

  // Dry, and into a hall.
  const dry = gain(ctx, 0.5);
  const wet = gain(ctx, 0.26);
  const hall = room(ctx, 0.55, 2.4, 7);
  amp.connect(dry);
  amp.connect(hall);
  hall.connect(wet);
  dry.connect(out);
  wet.connect(out);
  return end + 0.55;
};
