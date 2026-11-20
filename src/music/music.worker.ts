// Web Worker: renders a score to a WAV file off the main thread, so the
// Studio does not freeze for about 1 s each time the seed changes.
// Started by `useMusic` with `new Worker(new URL(...), import.meta.url)`,
// which the Remotion bundler (webpack 5) turns into a separate chunk.

import { renderScore, SAMPLE_RATE } from "./render.ts";
import type { Score } from "./score.ts";
import { encodeWav } from "./wav.ts";

export type MusicWorkerRequest = { score: Score };

export type MusicWorkerResponse =
  | { ok: true; wav: ArrayBuffer }
  | { ok: false; error: string };

const reply = (message: MusicWorkerResponse, transfer: Transferable[] = []) => {
  self.postMessage(message, { transfer });
};

self.onmessage = (event: MessageEvent<MusicWorkerRequest>) => {
  try {
    const { left, right } = renderScore(event.data.score, SAMPLE_RATE);
    const wav = encodeWav(left, right, SAMPLE_RATE);
    // Transfer the buffer instead of copying it (about 4 MB for 20 s)
    reply({ ok: true, wav }, [wav]);
  } catch (err) {
    reply({
      ok: false,
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
    });
  }
};
