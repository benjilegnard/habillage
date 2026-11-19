// Scales, chords and progressions. Everything stays diatonic, so random
// choices never clash.

export const SCALES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
} as const;

export type ScaleName = keyof typeof SCALES;

// Progressions as 0-based scale degrees. Only degrees that give a major or
// minor triad in the given scale (no diminished chords).
export const PROGRESSIONS: Record<ScaleName, readonly number[][]> = {
  aeolian: [
    [0, 5, 2, 6], // i VI III VII (Am F C G)
    [0, 5, 6, 0], // i VI VII i
    [5, 6, 0, 0], // VI VII i i
    [0, 6, 5, 6], // i VII VI VII
    [0, 3, 5, 6], // i iv VI VII
  ],
  dorian: [
    [0, 3, 0, 3], // i IV i IV
    [0, 6, 3, 0], // i VII IV i
    [0, 2, 3, 6], // i III IV VII
  ],
};

export const midiToHz = (midi: number): number =>
  440 * Math.pow(2, (midi - 69) / 12);

// Scale degree (can be negative or above 7) to MIDI note
export const degreeToMidi = (
  root: number,
  scale: ScaleName,
  degree: number,
): number => {
  const steps = SCALES[scale];
  const octave = Math.floor(degree / steps.length);
  const index = ((degree % steps.length) + steps.length) % steps.length;
  return root + steps[index] + 12 * octave;
};

// Fold a note into [low, low + 12)
export const foldInto = (midi: number, low: number): number => {
  let note = midi;
  while (note < low) note += 12;
  while (note >= low + 12) note -= 12;
  return note;
};

// Triad (optionally with the 9th) on a scale degree, as MIDI notes
export const chordNotes = (
  root: number,
  scale: ScaleName,
  degree: number,
  addNinth: boolean,
): number[] => {
  const intervals = addNinth ? [0, 2, 4, 8] : [0, 2, 4];
  return intervals.map((k) => degreeToMidi(root, scale, degree + k));
};

// Close voicing around a center note: small movement between chords
export const voiceChord = (notes: number[], low: number): number[] =>
  notes.map((n) => foldInto(n, low)).sort((a, b) => a - b);

// Minor pentatonic degrees inside an aeolian / dorian scale
export const PENTATONIC_DEGREES = [0, 2, 3, 4, 6];
