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
- Settings (speed, terrain size, sun, camera) are in `src/Synthwave/config.ts`.

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
