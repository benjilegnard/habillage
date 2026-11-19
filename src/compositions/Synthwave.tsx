import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { Landscape } from "../components/landscape/Landscape";
import { VhsOverlay } from "../components/VhsOverlay";
import { hex } from "../theme/colors";
import { landscapeThemes } from "../theme/landscape";

export const synthwaveSchema = z.object({
  seed: z.string(),
  theme: z.enum(["sunset", "moon"]),
});

export type SynthwaveProps = z.infer<typeof synthwaveSchema>;

// Looping synthwave landscape with the VHS look
export const Synthwave: React.FC<SynthwaveProps> = ({ seed, theme }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: hex("crust") }}>
      <AbsoluteFill style={{ filter: "blur(0.4px) saturate(1.15)" }}>
        <Landscape seed={seed} theme={landscapeThemes[theme]} />
      </AbsoluteFill>
      <VhsOverlay />
    </AbsoluteFill>
  );
};
