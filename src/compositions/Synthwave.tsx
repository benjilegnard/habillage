import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { Landscape } from "../components/landscape/Landscape";
import { Music } from "../components/Music";
import { VhsOverlay } from "../components/VhsOverlay";
import { hitEnvelope } from "../music/events";
import { useMusic } from "../music/useMusic";
import { hex } from "../theme/colors";
import { landscapeThemes } from "../theme/landscape";

export const synthwaveSchema = z.object({
  seed: z.string(),
  theme: z.enum(["sunset", "moon"]),
  // Seeded procedural music (same seed as the landscape, mood from the theme)
  music: z.boolean(),
});

export type SynthwaveProps = z.infer<typeof synthwaveSchema>;

// Looping synthwave landscape with the VHS look and its music
export const Synthwave: React.FC<SynthwaveProps> = ({ seed, theme, music }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { score, src } = useMusic(seed, theme, music);

  // The sun halo pulses on each kick drum, read from the score
  const pulse = music ? hitEnvelope(score, "kick", frame / fps, 6) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: hex("crust") }}>
      <AbsoluteFill style={{ filter: "blur(0.4px) saturate(1.15)" }}>
        <Landscape seed={seed} theme={landscapeThemes[theme]} pulse={pulse} />
      </AbsoluteFill>
      <VhsOverlay />
      {music ? <Music src={src} /> : null}
    </AbsoluteFill>
  );
};
