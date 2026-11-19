/** Tiny synthesized sounds (no audio files): a chime, a pop, a fanfare. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  start: number,
  length: number,
  volume = 0.08,
  type: OscillatorType = "sine",
) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

export function chime(
  kind: "pop" | "reveal" | "match" | "finale" | "pickup" = "pop",
) {
  switch (kind) {
    case "pop":
      tone(880, 0, 0.12, 0.05, "triangle");
      break;
    case "pickup":
      [659, 880, 1175].forEach((f, i) => tone(f, i * 0.08, 0.35, 0.06));
      break;
    case "reveal":
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, i * 0.09, 0.6, 0.06, "triangle"),
      );
      break;
    case "match":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.11, 0.5, 0.06));
      break;
    case "finale":
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
        tone(f, i * 0.16, 0.9, 0.06, "triangle"),
      );
      break;
  }
}

/** A short burst of filtered noise: foil being torn. */
export function crinkle() {
  if (typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const ac = ctx;
    const len = Math.floor(ac.sampleRate * 0.06);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] =
        (Math.random() * 2 - 1) *
        (1 - i / len) *
        (Math.random() < 0.3 ? 1 : 0.3);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2500 + Math.random() * 3000;
    band.Q.value = 0.8;
    const gain = ac.createGain();
    gain.gain.value = 0.12;
    src.connect(band).connect(gain).connect(ac.destination);
    src.start();
  } catch {
    // no audio
  }
}
