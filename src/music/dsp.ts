// Basic synthesis blocks, working on plain numbers (one sample at a time)

// PolyBLEP correction: removes most of the aliasing of saw and square waves
const polyBlep = (phase: number, dt: number): number => {
  if (phase < dt) {
    const t = phase / dt;
    return t + t - t * t - 1;
  }
  if (phase > 1 - dt) {
    const t = (phase - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};

/** Oscillator with its own phase. `next(freq)` returns the next sample. */
export class Oscillator {
  phase: number;
  sampleRate: number;

  constructor(sampleRate: number, phase = 0) {
    this.sampleRate = sampleRate;
    this.phase = phase;
  }

  private advance(freq: number): number {
    const dt = freq / this.sampleRate;
    this.phase += dt;
    if (this.phase >= 1) this.phase -= 1;
    return dt;
  }

  saw(freq: number): number {
    const p = this.phase;
    const dt = this.advance(freq);
    return 2 * p - 1 - polyBlep(p, dt);
  }

  square(freq: number, width = 0.5): number {
    const p = this.phase;
    const dt = this.advance(freq);
    let v = p < width ? 1 : -1;
    v += polyBlep(p, dt);
    v -= polyBlep((p + 1 - width) % 1, dt);
    return v;
  }

  sine(freq: number): number {
    const p = this.phase;
    this.advance(freq);
    return Math.sin(2 * Math.PI * p);
  }
}

/**
 * State variable filter (TPT form): stable even with a moving cutoff.
 * Call `set()` when the cutoff changes (at control rate, e.g. every 32
 * samples, because it is the costly part), then `process()` per sample.
 */
export class Filter {
  ic1 = 0;
  ic2 = 0;
  k = 1.414;
  a1 = 0;
  a2 = 0;
  a3 = 0;
  low = 0;
  band = 0;
  high = 0;
  sampleRate: number;

  constructor(sampleRate: number, cutoff = 1000, q = 0.707) {
    this.sampleRate = sampleRate;
    this.set(cutoff, q);
  }

  set(cutoff: number, q = 0.707) {
    const fc = Math.min(Math.max(cutoff, 20), this.sampleRate * 0.45);
    const g = Math.tan((Math.PI * fc) / this.sampleRate);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  // Updates the low, band and high outputs, returns the lowpass output
  process(x: number): number {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - this.k * v1 - v2;
    return v2;
  }
}

// Number of samples between two filter cutoff updates
export const CONTROL_RATE = 32;

export type Adsr = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

const adsrHeld = (t: number, env: Adsr): number => {
  if (t < env.attack) return t / env.attack;
  if (t < env.attack + env.decay) {
    return 1 - ((1 - env.sustain) * (t - env.attack)) / env.decay;
  }
  return env.sustain;
};

/** Envelope level at time t (s) for a note held during `gate` seconds. */
export const adsr = (t: number, gate: number, env: Adsr): number => {
  if (t < gate) return adsrHeld(t, env);
  const level = adsrHeld(gate, env);
  return Math.max(0, level * (1 - (t - gate) / env.release));
};

// Detune in cents to a frequency ratio
export const cents = (value: number): number => Math.pow(2, value / 1200);
