import { pingPongDelay, reverb } from "./fx.ts";
import {
  createBus,
  INSTRUMENTS,
  type Bus,
  type PlayContext,
} from "./instruments.ts";
import { createNoiseTable } from "./prng.ts";
import type { Instrument, Score } from "./score.ts";

// 1 video frame at 30 fps = 1600 samples, 20 s = 960000 samples
export const SAMPLE_RATE = 48000;

type Group = "kick" | "snare" | "drums" | "bass" | "pad" | "arp" | "lead";

const GROUP_OF: Record<Instrument, Group> = {
  kick: "kick",
  snare: "snare",
  hat: "drums",
  openHat: "drums",
  tom: "drums",
  bass: "bass",
  pad: "pad",
  arp: "arp",
  lead: "lead",
};

const GROUPS: Group[] = [
  "kick",
  "snare",
  "drums",
  "bass",
  "pad",
  "arp",
  "lead",
];

// Time after a snare hit during which its reverb stays open (80's gated reverb)
const GATE_OPEN = 0.22;
const GATE_FADE = 0.03;

/**
 * Renders `loops` repetitions of the score into stereo buffers, with all the
 * effects. Notes are rendered once into a one-loop buffer where tails wrap
 * around (exact steady state, notes only add up). Effects with feedback
 * (delay, reverb) then run over all the repetitions, so their tails also
 * cross the loop points, like when the loop is played again.
 */
export const renderLoops = (
  score: Score,
  loops: number,
  sampleRate = SAMPLE_RATE,
): Bus => {
  const loopLength = Math.round(score.durationInSeconds * sampleRate);
  const length = loopLength * loops;
  const ctx: PlayContext = {
    sampleRate,
    noise: createNoiseTable(score.seed, sampleRate),
    sound: score.sound,
  };

  const oneLoop = Object.fromEntries(
    GROUPS.map((g) => [g, createBus(loopLength)]),
  ) as Record<Group, Bus>;

  // Kick shape for the sidechain ducking, and gate for the snare reverb
  const sidechain = new Float32Array(loopLength);
  const gate = new Float32Array(loopLength);
  const shape = (
    target: Float32Array,
    start: number,
    seconds: number,
    level: (t: number) => number,
  ) => {
    const count = Math.round(seconds * sampleRate);
    for (let i = 0; i < count; i++) {
      const n = (start + i) % loopLength;
      target[n] = Math.max(target[n], level(i / sampleRate));
    }
  };

  // Events are sorted: the mix order is always the same
  for (const e of score.events) {
    const start = Math.round(e.time * sampleRate);
    INSTRUMENTS[e.instrument](oneLoop[GROUP_OF[e.instrument]], start, e, ctx);
    if (e.instrument === "kick") {
      shape(sidechain, start, 0.4, (t) => Math.exp(-t * 10) * e.velocity);
    }
    if (e.instrument === "snare") {
      shape(gate, start, GATE_OPEN + GATE_FADE, (t) =>
        t < GATE_OPEN ? 1 : 1 - (t - GATE_OPEN) / GATE_FADE,
      );
    }
  }

  // Repeat the loop for the effects
  const buses = Object.fromEntries(
    GROUPS.map((g) => {
      const bus = createBus(length);
      for (let loop = 0; loop < loops; loop++) {
        bus.left.set(oneLoop[g].left, loop * loopLength);
        bus.right.set(oneLoop[g].right, loop * loopLength);
      }
      return [g, bus];
    }),
  ) as Record<Group, Bus>;

  const master = createBus(length);
  const delaySend = createBus(length);
  const reverbSend = createBus(length);
  const { kick, snare, drums, bass, pad, arp, lead } = buses;

  // Plain arrays in local variables: this loop runs for every sample
  const [kickL, kickR] = [kick.left, kick.right];
  const [snareL, snareR] = [snare.left, snare.right];
  const [drumsL, drumsR] = [drums.left, drums.right];
  const [bassL, bassR] = [bass.left, bass.right];
  const [padL, padR] = [pad.left, pad.right];
  const [arpL, arpR] = [arp.left, arp.right];
  const [leadL, leadR] = [lead.left, lead.right];
  for (let n = 0; n < length; n++) {
    // The kick pushes the bass, pads and arp down (sidechain "pumping")
    const sc = sidechain[n % loopLength];
    const duckBass = 1 - 0.55 * sc;
    const duckPad = 1 - 0.4 * sc;
    const duckArp = 1 - 0.25 * sc;

    const pl = padL[n] * duckPad;
    const al = arpL[n] * duckArp;
    master.left[n] =
      kickL[n] +
      snareL[n] +
      drumsL[n] +
      bassL[n] * duckBass +
      pl +
      al +
      leadL[n];
    delaySend.left[n] = al * 0.45 + leadL[n] * 0.35;
    reverbSend.left[n] =
      pl * 0.5 + leadL[n] * 0.4 + al * 0.25 + snareL[n] * 0.15;

    const pr = padR[n] * duckPad;
    const ar = arpR[n] * duckArp;
    master.right[n] =
      kickR[n] +
      snareR[n] +
      drumsR[n] +
      bassR[n] * duckBass +
      pr +
      ar +
      leadR[n];
    delaySend.right[n] = ar * 0.45 + leadR[n] * 0.35;
    reverbSend.right[n] =
      pr * 0.5 + leadR[n] * 0.4 + ar * 0.25 + snareR[n] * 0.15;
  }

  const beat = 60 / score.bpm;
  const delayOut = createBus(length);
  pingPongDelay(
    delaySend.left,
    delaySend.right,
    delayOut.left,
    delayOut.right,
    Math.round(score.sound.delayBeats * beat * sampleRate),
    0.42,
  );
  for (let n = 0; n < length; n++) {
    master.left[n] += delayOut.left[n] * 0.7;
    master.right[n] += delayOut.right[n] * 0.7;
    reverbSend.left[n] += delayOut.left[n] * 0.2;
    reverbSend.right[n] += delayOut.right[n] * 0.2;
  }

  reverb(
    reverbSend.left,
    reverbSend.right,
    master.left,
    master.right,
    sampleRate,
    {
      room: score.sound.reverbRoom,
      damp: 0.45,
      wet: 2.5,
    },
  );

  // Gated reverb on the snare: big room, cut shortly after each hit
  const gated = createBus(length);
  reverb(snare.left, snare.right, gated.left, gated.right, sampleRate, {
    room: 0.92,
    damp: 0.2,
    wet: 3,
  });
  for (let n = 0; n < length; n++) {
    const g = gate[n % loopLength] * 0.8;
    master.left[n] += gated.left[n] * g;
    master.right[n] += gated.right[n] * g;
  }

  return master;
};

/**
 * Renders one seamless loop of the score: 2 loops are rendered and the
 * second one is kept, so it starts with the tails (reverb, delay, pad
 * release) of the end of the loop, exactly like when it repeats.
 * Output is soft clipped and normalized to -1 dBFS peak.
 */
export const renderScore = (score: Score, sampleRate = SAMPLE_RATE): Bus => {
  const all = renderLoops(score, 2, sampleRate);
  const loopLength = Math.round(score.durationInSeconds * sampleRate);
  const left = all.left.slice(loopLength, 2 * loopLength);
  const right = all.right.slice(loopLength, 2 * loopLength);

  // Tape-like soft saturation, then normalization
  let peak = 0;
  for (let n = 0; n < loopLength; n++) {
    left[n] = Math.tanh(left[n] * 1.2);
    right[n] = Math.tanh(right[n] * 1.2);
    peak = Math.max(peak, Math.abs(left[n]), Math.abs(right[n]));
  }
  const gain = peak > 0 ? 0.89 / peak : 1;
  for (let n = 0; n < loopLength; n++) {
    left[n] *= gain;
    right[n] *= gain;
  }
  return { left, right };
};
