import { useEffect, useMemo, useState } from "react";
import { useDelayRender } from "remotion";
import type {
  MusicWorkerRequest,
  MusicWorkerResponse,
} from "./music.worker.ts";
import { makeScore, type Mood, type Score } from "./score.ts";

export type Music = {
  score: Score;
  // Blob URL of the generated WAV, null while generating
  src: string | null;
};

/**
 * Generates the seeded music loop in a Web Worker. The score (pure data,
 * cheap) is available at once for visuals. The audio takes about 1 s and
 * holds the render with delayRender() until it is ready, without blocking
 * the main thread. A seed change terminates the running worker.
 * With `enabled = false`, only the score is computed (no audio).
 */
export const useMusic = (seed: string, mood: Mood, enabled = true): Music => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const score = useMemo(() => makeScore(seed, mood), [seed, mood]);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handle = delayRender(`Generating music for "${seed}" (${mood})`);
    let url: string | null = null;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };

    const worker = new Worker(new URL("./music.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<MusicWorkerResponse>) => {
      worker.terminate();
      const message = event.data;
      if (!message.ok) {
        cancelRender(new Error(`Music worker failed: ${message.error}`));
        return;
      }
      url = URL.createObjectURL(
        new Blob([message.wav], { type: "audio/wav" }),
      );
      setSrc(url);
      finish();
    };
    worker.onerror = (event) => {
      worker.terminate();
      cancelRender(new Error(`Music worker error: ${event.message}`));
    };
    const request: MusicWorkerRequest = { score };
    worker.postMessage(request);

    return () => {
      // Stops a generation still running for a previous seed
      worker.terminate();
      // Never leave a pending delayRender (seed change, unmount, strict mode)
      finish();
      if (url) URL.revokeObjectURL(url);
      setSrc(null);
    };
  }, [score, seed, mood, enabled, delayRender, continueRender, cancelRender]);

  return { score, src };
};
