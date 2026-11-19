import {
  adsr,
  cents,
  CONTROL_RATE,
  Filter,
  Oscillator,
  type Adsr,
} from "./dsp.ts";
import type { MusicEvent, Score } from "./score.ts";
import { midiToHz } from "./theory.ts";

// Stereo buffer pair
export type Bus = { left: Float32Array; right: Float32Array };

export const createBus = (length: number): Bus => ({
  left: new Float32Array(length),
  right: new Float32Array(length),
});

export type PlayContext = {
  sampleRate: number;
  noise: Float32Array;
  sound: Score["sound"];
};

// Output of one sample, reused to avoid allocations in the hot loops
type Out = { l: number; r: number };
const out: Out = { l: 0, r: 0 };

// Writes `length` samples computed by `sample(i, t, out)` into the bus, from
// `start`. The bus holds exactly one loop: samples past its end wrap around
// to its start, so release tails continue into the next repetition.
const write = (
  bus: Bus,
  start: number,
  length: number,
  sampleRate: number,
  sample: (i: number, t: number, out: Out) => void,
) => {
  const size = bus.left.length;
  let n = start % size;
  for (let i = 0; i < length; i++) {
    sample(i, i / sampleRate, out);
    bus.left[n] += out.l;
    bus.right[n] += out.r;
    n++;
    if (n === size) n = 0;
  }
};

const mono = (o: Out, v: number) => {
  o.l = v;
  o.r = v;
};

const BASS_ENV: Adsr = {
  attack: 0.003,
  decay: 0.12,
  sustain: 0.65,
  release: 0.03,
};
const PAD_ENV: Adsr = { attack: 0.6, decay: 1, sustain: 0.85, release: 1.2 };
const ARP_ENV: Adsr = {
  attack: 0.002,
  decay: 0.15,
  sustain: 0.25,
  release: 0.08,
};
const LEAD_ENV: Adsr = {
  attack: 0.015,
  decay: 0.3,
  sustain: 0.7,
  release: 0.25,
};

const kick = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const osc = new Oscillator(ctx.sampleRate);
  write(
    bus,
    start,
    Math.round(0.45 * ctx.sampleRate),
    ctx.sampleRate,
    (i, t, o) => {
      const freq = 45 + 110 * Math.exp(-t * 35);
      const body = osc.sine(freq) * Math.exp(-t * 7);
      const click = ctx.noise[i % ctx.noise.length] * Math.exp(-t * 400) * 0.3;
      const v = (body + click) * e.velocity * 0.95;
      mono(o, v);
    },
  );
};

const snare = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const low = new Oscillator(ctx.sampleRate);
  const high = new Oscillator(ctx.sampleRate);
  const filter = new Filter(ctx.sampleRate, 1500, 0.7);
  write(
    bus,
    start,
    Math.round(0.35 * ctx.sampleRate),
    ctx.sampleRate,
    (i, t, o) => {
      const tone =
        low.sine(185) * Math.exp(-t * 22) * 0.5 +
        high.sine(330) * Math.exp(-t * 30) * 0.2;
      filter.process(ctx.noise[i % ctx.noise.length]);
      const noise = filter.high * Math.exp(-t * 13) * 0.7;
      const v = (tone + noise) * e.velocity * 0.5;
      mono(o, v);
    },
  );
};

const hat = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const open = e.instrument === "openHat";
  const filter = new Filter(ctx.sampleRate, 7000, 0.7);
  const decay = open ? 7 : 55;
  const gain = (open ? 0.16 : 0.22) * e.velocity;
  // Read the noise table from another place than the snare
  const offset = 4096;
  write(
    bus,
    start,
    Math.round((open ? 0.4 : 0.08) * ctx.sampleRate),
    ctx.sampleRate,
    (i, t, o) => {
      filter.process(ctx.noise[(i + offset) % ctx.noise.length]);
      const v = filter.high * Math.exp(-t * decay) * gain;
      o.l = v * 0.85;
      o.r = v;
    },
  );
};

const tom = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const osc = new Oscillator(ctx.sampleRate);
  const freq = midiToHz(e.midi);
  // Higher toms on the left, lower on the right
  const pan = Math.min(1, Math.max(0, (e.midi - 38) / 12));
  write(
    bus,
    start,
    Math.round(0.5 * ctx.sampleRate),
    ctx.sampleRate,
    (_, t, o) => {
      const v =
        osc.sine(freq * (1 + 0.5 * Math.exp(-t * 20))) *
        Math.exp(-t * 7) *
        e.velocity *
        0.7;
      o.l = v * (0.6 + 0.4 * pan);
      o.r = v * (1 - 0.4 * pan);
    },
  );
};

const bass = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const freq = midiToHz(e.midi);
  const a = new Oscillator(ctx.sampleRate);
  const b = new Oscillator(ctx.sampleRate, 0.25);
  const sub = new Oscillator(ctx.sampleRate);
  const filter = new Filter(ctx.sampleRate);
  const length = Math.round((e.duration + BASS_ENV.release) * ctx.sampleRate);
  write(bus, start, length, ctx.sampleRate, (i, t, o) => {
    if (i % CONTROL_RATE === 0) {
      filter.set(
        ctx.sound.bassCutoff + 2200 * Math.exp(-t * 20) * e.velocity,
        1.4,
      );
    }
    const x =
      a.saw(freq) + b.saw(freq * cents(8)) + sub.square(freq / 2) * 0.35;
    const v =
      filter.process(x) * adsr(t, e.duration, BASS_ENV) * e.velocity * 0.32;
    mono(o, v);
  });
};

const pad = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const freq = midiToHz(e.midi);
  // Two detuned saws per side: wide stereo, Juno-like chorus
  const oscs = [0, 0.33, 0.5, 0.83].map(
    (p) => new Oscillator(ctx.sampleRate, p),
  );
  const ratios = [cents(-11), cents(4), cents(11), cents(-4)];
  const filterL = new Filter(ctx.sampleRate);
  const filterR = new Filter(ctx.sampleRate);
  const length = Math.round((e.duration + PAD_ENV.release) * ctx.sampleRate);
  let env = 0;
  write(bus, start, length, ctx.sampleRate, (i, t, o) => {
    // Slow envelope and filter swell: updated at control rate
    if (i % CONTROL_RATE === 0) {
      const cutoff = ctx.sound.padCutoff * (0.6 + 0.4 * Math.min(1, t / 1.5));
      filterL.set(cutoff, 0.8);
      filterR.set(cutoff, 0.8);
      env = adsr(t, e.duration, PAD_ENV) * e.velocity * 0.07;
    }
    const l = oscs[0].saw(freq * ratios[0]) + oscs[1].saw(freq * ratios[1]);
    const r = oscs[2].saw(freq * ratios[2]) + oscs[3].saw(freq * ratios[3]);
    o.l = filterL.process(l) * env;
    o.r = filterR.process(r) * env;
  });
};

const arp = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const freq = midiToHz(e.midi);
  const osc = new Oscillator(ctx.sampleRate);
  const filter = new Filter(ctx.sampleRate);
  const length = Math.round((e.duration + ARP_ENV.release) * ctx.sampleRate);
  write(bus, start, length, ctx.sampleRate, (i, t, o) => {
    if (i % CONTROL_RATE === 0) {
      filter.set(1200 + 4000 * Math.exp(-t * 25), 1.2);
    }
    const v =
      filter.process(osc.square(freq, 0.35)) *
      adsr(t, e.duration, ARP_ENV) *
      e.velocity *
      0.11;
    mono(o, v);
  });
};

const lead = (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => {
  const freq = midiToHz(e.midi);
  const a = new Oscillator(ctx.sampleRate);
  const b = new Oscillator(ctx.sampleRate, 0.5);
  const filter = new Filter(ctx.sampleRate, 3500, 0.9);
  const length = Math.round((e.duration + LEAD_ENV.release) * ctx.sampleRate);
  write(bus, start, length, ctx.sampleRate, (_, t, o) => {
    // Delayed vibrato, fading in
    const vibratoAmount = t < 0.18 ? 0 : Math.min(1, (t - 0.18) / 0.2);
    const f =
      freq * cents(18 * vibratoAmount * Math.sin(2 * Math.PI * 5.5 * t));
    const x = a.saw(f) * 0.6 + b.square(f * cents(5)) * 0.4;
    const v =
      filter.process(x) * adsr(t, e.duration, LEAD_ENV) * e.velocity * 0.12;
    o.l = v * 0.95;
    o.r = v;
  });
};

export const INSTRUMENTS = {
  kick,
  snare,
  hat,
  openHat: hat,
  tom,
  bass,
  pad,
  arp,
  lead,
} satisfies Record<
  MusicEvent["instrument"],
  (bus: Bus, start: number, e: MusicEvent, ctx: PlayContext) => void
>;
