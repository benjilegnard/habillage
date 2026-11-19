import React from "react";
import {
  AbsoluteFill,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { rgba } from "../theme/colors";

export type VhsOverlayProps = {
  // Each effect can be turned off. Numbers are opacities (0 to 1).
  scanlines?: number | false;
  trackingBand?: boolean;
  // Number of times the band rolls over the screen during the composition.
  // Keep it an integer for looping videos.
  trackingCycles?: number;
  flicker?: number | false;
  vignette?: number | false;
};

// 80's VHS look on top of the image: scanlines, vignette,
// a rolling tracking band and a light flicker
export const VhsOverlay: React.FC<VhsOverlayProps> = ({
  scanlines = 0.28,
  trackingBand = true,
  trackingCycles = 3,
  flicker = 0.04,
  vignette = 0.75,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const trackingY =
    (((frame / durationInFrames) * trackingCycles) % 1) * 130 - 15;
  const flickerAlpha =
    flicker === false
      ? 0
      : flicker * 0.75 + random(`flicker-${frame}`) * flicker;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {scanlines !== false ? (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom,
              transparent 0px, transparent 2px,
              ${rgba("crust", scanlines)} 2px, ${rgba("crust", scanlines)} 4px)`,
          }}
        />
      ) : null}
      {trackingBand ? (
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
      ) : null}
      {flickerAlpha > 0 ? (
        <AbsoluteFill style={{ backgroundColor: rgba("text", flickerAlpha) }} />
      ) : null}
      {vignette !== false ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at center,
              transparent 55%, ${rgba("crust", vignette)} 100%)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
