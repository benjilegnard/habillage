# TODO list

Ideas of videos and assets in the same synth / cyber style as the `Synthwave` composition.
Artistic direction for tech-oriented YouTube and Twitch channels, also covering music, art and electronics subjects.

## Shared building blocks (do first)

- [x] `<VhsOverlay>`: already isolated, make it configurable (scanlines, tracking band, flicker, vignette)
- [x] `<Sun variant="sun" | "moon">` with palette accents
- [ ] `<GridTerrain heightSource="seed" | "audio" | "pcb">`
- [ ] `<NeonText>` for titles (glow, flicker, chromatic split)
- [ ] `theme.ts`: map each subject (tech, music, electronics, art) to its Mocha accent color

## Stream and channel essentials

- [ ] **"Starting soon" / "Be right back" / "Ending" loops**: the current landscape with a big title and a countdown. At the end, the camera reverses and moves away from the sun.
- [ ] **Intro sting (5 to 8 s)**: fast flight over the grid, the sun rises, then the logo appears with a chromatic glitch and a VHS tracking jump.
- [ ] **Outro / end screen**: the scene slows down and frosted panels appear in the sky for the "next video" and "subscribe" areas, sized for YouTube end screens.
- [ ] **Lower thirds and alerts**: neon frames for follow/sub/raid alerts, with a scanline sweep and a short 3D grid behind. Render as transparent WebM or ProRes 4444.
- [ ] **Webcam frame**: a CRT-style rounded bezel with a light glow, a "REC" dot and a VHS timestamp (`PLAY ▶ 1984-11-19`).
- [ ] **Channel banner and avatar**: still renders of the scene at YouTube/Twitch sizes. For the avatar, the sun alone with its stripes and an initial.

## Variants of the landscape

- [ ] **Night drive**: the camera follows a straight neon road with lane lines and light poles passing by, and a city skyline on the horizon instead of mountains.
- [ ] **Seasons and moods by palette accent**: same scene, but one accent color changes per series: teal/sky for tech, green for electronics, pink/mauve for music, peach/yellow for art.
- [x] **Moon variant**: a lavender/blue moon and more stars, for late-night streams (`SynthwaveMoon`).
- [ ] **Ocean grid**: a sine-wave grid sea instead of mountains, with the sun reflected as stripes on the water.
- [ ] **Tunnel**: the grid wrapped into a cylinder, giving fast forward motion. Good for transitions.
- [ ] **Wireframe city**: seeded building blocks on both sides instead of mountains, with windows that blink.
- [ ] **Assembly line**: mechanical robotic arms on each side of the road assembling squared things.

## Music subjects

- [ ] **Audio-reactive terrain**: the mountain heights follow the audio spectrum (`@remotion/media-utils` `visualizeAudio`), and the sun pulses on the kick.
- [ ] **Waveform horizon**: the far mountain line becomes the song's waveform, scrolling with playback.
- [ ] **Synth panel overlay**: animated knobs, faders and a step sequencer grid lighting up in time with a MIDI file. Good for "how I made this track" videos.
- [ ] **Cassette / vinyl loop**: a spinning 3D tape or record in neon wireframe, with track title cards for playlists.

## Electronics subjects

- [ ] **Animated PCB**: a seeded circuit board on the ground plane instead of the grid, with signals (light pulses) moving along the traces toward the sun.
- [ ] **Oscilloscope scene**: a CRT screen with a green phosphor trace (Lissajous figures, sine and square waves) for explainer segments.
- [ ] **Component reveal cards**: a chip, resistor or microcontroller turning in wireframe, with a spec sheet typed out in monospace text.
- [ ] **Schematic draw-on**: a circuit diagram drawn stroke by stroke in neon, for tutorials.

## Tech and code subjects

- [ ] **Terminal title cards**: a CRT terminal that types the video title, with a cursor blink and a glitch on enter.
- [ ] **Code highlight scenes**: code blocks in Catppuccin Mocha syntax colors floating in 3D over the grid, with lines highlighted one by one.
- [ ] **Data and charts**: bar charts and line charts built as neon extrusions on the grid, for benchmarks or stats.
- [ ] **Topic transitions**: a 1 s glitch and grid-tunnel wipe between chapters, with the chapter name.

## Art subjects

- [ ] **Generative gallery**: each seed produces a different landscape. Show a grid of 9 seeds as "prints", or one per stream as a collectible "landscape of the day".
- [ ] **Drawing timelapse frame**: a neon-bordered canvas area with the scene behind it, for art streams.
- [ ] **Poster series**: still renders with typography in a retro font ("NEON VALLEY", "CIRCUIT SUNSET"), also usable as merch or thumbnails.
