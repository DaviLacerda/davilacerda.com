import {
  chain,
  envelope,
  filter,
  gain,
  hit,
  noise,
  noiseSource,
  random,
  room,
} from "./dsp";
import type { Sound } from "./types";

/** Vowel formants (F1, F2, F3 in Hz) of a crowd of men singing. */
const VOWELS = {
  o: [450, 800, 2830],
  i: [300, 2100, 2900],
  a: [700, 1220, 2600],
} as const;

/**
 * The chant: four syllables ("Co-rin-thi-ans"), each with its start and
 * length (s), vowel, pitch (Hz) and whether the surdo hits it.
 */
const SYLLABLES: Array<{
  at: number;
  length: number;
  vowel: keyof typeof VOWELS;
  pitch: number;
  drum: boolean;
}> = [
  { at: 0.3, length: 0.2, vowel: "o", pitch: 196, drum: true },
  { at: 0.54, length: 0.18, vowel: "i", pitch: 233, drum: false },
  { at: 0.76, length: 0.18, vowel: "i", pitch: 233, drum: true },
  { at: 0.98, length: 0.58, vowel: "a", pitch: 262, drum: true },
];

const VOICES = 7;

/**
 * Corinthians: a stadium crowd swelling into a chant.
 *
 * - The roar: pink noise through three bands (a crowd's body, its voices and
 *   their edge), each band's level wandering on its own, swelling in 450ms.
 * - The chant: seven voices, slightly out of tune and out of time with each
 *   other, singing four syllables through vowel formants (o, i, i, a), the
 *   last one held and falling, as a torcida does.
 * - The surdo (the big drum of the torcidas) on three of the syllables, and
 *   hands clapping on every one: dozens of tiny noise bursts, a few ms apart.
 * - All of it in a big, open room.
 */
export const crowd: Sound = (ctx, out, at) => {
  const end = at + 1.9;
  const next = random(23);
  const mix = gain(ctx, 1);

  // The roar.
  const roar = gain(ctx, 0);
  envelope(roar.gain, at, [
    [0, 0],
    [0.45, 1.05],
    [1.35, 1.2],
    [1.9, 0],
  ]);
  const body = noise(ctx, 2, "pink", 31);
  const bands: Array<[frequency: number, q: number, level: number]> = [
    [480, 0.8, 0.62],
    [1150, 1, 0.42],
    [2600, 1.3, 0.2],
  ];
  bands.forEach(([frequency, q, level], index) => {
    const source = noiseSource(ctx, body, at, end, index * 0.37);
    const wander = gain(ctx, level);
    wander.gain.setValueAtTime(level, at);
    for (let t = 0.09; t < 1.9; t += 0.09) {
      wander.gain.linearRampToValueAtTime(level * (0.7 + 0.6 * next()), at + t);
    }
    chain(source, filter(ctx, "bandpass", frequency, q), wander, roar);
  });
  chain(roar, filter(ctx, "lowpass", 4500), mix);

  // The chant: a bank of formant filters shared by the voices.
  const chant = gain(ctx, 2.4);
  const formants = [0, 1, 2].map((index) => {
    const band = filter(
      ctx,
      "bandpass",
      VOWELS.o[index] ?? 500,
      5 - index * 1.2,
    );
    const level = gain(ctx, [1, 0.55, 0.25][index] ?? 0.3);
    chain(band, level, chant);
    return band;
  });
  for (const syllable of SYLLABLES) {
    VOWELS[syllable.vowel].forEach((frequency, index) => {
      formants[index]?.frequency.setTargetAtTime(
        frequency,
        at + syllable.at - 0.02,
        0.025,
      );
    });
  }
  for (let v = 0; v < VOICES; v++) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = (next() - 0.5) * 60;
    const gate = gain(ctx, 0);
    const late = (next() - 0.5) * 0.05;
    for (const [index, syllable] of SYLLABLES.entries()) {
      const start = at + syllable.at + late;
      osc.frequency.setTargetAtTime(syllable.pitch, start - 0.01, 0.02);
      if (index === SYLLABLES.length - 1) {
        osc.frequency.setTargetAtTime(
          syllable.pitch * 0.82,
          start + syllable.length * 0.45,
          0.12,
        );
      }
      gate.gain.setTargetAtTime(0.18, start, 0.018);
      gate.gain.setTargetAtTime(0, start + syllable.length, 0.045);
    }
    chain(osc, gate);
    for (const band of formants) gate.connect(band);
    osc.start(at);
    osc.stop(end);
  }
  chant.connect(mix);

  // The surdo: a deep drum, its pitch dropping as it rings.
  for (const syllable of SYLLABLES) {
    if (!syllable.drum) continue;
    const start = at + syllable.at - 0.01;
    const drum = ctx.createOscillator();
    drum.frequency.setValueAtTime(96, start);
    drum.frequency.exponentialRampToValueAtTime(52, start + 0.16);
    const skin = gain(ctx, 0);
    hit(skin.gain, start, 0.42, 0.004, 0.4);
    chain(drum, skin, mix);
    drum.start(start);
    drum.stop(start + 0.6);
  }

  // Hands: many claps a few ms apart on every syllable.
  const clapNoise = noise(ctx, 1, "white", 41);
  for (const syllable of SYLLABLES) {
    for (let k = 0; k < 16; k++) {
      const start = at + syllable.at + (next() - 0.5) * 0.045;
      const source = noiseSource(ctx, clapNoise, start, start + 0.08, next());
      const level = gain(ctx, 0);
      hit(
        level.gain,
        start,
        0.05 + next() * 0.05,
        0.001,
        0.035 + next() * 0.03,
      );
      chain(
        source,
        filter(ctx, "bandpass", 1000 + next() * 1300, 1.4),
        level,
        mix,
      );
    }
  }

  // A big open room, and a fade so it ends within two seconds.
  const dry = gain(ctx, 0.8);
  const wet = gain(ctx, 0.45);
  const stadium = room(ctx, 0.6, 2.2, 13);
  mix.connect(dry);
  mix.connect(stadium);
  stadium.connect(wet);
  dry.connect(out);
  wet.connect(out);
  return end + 0.1;
};
