import React, { useMemo } from "react";
import {
  AbsoluteFill,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { hex, rgba } from "../../theme/colors";
import { LandscapeTheme } from "../../theme/landscape";
import { HORIZON_RATIO } from "./config";

// Background behind the 3D canvas: gradient and twinkling stars
export const Sky: React.FC<{
  seed: string;
  theme: LandscapeTheme["sky"];
}> = ({ seed, theme }) => {
  const { starCount, starColors } = theme;
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const horizon = HORIZON_RATIO * 100;

  const stars = useMemo(
    () =>
      Array.from({ length: starCount }, (_, i) => ({
        x: random(`${seed}-star-x-${i}`) * width,
        // Denser near the top, fading out before the horizon
        y:
          Math.pow(random(`${seed}-star-y-${i}`), 1.6) *
          height *
          HORIZON_RATIO *
          0.85,
        size: 1 + random(`${seed}-star-size-${i}`) * 2,
        color:
          starColors[
            Math.floor(random(`${seed}-star-c-${i}`) * starColors.length)
          ],
        // Integer number of twinkles over the video, for the loop
        speed: 1 + Math.floor(random(`${seed}-star-s-${i}`) * 6),
        phase: random(`${seed}-star-p-${i}`) * Math.PI * 2,
      })),
    [seed, width, height, starCount, starColors],
  );

  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom,
          ${hex("crust")} 0%,
          ${hex("base")} ${horizon * 0.45}%,
          ${hex("surface0")} ${horizon * 0.75}%,
          ${rgba(theme.horizonGlow, 0.6)} ${horizon * 0.94}%,
          ${rgba(theme.horizon, 0.85)} ${horizon * 0.995}%,
          ${hex(theme.horizon)} ${horizon}%,
          ${hex("crust")} ${horizon}%)`,
      }}
    >
      {stars.map((star, i) => {
        const twinkle =
          0.55 +
          0.45 * Math.sin(progress * Math.PI * 2 * star.speed + star.phase);
        const fade = 1 - star.y / (height * HORIZON_RATIO);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              backgroundColor: hex(star.color),
              boxShadow: `0 0 ${star.size * 3}px ${rgba(star.color, 0.8)}`,
              opacity: twinkle * fade,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
