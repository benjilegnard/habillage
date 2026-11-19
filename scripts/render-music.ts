// Renders the music of a seed to a WAV file, with the same code as the videos.
//
//   node scripts/render-music.ts <seed> [sunset|moon] [--check]
//
// Output: public/music/<seed>-<mood>.wav
// --check: also verifies that the loop is seamless and the output deterministic.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderLoops, renderScore, SAMPLE_RATE } from "../src/music/render.ts";
import { makeScore, type Mood } from "../src/music/score.ts";
import { encodeWav } from "../src/music/wav.ts";

const args = process.argv.slice(2);
const check = args.includes("--check");
const [seed = "outrun-1984", mood = "sunset"] = args.filter(
  (a) => !a.startsWith("--"),
);
if (mood !== "sunset" && mood !== "moon") {
  throw new Error(`Unknown mood "${mood}", use "sunset" or "moon"`);
}

const render = () => {
  const score = makeScore(seed, mood as Mood);
  const start = performance.now();
  const { left, right } = renderScore(score);
  const ms = performance.now() - start;
  return { score, ms, wav: encodeWav(left, right, SAMPLE_RATE), left, right };
};

const { score, ms, wav, left, right } = render();
// Run from the project root (npm run music)
const dir = join(process.cwd(), "public", "music");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${seed}-${mood}.wav`);
writeFileSync(file, Buffer.from(wav));

let sum = 0;
for (let i = 0; i < left.length; i++) sum += left[i] ** 2 + right[i] ** 2;
const rmsDb = 10 * Math.log10(sum / (2 * left.length));

console.log(`${file}`);
console.log(
  `${score.durationInSeconds} s, ${score.bpm} BPM, root ${score.root}, ${score.scale}, ` +
    `${score.events.length} events, rendered in ${Math.round(ms)} ms, RMS ${rmsDb.toFixed(1)} dBFS`,
);

if (check) {
  const hash = (b: ArrayBuffer) =>
    createHash("sha256").update(Buffer.from(b)).digest("hex");
  const same = hash(render().wav) === hash(wav);
  console.log(`Deterministic (2 renders, same bytes): ${same ? "yes" : "NO"}`);

  // In steady state, loop 2 and loop 3 must be the same: then the end of a
  // loop flows exactly into its own start
  const loops = renderLoops(score, 3);
  const n = Math.round(score.durationInSeconds * SAMPLE_RATE);
  let maxDiff = 0;
  for (let i = 0; i < n; i++) {
    maxDiff = Math.max(
      maxDiff,
      Math.abs(loops.left[n + i] - loops.left[2 * n + i]),
      Math.abs(loops.right[n + i] - loops.right[2 * n + i]),
    );
  }
  console.log(`Seamless loop (max diff loop 2 vs loop 3): ${maxDiff}`);
  if (!same || maxDiff > 1e-4) process.exitCode = 1;
}
