import { useEffect, useMemo, useState } from "react";
import { useDelayRender } from "remotion";
import { renderScore, SAMPLE_RATE } from "./render.ts";
import { makeScore, type Mood, type Score } from "./score.ts";
import { encodeWav } from "./wav.ts";

export type Music = {
  score: Score;
  // Blob URL of the generated WAV, null while generating
  src: string | null;
};

/**
 * Generates the seeded music loop in the browser. The score (pure data,
 * cheap) is available at once for visuals. The audio takes about 1 s and
 * holds the render with delayRender() until it is ready.
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

    // setTimeout: let the first frame paint before the CPU heavy work
    const timeout = setTimeout(() => {
      try {
        const { left, right } = renderScore(score, SAMPLE_RATE);
        const wav = encodeWav(left, right, SAMPLE_RATE);
        url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
        setSrc(url);
        finish();
      } catch (err) {
        cancelRender(err);
      }
    });

    return () => {
      clearTimeout(timeout);
      // Never leave a pending delayRender (seed change, unmount, strict mode)
      finish();
      if (url) URL.revokeObjectURL(url);
      setSrc(null);
    };
  }, [score, seed, mood, enabled, delayRender, continueRender, cancelRender]);

  return { score, src };
};
