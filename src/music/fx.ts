// Effects working on whole stereo buffers, in place or into output buffers.
// They keep their state from the start to the end of the buffer, so tails
// cross the loop points naturally.

/** Stereo ping-pong delay with a darker feedback (one-pole lowpass). */
export const pingPongDelay = (
  inL: Float32Array,
  inR: Float32Array,
  outL: Float32Array,
  outR: Float32Array,
  delaySamples: number,
  feedback: number,
  damping = 0.35,
) => {
  const length = inL.length;
  const bufL = new Float32Array(delaySamples);
  const bufR = new Float32Array(delaySamples);
  let lpL = 0;
  let lpR = 0;
  let index = 0;
  for (let i = 0; i < length; i++) {
    const dl = bufL[index];
    const dr = bufR[index];
    lpL += (1 - damping) * (dl - lpL);
    lpR += (1 - damping) * (dr - lpR);
    // Mono input enters on the left, then bounces between sides
    bufL[index] = (inL[i] + inR[i]) * 0.5 + lpR * feedback;
    bufR[index] = lpL * feedback;
    outL[i] += dl;
    outR[i] += dr;
    if (++index === delaySamples) index = 0;
  }
};

class Comb {
  buffer: Float32Array;
  index = 0;
  store = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(x: number, feedback: number, damp: number): number {
    const out = this.buffer[this.index];
    this.store = out * (1 - damp) + this.store * damp;
    this.buffer[this.index] = x + this.store * feedback;
    if (++this.index === this.buffer.length) this.index = 0;
    return out;
  }
}

class Allpass {
  buffer: Float32Array;
  index = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(x: number): number {
    const buffered = this.buffer[this.index];
    this.buffer[this.index] = x + buffered * 0.5;
    if (++this.index === this.buffer.length) this.index = 0;
    return buffered - x;
  }
}

// Freeverb tunings (for 44.1 kHz, scaled to the sample rate)
const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];
const STEREO_SPREAD = 23;

/** Freeverb (Schroeder / Moorer) reverb. Adds the wet signal to the outputs. */
export const reverb = (
  inL: Float32Array,
  inR: Float32Array,
  outL: Float32Array,
  outR: Float32Array,
  sampleRate: number,
  options: { room: number; damp: number; wet: number },
) => {
  const scale = sampleRate / 44100;
  const make = (spread: number) => ({
    combs: COMBS.map((n) => new Comb(Math.round((n + spread) * scale))),
    allpasses: ALLPASSES.map(
      (n) => new Allpass(Math.round((n + spread) * scale)),
    ),
  });
  const left = make(0);
  const right = make(STEREO_SPREAD);
  const feedback = options.room * 0.28 + 0.7;
  const damp = options.damp * 0.4;

  for (let i = 0; i < inL.length; i++) {
    const input = (inL[i] + inR[i]) * 0.015;
    let l = 0;
    let r = 0;
    for (let c = 0; c < COMBS.length; c++) {
      l += left.combs[c].process(input, feedback, damp);
      r += right.combs[c].process(input, feedback, damp);
    }
    for (let a = 0; a < ALLPASSES.length; a++) {
      l = left.allpasses[a].process(l);
      r = right.allpasses[a].process(r);
    }
    outL[i] += l * options.wet;
    outR[i] += r * options.wet;
  }
};
