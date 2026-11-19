# BenjiLeGnard's habillage

Vid and assets generator for [BenjiLeGnard]()'s channels.

YouTube: <https://www.youtube.com/@benjilegnard>
Twitch: <https://www.twitch.tv/benjilegnard>

## Rules

- All colors come from [Catppuccin Mocha](https://github.com/catppuccin/palette).
- Follow a synthwave / neon / cyberpunk aesthetic.

## Videos

### Synthwave landscape

A looping 1920x1080 video (20 s at 30 fps) of a 3D synthwave landscape, made with [Remotion](https://remotion.dev) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber).
- The camera moves slowly over a grid terrain towards a setting sun.
- The terrain is flat in front of the camera, with mountains on both sides. Mountain heights come from the `seed` prop (change it in the Studio).
- Settings (speed, terrain size, sun, camera) are in `src/components/landscape/config.ts`.
- The `theme` prop selects a color set from `src/theme/landscape.ts`: `sunset` (striped sun) or `moon`.

Compositions:

| Id | Type | Size | Script |
|---|---|---|---|
| `Synthwave` | 20 s loop | 1920x1080 | `npm run build` |
| `SynthwaveMoon` | 20 s loop | 1920x1080 | `npm run build:moon` |
| `SynthwaveThumbnail` | still image | 1280x720 | `npm run build:thumbnail` |

## Music

Each `Synthwave` composition has its own seeded synthwave music loop, generated in the browser at render time (no audio file, no dependency). Same `seed` as the landscape, mood from the `theme` (`sunset`: four on the floor, `moon`: half-time, darker). Set the `music` prop to `false` to disable it.

- 96 BPM, 8 bars = exactly 20 s: the music loops with the video, with no click at the loop point.
- The same seed always gives the same track (byte identical).
- The sun halo pulses on each kick drum, read from the score (`src/music/events.ts`).
- To listen to a seed or export it as a file: `npm run music -- <seed> [sunset|moon] [--check]` writes `public/music/<seed>-<mood>.wav` (`--check` verifies determinism and the loop seam).

Code in `src/music/`: `score.ts` (seed -> notes), `instruments.ts` and `dsp.ts` (synthesis), `fx.ts` (delay, reverb), `render.ts` (mix), `wav.ts`, `useMusic.ts` (React hook). Research notes: `MUSIC.md`.

## Project structure

- `src/Root.tsx`: list of all compositions, grouped in folders (Backgrounds, Images).
- `src/compositions/`: one file per video or image, built from the shared components.
- `src/components/`: reusable parts (`VhsOverlay`, `landscape/` with `Landscape`, `Terrain`, `Sun`, `Sky`, `FarMountains`).
- `src/theme/`: Catppuccin Mocha colors and color sets (themes).
- `src/music/`: procedural music engine. `src/components/Music.tsx` plays it.
- `scripts/render-music.ts`: renders a seed to a WAV file (`npm run music`).

To add a video: create a component in `src/compositions/`, then register it in `src/Root.tsx` with `<Composition>` (video) or `<Still>` (image).

Without a GPU (for example in a VM or CI), add `-- --gl=swangle` to the render scripts.

## Commands

### Install Dependencies

```console
npm i
```

### Start Preview

```console
npm start
```
### Render MP4 video

```console
npm run build
```

### Upgrade Remotion

```console
npm run upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/JonnyBurger/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

The content of this template is licensed under MIT.
