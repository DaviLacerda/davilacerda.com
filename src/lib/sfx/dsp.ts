/**
 * Small building blocks for the synthesized sounds: seeded noise, a generated
 * reverb, soft saturation and envelopes. No samples, no files: everything is
 * computed, so the sounds are ours and render the same every time.
 */

/** A seeded random generator (mulberry32), so every play sounds the same. */
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noiseCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/**
 * A mono noise buffer: white, or pink (Paul Kellet's filter: equal energy per
 * octave, the sound of a crowd or wind rather than hiss). Cached per context.
 */
export function noise(
  ctx: BaseAudioContext,
  seconds: number,
  colour: "white" | "pink",
  seed = 1,
): AudioBuffer {
  const key = `${colour}:${seconds}:${seed}`;
  let cache = noiseCache.get(ctx);
  if (!cache) {
    cache = new Map();
    noiseCache.set(ctx, cache);
  }
  const cached = cache.get(key);
  if (cached) return cached;
  const length = Math.ceil(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const next = random(seed);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = next() * 2 - 1;
    if (colour === "white") {
      data[i] = white * 0.5;
      continue;
    }
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  cache.set(key, buffer);
  return buffer;
}

/** A noise source playing `buffer` from `at` to `until`, starting at a seeded offset. */
export function noiseSource(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  at: number,
  until: number,
  offset = 0,
) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start(at, offset % buffer.duration);
  source.stop(until);
  return source;
}

/**
 * A room: a stereo impulse response of decaying noise, darker as it decays
 * (each channel's noise is low-passed more and more), with a short pre-delay.
 * `seconds` is its length, `decay` how fast it dies (higher is drier).
 */
export function room(
  ctx: BaseAudioContext,
  seconds: number,
  decay: number,
  seed: number,
): ConvolverNode {
  const length = Math.ceil(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const predelay = Math.floor(0.012 * ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const next = random(seed + channel * 101);
    let low = 0;
    for (let i = predelay; i < length; i++) {
      const t = (i - predelay) / (length - predelay);
      const white = next() * 2 - 1;
      // A one-pole low-pass that closes as the tail goes on.
      const k = 0.85 - 0.75 * t;
      low += k * (white - low);
      data[i] = low * Math.pow(1 - t, decay) * Math.exp(-decay * t);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.normalize = true;
  convolver.buffer = buffer;
  return convolver;
}

/** Soft clipping (tanh): warmth and grit for brass and buzzers. */
export function saturate(ctx: BaseAudioContext, drive: number): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const size = 1024;
  const curve = new Float32Array(size);
  const norm = Math.tanh(drive);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / norm;
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

/** A gain node at `value`. */
export function gain(ctx: BaseAudioContext, value = 1): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

/** A biquad filter. */
export function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = 0.707,
  boost = 0,
): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  node.gain.value = boost;
  return node;
}

/** Connects nodes one into the next. */
export function chain(first: AudioNode, ...rest: AudioNode[]) {
  rest.reduce((from, to) => {
    from.connect(to);
    return to;
  }, first);
}

/**
 * Sets a param through `[time, value]` points (linear ramps), from `at`.
 * The first point is set, the others are ramped to.
 */
export function envelope(
  param: AudioParam,
  at: number,
  points: ReadonlyArray<readonly [number, number]>,
) {
  points.forEach(([time, value], index) => {
    if (index === 0) param.setValueAtTime(value, at + time);
    else param.linearRampToValueAtTime(value, at + time);
  });
}

/** A short percussive envelope: up in `attack`, then an exponential fall over `decay`. */
export function hit(
  param: AudioParam,
  at: number,
  peak: number,
  attack: number,
  decay: number,
) {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attack);
  param.setTargetAtTime(0, at + attack, decay / 4);
}
