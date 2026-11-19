import { chance, createRng, pick } from "./prng.ts";
import {
  chordNotes,
  degreeToMidi,
  foldInto,
  PENTATONIC_DEGREES,
  PROGRESSIONS,
  type ScaleName,
  voiceChord,
} from "./theory.ts";

// "sunset": brighter, four on the floor. "moon": darker, half-time drums,
// more reverb.
export type Mood = "sunset" | "moon";

export type Instrument =
  | "bass"
  | "pad"
  | "arp"
  | "lead"
  | "kick"
  | "snare"
  | "hat"
  | "openHat"
  | "tom";

export type MusicEvent = {
  instrument: Instrument;
  time: number; // seconds from the loop start
  duration: number; // seconds
  midi: number; // pitch (toms too), 0 for other drums
  velocity: number; // 0 to 1
};

export type Chord = {
  time: number;
  duration: number;
  degree: number;
  notes: number[];
};

export type Score = {
  seed: string;
  mood: Mood;
  bpm: number;
  bars: number;
  beatsPerBar: number;
  durationInSeconds: number;
  root: number;
  scale: ScaleName;
  chords: Chord[];
  // Sorted by time
  events: MusicEvent[];
  sound: {
    padCutoff: number; // Hz
    bassCutoff: number; // Hz
    delayBeats: number; // ping-pong delay time
    reverbRoom: number; // 0 to 1
  };
};

// 96 BPM, 8 bars of 4/4 = exactly 20 s, the length of the video loop.
// At 48 kHz, 20 s = 960000 samples and 1 video frame (30 fps) = 1600 samples.
export const BPM = 96;
export const BARS = 8;
const STEPS_PER_BAR = 16;

const BASS_PATTERNS = {
  // Index in the chord (0 root, 1 third, 2 fifth) and octave, per 16th
  octave: [
    [0, 0],
    [0, 1],
  ],
  driving: [[0, 0]],
  arpUp: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 0],
  ],
  rootFifth: [
    [0, 0],
    [0, 0],
    [2, 0],
    [2, 0],
  ],
} as const;

const ARP_SHAPES = {
  up: [0, 1, 2, 3],
  upDown: [0, 1, 2, 3, 2, 1],
  down: [3, 2, 1, 0],
  skip: [0, 2, 1, 3],
} as const;

// Rhythm cells for the lead, on an 8th note grid over 2 bars (16 slots):
// 1 = note start, 0 = rest or hold
const LEAD_RHYTHMS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0],
];

export const makeScore = (seed: string, mood: Mood): Score => {
  const beat = 60 / BPM;
  const step = beat / 4;
  const barLength = beat * 4;
  const events: MusicEvent[] = [];
  const add = (event: MusicEvent) => events.push(event);

  // Harmony: key, scale, progression (1 chord every 2 bars)
  const harmony = createRng(seed, "harmony");
  const scale: ScaleName =
    mood === "sunset" && chance(harmony, 0.4) ? "dorian" : "aeolian";
  const root = pick(harmony, [38, 40, 41, 42, 43, 45]); // D2 to A2
  const progression = pick(harmony, PROGRESSIONS[scale]);
  const addNinth = chance(harmony, 0.5);

  const chords: Chord[] = progression.map((degree, i) => ({
    time: i * 2 * barLength,
    duration: 2 * barLength,
    degree,
    notes: voiceChord(chordNotes(root, scale, degree, addNinth), 55),
  }));
  const chordAt = (bar: number) => chords[Math.floor(bar / 2)];

  // Pads: one long note per chord tone
  for (const chord of chords) {
    for (const midi of chord.notes) {
      add({
        instrument: "pad",
        time: chord.time,
        duration: chord.duration,
        midi,
        velocity: 0.8,
      });
    }
  }

  // Bass: 16th note pattern on the chord root
  const bassRng = createRng(seed, "bass");
  const bassPattern =
    BASS_PATTERNS[
      pick(
        bassRng,
        Object.keys(BASS_PATTERNS) as (keyof typeof BASS_PATTERNS)[],
      )
    ];
  const bassRate = mood === "moon" && chance(bassRng, 0.5) ? 2 : 1; // 8ths
  for (let bar = 0; bar < BARS; bar++) {
    const chord = chordAt(bar);
    const triad = [0, 2, 4].map((k) =>
      foldInto(degreeToMidi(root, scale, chord.degree + k), 33),
    );
    for (let s = 0; s < STEPS_PER_BAR; s += bassRate) {
      const [index, octave] = bassPattern[(s / bassRate) % bassPattern.length];
      add({
        instrument: "bass",
        time: bar * barLength + s * step,
        duration: step * bassRate * 0.85,
        midi: triad[index] + 12 * octave,
        velocity: s % 4 === 0 ? 1 : 0.8,
      });
    }
  }

  // Arpeggio: 16ths (or 8ths) through the chord, one octave above the pad
  const arpRng = createRng(seed, "arp");
  if (chance(arpRng, mood === "moon" ? 0.8 : 0.65)) {
    const shape =
      ARP_SHAPES[
        pick(arpRng, Object.keys(ARP_SHAPES) as (keyof typeof ARP_SHAPES)[])
      ];
    const rate = chance(arpRng, 0.6) ? 1 : 2;
    for (let bar = 0; bar < BARS; bar++) {
      const notes = chordAt(bar).notes;
      for (let s = 0; s < STEPS_PER_BAR; s += rate) {
        const n = shape[(s / rate) % shape.length] % notes.length;
        add({
          instrument: "arp",
          time: bar * barLength + s * step,
          duration: step * rate * 0.6,
          midi: notes[n] + 12,
          velocity: s % 4 === 0 ? 0.9 : 0.65,
        });
      }
    }
  }

  // Lead: call (bars 5-6) and answer (bars 7-8) on the same rhythm,
  // chord tones on strong slots, pentatonic notes elsewhere
  const leadRng = createRng(seed, "lead");
  if (chance(leadRng, 0.7)) {
    const rhythm = pick(leadRng, LEAD_RHYTHMS);
    const eighth = beat / 2;
    for (const phrase of [0, 1]) {
      const startBar = 4 + phrase * 2;
      const starts = rhythm.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
      starts.forEach((slot, k) => {
        const bar = startBar + Math.floor(slot / 8);
        const chord = chordAt(bar);
        const isLast = k === starts.length - 1;
        const strong = slot % 4 === 0 || isLast;
        let midi: number;
        if (strong) {
          // The answer ends on the root, the call on another chord tone
          const tone = isLast && phrase === 1 ? 0 : pick(leadRng, [0, 2, 4]);
          midi = foldInto(degreeToMidi(root, scale, chord.degree + tone), 69);
        } else {
          midi = foldInto(
            degreeToMidi(root, scale, pick(leadRng, PENTATONIC_DEGREES)),
            69,
          );
        }
        const next = starts[k + 1] ?? 16;
        add({
          instrument: "lead",
          time: startBar * barLength + slot * eighth,
          duration: Math.min(next - slot, 4) * eighth * 0.9,
          midi,
          velocity: strong ? 0.9 : 0.75,
        });
      });
    }
  }

  // Drums
  const drumRng = createRng(seed, "drums");
  const hatsOn16ths = chance(drumRng, 0.5);
  const openHats = chance(drumRng, 0.5);
  const halfTime = mood === "moon";
  for (let bar = 0; bar < BARS; bar++) {
    const fill = bar === BARS - 1;
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      const time = bar * barLength + s * step;
      const drum = (instrument: Instrument, velocity: number, midi = 0) =>
        add({ instrument, time, duration: step, midi, velocity });

      // Toms on the last beat of the last bar, leading back to bar 1
      if (fill && s >= 12) {
        drum("tom", 0.9, 50 - (s - 12) * 4);
        continue;
      }
      const kick = halfTime ? s === 0 || s === 10 : s % 4 === 0;
      if (kick) drum("kick", 1);
      const snare = halfTime ? s === 8 : s === 4 || s === 12;
      if (snare) drum("snare", 1);
      if (openHats && s % 4 === 2) {
        drum("openHat", 0.5);
      } else if (hatsOn16ths || s % 2 === 0) {
        drum("hat", s % 4 === 2 ? 0.7 : 0.45);
      }
    }
  }

  events.sort((a, b) => a.time - b.time);

  const soundRng = createRng(seed, "sound");
  return {
    seed,
    mood,
    bpm: BPM,
    bars: BARS,
    beatsPerBar: 4,
    durationInSeconds: BARS * barLength,
    root,
    scale,
    chords,
    events,
    sound: {
      padCutoff:
        mood === "moon"
          ? pick(soundRng, [900, 1200, 1500])
          : pick(soundRng, [1600, 2200, 2800]),
      bassCutoff: pick(soundRng, [280, 380, 500]),
      delayBeats: pick(soundRng, [0.75, 0.5]),
      reverbRoom: mood === "moon" ? 0.88 : pick(soundRng, [0.7, 0.8]),
    },
  };
};
