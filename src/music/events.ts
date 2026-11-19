import type { Instrument, Score } from "./score.ts";

// Helpers to drive visuals from the score (no audio analysis needed).
// `time` is in seconds; it wraps around the loop, so effects loop too.

const wrap = (time: number, length: number) =>
  ((time % length) + length) % length;

/** Seconds since the last hit of `instrument` (looking across the loop point). */
export const timeSinceLast = (
  score: Score,
  instrument: Instrument,
  time: number,
): number => {
  const t = wrap(time, score.durationInSeconds);
  let last: number | null = null;
  let lastInLoop: number | null = null;
  for (const e of score.events) {
    if (e.instrument !== instrument) continue;
    lastInLoop = e.time;
    if (e.time <= t) last = e.time;
  }
  if (last !== null) return t - last;
  // Before the first hit: the last one is at the end of the previous loop
  if (lastInLoop !== null) return t + score.durationInSeconds - lastInLoop;
  return Infinity;
};

/** 1 on each hit, then decays exponentially. `speed` = decay rate per second. */
export const hitEnvelope = (
  score: Score,
  instrument: Instrument,
  time: number,
  speed = 8,
): number => Math.exp(-timeSinceLast(score, instrument, time) * speed);

/** Position inside the current beat, from 0 to 1. */
export const beatPhase = (score: Score, time: number): number =>
  wrap(time, 60 / score.bpm) / (60 / score.bpm);

/** Position inside the current bar, from 0 to 1. */
export const barPhase = (score: Score, time: number): number => {
  const bar = (60 / score.bpm) * score.beatsPerBar;
  return wrap(time, bar) / bar;
};
