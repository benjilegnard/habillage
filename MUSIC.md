# Procedural synthwave music for the Remotion videos

Research notes (November 2026, Remotion 4.0.545). Goal: seeded, algorithmic, 80's style synth music that loops with the 20 s `Synthwave` composition and is rendered deterministically into the final MP4.

## 1. Summary and recommendation

Yes, it works, and it works well. Recommended approach:

1. **Write a small, dependency free synth engine in TypeScript** (`src/music/`): seed -> score (pure data) -> Float32 sample arrays -> WAV bytes. No Web Audio, no Tone.js.
2. **Generate inside the Remotion bundle**, in a hook that holds a `delayRender()` handle, then pass a `blob:` URL of the WAV to `<Audio>` from `@remotion/media`. This works in the Studio and in `remotion render` (both tested, see section 9).
3. **Use the same score for visuals** (sun pulse on the kick, grid flash on the snare) instead of audio analysis. If spectrum data is wanted, build a `MediaUtilsAudioData` object straight from the generated Float32 arrays and give it to `visualizeAudio()` (no file fetch needed, tested).
4. Optionally add a tiny Node script that runs the same module and writes `public/music/<seed>.wav` (to listen, share, or use with `staticFile()`).

Why pure TS rather than Tone.js or `OfflineAudioContext`:

- **Bit exact determinism everywhere.** Same seed gave byte identical WAVs in Node, and the Remotion render output matched a Node computation of the same samples (3 samples off by 1 LSB out of 192000). Web Audio output depends on the browser engine (Chrome vs node-web-audio-api give different bytes), and Tone.js uses `Math.random()` internally.
- **Same code runs in Node and in the browser**, so a pre-render script and the in-bundle path give the same audio.
- **Seamless loops are easy**: we control every sample, so we can render 2 or 3 loops and keep a steady state loop (tested: loop 2 and loop 3 are bit identical).
- **The score is plain data**, shared with the visuals.
- Cost: you write your own oscillators, envelopes, filters, delay and reverb (a few hundred lines). Sound quality is "as good as you make it". A PoC with naive saws, one-pole filters, a ping-pong delay and synthesized drums already sounds like a usable synthwave loop.

Acceptable alternative if you prefer a rich, ready made instrument set: **Tone.js `Tone.Offline()` inside the bundle**, with a seeded `Math.random` swapped in during the render and no AudioWorklet based effects. It was deterministic run to run in `remotion render` (tested), but only for a given Chrome build, and any AudioWorklet effect (`Freeverb`, etc.) broke byte identity (tiny 1 LSB differences).

## 2. How audio gets into a Remotion render

Remotion renders frames one by one in headless Chrome (Chrome Headless Shell). Real time Web Audio playback (an `AudioContext` speaking to the speakers) is never captured. Audio only reaches the output through Remotion audio components, which register "assets" for each frame. The renderer then mixes them with FFmpeg.

- **`<Audio>` from `@remotion/media`** (recommended component). Supports `staticFile()` and remote URLs (CORS required). It decodes in the browser tab with Mediabunny and sends the decoded samples to the renderer as `inline-audio` assets (seen in `node_modules/remotion/dist/cjs/CompositionManager.d.ts`, `InlineAudioAsset`). Because decoding happens inside the tab, **`blob:` URLs created in that tab work** (tested). Props of interest: `loop`, `volume`, `from`, `trimBefore`, `durationInFrames`, `disallowFallbackToHtml5Audio`. Docs: https://www.remotion.dev/docs/media/audio
- **`<Html5Audio>`** (old `<Audio>` from `remotion`). Registers the `src` URL and the Node side downloads it. The renderer accepts `data:` URLs (see `@remotion/renderer/dist/assets/download-and-map-assets-to-file.js`), but a `blob:` URL cannot be downloaded from Node. `@remotion/media` `<Audio>` falls back to `<Html5Audio>` when it cannot decode a source, so with a blob URL set `disallowFallbackToHtml5Audio` to get a clear error instead of a confusing one. Docs: https://www.remotion.dev/docs/html5-audio
- **`audioBufferToDataUrl()`** from `@remotion/media-utils`: official helper, AudioBuffer -> `data:audio/wav;base64,...`. The docs example generates a tone with `OfflineAudioContext` inside a component, using `delayRender()` / `continueRender()`, and plays it with `<Audio>` from `@remotion/media`. This is exactly the in-bundle pattern, officially documented. Note: it writes float32 WAV (large). Docs: https://www.remotion.dev/docs/audio-buffer-to-data-url
- **`calculateMetadata()`** runs once per render ("called a single time, independently from the concurrency of the render"), in a separate tab, and can return new `props`. They must be JSON serializable, so audio has to travel as a data URL string. Tested: works and gives the same output, but the big prop (1 MB for 4 s, about 5 MB for 20 s of 16-bit stereo) is sent to every tab, and the 4 s test render took about 10.5 s instead of about 5 s. Docs: https://www.remotion.dev/docs/calculate-metadata
- **`delayRender()`** blocks frame capture until async work is done (default timeout 30 s). Each render tab runs it on its own: with the default concurrency (8x on this machine), the generation runs 8 times (seen in the logs). With about 50 ms to 1 s per generation, that is fine. Docs: https://www.remotion.dev/docs/delay-render
- **`staticFile()`** for files in `public/`, produced by a pre-render script. Simplest and most cacheable, but the files must exist before rendering (a build step per seed). Docs: https://www.remotion.dev/docs/staticfile
- `@remotion/media` (4.0.545) is declared in `package.json`. Add `@remotion/media-utils` with `pnpm exec remotion add @remotion/media-utils` if `visualizeAudio` is used.

## 3. Options compared

| Option | Where it runs | Determinism (tested) | Sound quality / effort | Speed (tested) | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Pure TS synth -> WAV** (no deps) | Node and browser, same code | Byte identical across runs, in Node and in `remotion render`; Remotion output matches the Node math (3 samples off by 1 LSB) | Good once you write decent oscillators (polyBLEP), filters, reverb. Most code to write | 20 s stereo loop (x3 for loop tails) in about 0.6 s in Node; 4 s test in about 50 ms in Chrome | **Recommended** |
| **Plain `OfflineAudioContext`** (native nodes) in the bundle | Browser (Studio and render) | Byte identical across 2 renders, same Chrome build. Not portable to another engine | Native oscillators (band limited), biquads, `ConvolverNode`, `DelayNode`, `DynamicsCompressorNode`. Verbose node wiring | about 45 ms per 4 s generation in render | Good, if you prefer Web Audio nodes |
| **Tone.js `Tone.Offline()`** in the bundle | Browser | Identical across 2 renders **only** with `Math.random` replaced by a seeded PRNG during the render. With `Freeverb` (AudioWorklet): not byte identical (max 1 LSB, 8756 samples differ) | Best ready made instruments (`MonoSynth`, `PolySynth`, `fatsawtooth`, `MembraneSynth`), Transport and Sequence helpers. Full UMD build is 337 kB minified (80 kB gzip), tree shaking may reduce it | about 160 ms per 4 s (about 500 ms with Freeverb) | Fine alternative, pin versions, avoid worklets and `Tone.Reverb` |
| **Tone.js in Node** + `node-web-audio-api` (Rust engine) | Node pre-render script | Not deterministic out of the box (Noise uses `Math.random`). With seeded `Math.random` and no worklet effects: 5 runs byte identical. With `Freeverb`: `DataCloneError` and different output each run | Needs globals hacks (`self`, `window`, `isSecureContext = true`), native binary, `getChannelData` documented as "not reliable in some situations" | 4 s in 0.7 to 2.5 s | Not recommended |
| `calculateMetadata` returning a data URL prop | Browser, once | Same as the generator used | Same | Render 2x slower in the test (big prop sent to each tab) | Only if generation becomes very slow |
| Pre-rendered WAV in `public/` + `staticFile()` | Node script before `remotion render` | Same as the generator used | Same | Fastest render | Good complement (listen, share, reuse) |
| Elementary Audio (`@elemaudio/offline-renderer`, WASM) | Node or browser | Not tested, should be deterministic (no threads, explicit graph) | Functional DSP graph, good quality | Not tested | Interesting, another dependency to learn |
| Strudel / Tidal-like pattern libs, ZzFX, etc. | Browser | Not tested. Strudel is real time oriented | Great pattern language (Strudel), tiny SFX (ZzFX) | Not tested | Ideas for the pattern layer, not for rendering |

## 4. Recommended architecture for this repo

Fits the current layout (`src/components`, `src/compositions`, `src/theme`):

```
src/music/
  prng.ts          seeded PRNG streams (mulberry32 + string hash), noise table
  theory.ts        scales, chord progressions, midi -> Hz
  score.ts         makeScore(seed, opts) -> Score (pure data, beats and seconds)
  dsp/
    osc.ts         polyBLEP saw / square, sine, triangle
    env.ts         ADSR
    filter.ts      state variable or ladder lowpass
    fx.ts          stereo ping-pong delay, simple Schroeder/Freeverb reverb, chorus, soft clip
  instruments.ts   bass, pad, lead, arp, kick, snare (gated reverb), hats
  render.ts        renderScore(score, sampleRate) -> Float32Array[] (handles loop tails)
  wav.ts           Float32Array[] -> WAV ArrayBuffer (16-bit PCM)
  useMusic.ts      React hook: delayRender, generate once, blob URL, MediaUtilsAudioData
  events.ts        helpers for visuals: kickEnvelope(score, time), beatPhase(time), ...
src/components/Music.tsx   <Music seed=... /> wraps <Audio> from @remotion/media
scripts/render-music.ts    optional: node scripts/render-music.ts <seed> -> public/music/<seed>.wav
```

Seed flow:

- The composition schema already has `seed: z.string()`. Music uses the same string with its own sub-streams: `${seed}:music:harmony`, `${seed}:music:drums`, `${seed}:music:lead`, ... so adding a new random call in one part does not change other parts, and music changes never shift the visual randomness.
- Remotion's `random(key)` (already used in `Sun.tsx`) is deterministic and fine for score decisions (hundreds of calls). For per-sample noise, build one noise table at start from a fast PRNG (see 6).
- Optional extra props: `music: z.object({ enabled, bpm, mood, volume })`, or a separate `musicSeed` defaulting to `seed` (to re-roll the music without changing the landscape).

Where generation runs:

- Default: in the bundle, in `useMusic(seed)` with `delayRender`. Works for Studio preview, `remotion render`, and later the Player. Each render tab generates once (cheap).
- The score (`makeScore`) is synchronous and cheap, so visuals can compute it with `useMemo` without waiting for audio.
- The same `render.ts` can run in Node (Node 26 runs `.ts` directly by stripping types) for `public/music/*.wav`.

How it plugs into compositions:

```tsx
<AbsoluteFill>
  <Landscape seed={seed} theme={...} score={score} />
  <VhsOverlay />
  <Music seed={seed} />
</AbsoluteFill>
```

For the "audio-reactive terrain" idea of the TODO list, `useMusic` also returns `audioData` (a `MediaUtilsAudioData`), so `visualizeAudio({ audioData, frame, fps, numberOfSamples })` works without loading a file.

## 5. Code sketch

```ts
// src/music/useMusic.ts
import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, cancelRender } from "remotion";
import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { makeScore } from "./score";
import { renderScore, SAMPLE_RATE } from "./render";
import { encodeWav } from "./wav";

export const useMusic = (seed: string) => {
  const score = useMemo(() => makeScore(seed), [seed]);
  const [state, setState] = useState<{ src: string; audioData: MediaUtilsAudioData } | null>(null);

  useEffect(() => {
    const handle = delayRender(`Generating music for ${seed}`);
    let url: string | null = null;
    // setTimeout: let the first frame paint before the CPU heavy work (Studio UX)
    const t = setTimeout(() => {
      try {
        const channels = renderScore(score, SAMPLE_RATE); // [L, R], one loop, tails wrapped
        url = URL.createObjectURL(new Blob([encodeWav(channels, SAMPLE_RATE)], { type: "audio/wav" }));
        setState({
          src: url,
          audioData: {
            channelWaveforms: channels,
            sampleRate: SAMPLE_RATE,
            durationInSeconds: channels[0].length / SAMPLE_RATE,
            numberOfChannels: channels.length,
            resultId: `music-${seed}`,
            isRemote: false,
          },
        });
        continueRender(handle);
      } catch (e) {
        cancelRender(e);
      }
    });
    return () => {
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [seed, score]);

  return { score, ...state };
};
```

```tsx
// src/components/Music.tsx
import { Audio } from "@remotion/media";
import { useMusic } from "../music/useMusic";

export const Music: React.FC<{ seed: string; volume?: number }> = ({ seed, volume = 0.8 }) => {
  const { src } = useMusic(seed);
  return src ? <Audio src={src} volume={volume} disallowFallbackToHtml5Audio /> : null;
};
```

```ts
// src/music/render.ts (core idea of the loop handling)
export const SAMPLE_RATE = 48000; // 1 video frame at 30 fps = 1600 samples, 20 s = 960000 samples

export const renderScore = (score: Score, sr = SAMPLE_RATE): Float32Array[] => {
  const loopLen = Math.round(score.durationInSeconds * sr);
  const loops = 3; // loop 1 warms up tails, loops 2 and 3 are identical
  const L = new Float32Array(loopLen * loops);
  const R = new Float32Array(loopLen * loops);
  for (let k = 0; k < loops; k++) {
    for (const e of score.events) playEvent(e, k * loopLen + Math.round(e.time * sr), L, R, sr);
  }
  applyFx(L, R, sr); // delay, reverb, bus compression: state flows across loop boundaries
  return [L.slice(loopLen, 2 * loopLen), R.slice(loopLen, 2 * loopLen)]; // keep loop 2
};
```

A working (rough) version of this engine is the PoC described in section 9.

## 6. Looping and determinism notes

Tempo and length:

- 20 s at 30 fps = 600 frames. At **96 BPM**, 1 beat = 0.625 s, 1 bar of 4/4 = 2.5 s, **8 bars = 20 s exactly**. 1 beat = 18.75 frames (not an integer) and 1 sixteenth = 4.6875 frames, so visuals must use continuous time `frame / fps`, not frame equality tests.
- If integer frames per beat matter: **120 BPM** gives 15 frames per beat, but 20 s = 10 bars (8 bars + 2 bar turnaround), or change the loop to 16 s (480 frames, 8 bars). Other 20 s options: 72 BPM = 6 bars, 84 BPM = 7 bars, 108 BPM = 9 bars.
- Use **48000 Hz**: 20 s = 960000 samples, 1 frame = 1600 samples, no rounding drift anywhere. Event positions: `Math.round(beat * 60 / bpm * sr)`.

Tails at the loop point (reverb, delay, pad release, long notes):

- **Render 2 or 3 loops in a row and keep a later one.** All feedback state (delay lines, reverb, filters) carries over, so the kept loop starts with the tails of the previous loop, which is exactly what you hear when the loop repeats. Tested: with a 0.35 feedback ping-pong delay, loop 2 and loop 3 were bit identical, so the jump from the end of loop 2 to its start is exactly the natural continuation.
- Alternative: render one loop plus a tail, then add the tail onto the start (wrap). Same result for linear effects, not exact for non-linear ones (compressor, saturation). The "keep loop 2" method is simpler and exact.
- Effect tails must decay well within 20 s (they do for normal settings). Avoid LFOs whose period does not divide the loop: use rates like `n / loopSeconds` Hz (e.g. 0.05 Hz, 0.25 Hz), or tie LFOs to bars.
- Inside the MP4, AAC encoding adds priming samples, so a player that loops the MP4 file may click slightly at the seam. For seamless loops in OBS or on a stream, consider a WAV or `--codec=prores` export, or check the seam once on the target platform. Not tested.

Determinism checklist:

- Never call `Math.random()`, `Date.now()`, `performance.now()` in music code. Use seeded PRNG streams per musical part (`${seed}:music:bass`), so parts are independent.
- **Noise must not be a running stream.** First PoC bug: hats and snares read a continuing PRNG noise stream, so each loop had different noise, and loop 2 differed from loop 3 (max diff 1.18). Fix: generate one seeded noise table (1 s) at start and have every hit read it from index 0 (or from a seeded offset per event). Then loop 2 = loop 3 exactly.
- With Tone.js: `Noise` (white, pink, brown buffers), `ToneEvent` (probability, humanize) and `PatternGenerator` ("random" patterns) use `Math.random`. Replace `Math.random` with a seeded PRNG for the duration of `Tone.Offline()` and restore it after, and avoid `Tone.Reverb` (random impulse response, rendered in a separate context) and AudioWorklet based nodes (`Freeverb`, `JCReverb`, `FeedbackCombFilter`, `BitCrusher`...).
- Web Audio output is only reproducible for the same browser build. Remotion pins the Chrome Headless Shell version per Remotion version, so upgrading Remotion may change bytes (inaudibly). Pure JS math is stable across machines as long as V8 `Math.sin/exp/pow` stay the same (in practice they do).
- Float order matters: sum voices in a fixed order (iterate events in score order), and do not use multithreading for mixing.
- Quantize to 16-bit with explicit rounding and clipping (or `tanh` soft clip), do not rely on the encoder to clip.

## 7. Musical generation ideas (synthwave / retrowave)

Instruments (the classic Juno / Jupiter / DX7 / LinnDrum sound):

- **Bass**: 16th note "octave" or arpeggiated bass, 2 detuned saws (or saw + square sub), lowpass with a fast filter envelope, short decay, slight sidechain ducking from the kick. This one pattern carries 80% of the genre.
- **Pad**: 3 to 7 saws detuned by a few cents (supersaw / Juno chorus), slow attack (0.3 to 1 s), lowpass around 1.5 to 3 kHz, stereo spread, chorus, big reverb.
- **Arp**: square or pulse wave, 16ths through the chord tones (up, up-down, random from seed), with 3/16 ("8n.") ping-pong delay.
- **Lead**: saw or pulse with vibrato (5 to 6 Hz after a delay), portamento, delay plus reverb. Only in the second half or every other loop, to leave space.
- **Drums**: kick (sine with pitch drop 150 -> 45 Hz), snare with **gated reverb** (noise + 180 to 200 Hz tone into a dense reverb cut after about 250 ms), closed hats on 8ths or 16ths, open hat on off-beats, optional toms fill on bar 8 and claps on 2 and 4.
- Master: gentle bus compression, tape-like soft saturation, a light lowpass or "VHS" wow and flutter (seeded, loop periodic) to match the `VhsOverlay` look.

Harmony that always sounds good:

- Natural minor (Aeolian) or Dorian, roots from A to E (A minor, F# minor, C# minor are very typical). Keep everything diatonic so random choices never clash.
- Proven 4 chord loops (minor key degrees): `i - VI - III - VII` (Am F C G), `i - VI - VII - i`, `i - iv - VI - V`, `VI - VII - i - i`, `i - VII - VI - VII`. Pick one from a curated list with the seed, 2 bars per chord over 8 bars, or 1 bar per chord repeated twice.
- Add color by voicing, not by random notes: add9 and sus2 on pads, octave doubling, inversions chosen to minimize voice movement.
- Melody: notes from the chord (strong beats) plus passing notes from the minor pentatonic (weak beats), phrase of 2 bars as "call" and 2 bars as "answer" (repeat with a different ending), rhythm drawn from a small library of seeded rhythm cells.
- Variety from the seed: key, progression, BPM within a safe set (fits the loop, see 6), bass pattern (octave, arp up, arp up-down, root-fifth), arp rate and pattern, hat density, lead on or off, drum fill style, pad brightness, delay time (8n., 16n.), reverb size, detune amount. Use **curated choices** (pick from lists of known good options) rather than continuous random values, that keeps every seed musical.
- Moods mapped to themes: `sunset` = brighter, major-ish (Dorian, `VI - VII - i`), `moon` / night drive = darker, slower, more reverb. Future: per subject accent (tech, music, electronics, art from the TODO list) mapped to a mood preset.
- Arrangement for a 20 s loop: no intro or outro (it loops). Keep energy flat-ish, add movement with a filter sweep over 8 bars that returns to start, and one drum fill in bar 8 leading back into bar 1. For intros and "starting soon" loops, the same score generator can produce longer forms (A A B A, 16 or 32 bars) with filter build-ups and drops.

## 8. Sync with visuals

Two ways, both deterministic:

1. **From the score (recommended).** The score is data: `{ bpm, bars, events: [{ type: "kick", time }, ...] }`. Visual components receive the score (or helpers) and compute, at `t = frame / fps`:
   - `kickEnvelope(t)`: time since last kick -> `exp(-dt * 8)`, drives the sun glow or scale, bloom intensity, grid line brightness.
   - `beatPhase(t)`, `barPhase(t)`: for slow pulsing, camera bob, scanline wobble, all perfectly aligned and periodic over the loop.
   - snare -> grid flash or chromatic aberration burst, chord change -> sky color shift, lead notes -> stars twinkle.
   - No decode, no FFT, no async, available even before the audio is generated, exact timing (no FFT window smearing).
2. **From the audio data.** `useMusic` returns a `MediaUtilsAudioData` built from the generated arrays, so `visualizeAudio({ audioData, frame, fps, numberOfSamples: 64 })` works synchronously (tested with a hand built object in Node). Good for "spectrum shaped mountains" (audio-reactive terrain in the TODO list). For an external audio file, use `useWindowedAudioData` + `visualizeAudio` on a `staticFile()` (docs: https://www.remotion.dev/docs/visualize-audio, https://www.remotion.dev/docs/use-windowed-audio-data).

A mix is natural: kick and snare events from the score for punchy, exact hits, and spectrum data for the terrain shape.

## 9. What was verified by running code

All PoC code lives outside the repo, in `/tmp/music-poc.WRn0uO/` (temp dir from `mktemp -d`, Node v26.3.1, Linux x64).

1. **Pure JS seeded synth -> WAV in Node** (`pure-synth.mjs`, no deps): 96 BPM, 8 bars = exactly 20 s at 48 kHz (960000 samples), bass arp, detuned pad, lead, kick, snare, hats, ping-pong delay, 3 loops rendered and loop 2 kept.
   - Same seed twice: **byte identical** WAV (sha256 equal). Different seed: different file.
   - After the noise table fix: **loop 2 and loop 3 bit identical** (max diff 0), so the loop seam is exact.
   - Speed: 60 s of audio (3 loops) rendered in about 0.6 s.
2. **Tone.js 15.1.22 in Node with node-web-audio-api 2.2.0** (`tone-node.mjs`): works only after setting `globalThis.self`, `window`, `isSecureContext = true` and copying the API onto globals. Without seeding: 3 runs, 3 different files (Noise uses `Math.random`). With a seeded `Math.random`: still not identical while `Freeverb` (AudioWorklet) is used, and a `DataCloneError` is logged. With seeded `Math.random` and no worklet effect: **5 runs byte identical**.
3. **Real Remotion 4.0.545 renders** (`rem/`, minimal project, `pnpm exec remotion render ... out.wav`, 4 s comps, concurrency 8x), each comp rendered twice:
   - Plain `OfflineAudioContext` generated in a component with `delayRender`, blob URL into `@remotion/media` `<Audio>`: renders, **identical** across 2 renders, about 45 ms generation per tab.
   - Tone.js `Tone.Offline()` in the component (seeded `Math.random`, no worklet): **identical** across 2 renders, about 160 ms per tab.
   - Tone.js with `Freeverb`: **not identical** (max 1 LSB, 8756 of 384000 samples differ), about 500 ms per tab.
   - Pure JS samples -> WAV blob: **identical** across 2 renders, and the rendered WAV matches a Node computation of the same samples (3 samples off by 1 LSB): the Remotion audio path is practically transparent.
   - Data URL returned from `calculateMetadata`: works, generated once, same audio as the blob variant, but the render took about 10.5 s instead of about 5 s.
   - Logs show the in-component generation runs once per render tab (8 times with 8x concurrency).
4. **Remotion Studio**: opened the Tone.js comp in Studio, the audio was generated (about 400 ms), the timeline showed an `<Audio>` track labeled "Blob URL" with a waveform, and playback ran at 30 fps. Audible playback was not checked (headless). A harmless Tone.js warning appears ("The AudioContext was not allowed to start"): the global real time context, not the offline one.
5. **`visualizeAudio()` with a hand built `MediaUtilsAudioData`** (Float32 arrays, no fetch): returns frequency data, non zero during a 60 Hz tone and zero in silence.

Not tested: full 20 s compositions inside this repo, MP4/AAC seam behavior, Elementary Audio, Lambda rendering, the Player, a real reverb implementation in pure JS (the PoC only has a delay).

## 10. Open questions and risks

- **Sound quality of a home made synth**: naive saws alias (audible on high leads). Use polyBLEP oscillators, oversampling for saturation, and a decent reverb (Freeverb or FDN port, about 100 lines). Budget time for sound design, it is the real work.
- **Generation time for 20 s or longer pieces**: pure JS renders roughly 100x faster than real time in Node in the PoC, but a richer engine (many voices, reverb) can be 5 to 10x slower. It runs once per render tab and must stay under the `delayRender` timeout (30 s default, configurable). For long pieces (intros, 5 min "starting soon" loops), prefer a pre-render script writing `public/music/<seed>.wav`, or run generation in a Web Worker.
- **Studio responsiveness**: generation runs in a Web Worker (`music.worker.ts`), so changing the seed no longer freezes the Studio.
- **Blob URL lifetime**: revoke old URLs on seed change (hook cleanup), keep the URL alive while the component is mounted.
- **Html5Audio fallback**: a blob URL that `@remotion/media` cannot decode would fall back to `<Html5Audio>` and fail in render (Node cannot fetch `blob:`). Use `disallowFallbackToHtml5Audio`.
- **Client side rendering** (`@remotion/web-renderer`) and Lambda: not tested. Lambda would regenerate audio in every Lambda function (fine if cheap).
- **Bundle size**: Tone.js full build is 337 kB minified (80 kB gzip), pure TS adds almost nothing.
- **Upgrades**: any Web Audio based approach can change bytes when Remotion upgrades Chrome Headless Shell. Pure JS is immune (except V8 Math changes, unlikely).
- **Loudness**: aim for about -14 LUFS for YouTube/Twitch; a fixed master gain plus soft clip is enough for a background loop. Could be measured with `ffmpeg -af ebur128` in a check script.
- **Musical taste**: a curated list of progressions, patterns and presets is the key to "always sounds good". Expect several iterations of listening to random seeds.
- **Licensing**: generated music is fully original, no sample licensing issue (no samples used).

## 11. Sources

Remotion docs (fetched November 2026):

- `<Audio>` from `@remotion/media`: https://www.remotion.dev/docs/media/audio
- `<Html5Audio>`: https://www.remotion.dev/docs/html5-audio
- `audioBufferToDataUrl()`: https://www.remotion.dev/docs/audio-buffer-to-data-url
- `calculateMetadata()`: https://www.remotion.dev/docs/calculate-metadata
- `prefetch()` (blob URL and base64 modes): https://www.remotion.dev/docs/prefetch
- `delayRender()`: https://www.remotion.dev/docs/delay-render
- `useWindowedAudioData()`: https://www.remotion.dev/docs/use-windowed-audio-data
- `visualizeAudio()`: https://www.remotion.dev/docs/visualize-audio
- Local sources read: `node_modules/remotion/dist/cjs/CompositionManager.d.ts` (`InlineAudioAsset`), `node_modules/@remotion/renderer/dist/assets/download-and-map-assets-to-file.js` (data URL support), `node_modules/@remotion/media-utils/dist/audio-buffer/audio-url-helpers.js`, `node_modules/@remotion/media-utils/dist/types.d.ts` (`MediaUtilsAudioData`)

Other:

- Tone.js `Offline()`: https://tonejs.github.io/docs/15.1.22/functions/Offline.html
- node-web-audio-api: https://github.com/ircam-ismm/node-web-audio-api
- Elementary Audio offline renderer: https://elementary.audio/docs/packages/offline-renderer
- MDN `OfflineAudioContext`: https://developer.mozilla.org/docs/Web/API/OfflineAudioContext
