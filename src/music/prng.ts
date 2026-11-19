// Seeded random numbers. Never use Math.random() in music code: the same seed
// must always give the same track, in the browser and in Node.

export type Rng = () => number;

// String hash (cyrb-like) -> 32-bit integer
const hashString = (value: string): number => {
  let h = 1779033703 ^ value.length;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

// Small fast PRNG, returns numbers in [0, 1)
const mulberry32 = (state: number): Rng => {
  let a = state;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * One independent stream per musical part ("harmony", "bass", "drums"...):
 * adding a random call in one part never changes the other parts, and the
 * music never shifts the randomness of the visuals.
 */
export const createRng = (seed: string, stream: string): Rng =>
  mulberry32(hashString(`${seed}:music:${stream}`));

export const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.floor(rng() * items.length)];

export const chance = (rng: Rng, probability: number): boolean =>
  rng() < probability;

// Fixed white noise table, generated once. Every drum hit reads it from the
// start, so all loops are identical (a running noise stream would not be).
export const createNoiseTable = (
  seed: string,
  length: number,
): Float32Array => {
  const rng = createRng(seed, "noise");
  const table = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    table[i] = rng() * 2 - 1;
  }
  return table;
};
