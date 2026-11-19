import React from "react";
import {
  AbsoluteFill,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { rgba } from "../colors";

// Number of times the tracking band rolls over the screen (integer, for the loop)
const TRACKING_CYCLES = 3;

// 80's VHS look on top of the image: scanlines, vignette,
// a rolling tracking band and a light flicker
export const VhsOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const trackingY =
    (((frame / durationInFrames) * TRACKING_CYCLES) % 1) * 130 - 15;
  const flicker = 0.03 + random(`flicker-${frame}`) * 0.04;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom,
            transparent 0px, transparent 2px,
            ${rgba("crust", 0.28)} 2px, ${rgba("crust", 0.28)} 4px)`,
        }}
      />
      {/* Tracking band */}
      <AbsoluteFill
        style={{
          top: `${trackingY}%`,
          height: "6%",
          background: `linear-gradient(to bottom,
            transparent, ${rgba("text", 0.06)} 40%,
            ${rgba("lavender", 0.1)} 50%, transparent)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Flicker */}
      <AbsoluteFill style={{ backgroundColor: rgba("text", flicker) }} />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center,
            transparent 55%, ${rgba("crust", 0.75)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
