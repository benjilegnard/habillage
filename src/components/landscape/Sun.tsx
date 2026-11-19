import React, { useEffect, useMemo } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { CanvasTexture, SRGBColorSpace } from "three";
import { hex, rgba } from "../../theme/colors";
import { LandscapeTheme } from "../../theme/landscape";
import { SUN_DISTANCE, SUN_RADIUS } from "./config";

type SunTheme = LandscapeTheme["sun"];

const TEXTURE_SIZE = 1024;
const STRIPE_COUNT = 7;
// How many stripes scroll by during the whole video (integer, for the loop)
const STRIPE_CYCLES = 10;
const CRATER_COUNT = 9;

const createCanvasTexture = (size: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { canvas, texture };
};

const drawDisc = (
  canvas: HTMLCanvasElement,
  theme: SunTheme,
  phase: number,
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const size = TEXTURE_SIZE;
  ctx.clearRect(0, 0, size, size);

  // Disc with a vertical gradient
  const [c0, c1, c2, c3] = theme.gradient;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, hex(c0));
  gradient.addColorStop(0.25, hex(c1));
  gradient.addColorStop(0.6, hex(c2));
  gradient.addColorStop(1, hex(c3));
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  if (theme.variant === "moon") {
    // A few soft craters, always at the same place
    ctx.globalCompositeOperation = "source-atop";
    for (let i = 0; i < CRATER_COUNT; i++) {
      const x = size * (0.2 + random(`crater-x-${i}`) * 0.6);
      const y = size * (0.15 + random(`crater-y-${i}`) * 0.5);
      const r = size * (0.03 + random(`crater-r-${i}`) * 0.07);
      ctx.fillStyle = rgba(c3, 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Horizontal cuts in the lower half, getting thicker towards the bottom
  // and slowly scrolling down
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "black";
  for (let i = -1; i < STRIPE_COUNT; i++) {
    const t = (i + phase) / STRIPE_COUNT;
    if (t < 0) {
      continue;
    }
    const y = size * (0.3 + 0.7 * t);
    const thickness = size * 0.07 * t;
    ctx.fillRect(0, y - thickness / 2, size, thickness);
  }
};

const drawGlow = (canvas: HTMLCanvasElement, theme: SunTheme) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const half = canvas.width / 2;
  const [inner, middle, outer] = theme.glow;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, rgba(inner, 0.5));
  gradient.addColorStop(0.35, rgba(middle, 0.3));
  gradient.addColorStop(0.65, rgba(outer, 0.1));
  gradient.addColorStop(1, rgba(outer, 0));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

// Sun (striped) or moon (plain, with craters) on the horizon, with a halo.
// `pulse` (0 to 1, e.g. on each kick drum) makes the halo grow and glow.
export const Sun: React.FC<{ theme: SunTheme; pulse?: number }> = ({
  theme,
  pulse = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const disc = useMemo(() => createCanvasTexture(TEXTURE_SIZE), []);
  const glow = useMemo(() => createCanvasTexture(512), []);

  useEffect(() => {
    return () => {
      disc.texture.dispose();
      glow.texture.dispose();
    };
  }, [disc, glow]);

  const phase = ((frame / durationInFrames) * STRIPE_CYCLES) % 1;
  useMemo(() => {
    drawDisc(disc.canvas, theme, phase);
    disc.texture.needsUpdate = true;
  }, [disc, theme, phase]);

  useMemo(() => {
    drawGlow(glow.canvas, theme);
    glow.texture.needsUpdate = true;
  }, [glow, theme]);

  // Slightly above the ground: the bottom of the sun sets behind the horizon
  const y = SUN_RADIUS * 0.4;

  return (
    <group position={[0, y, -SUN_DISTANCE]}>
      <mesh position={[0, 0, -1]} scale={1 + 0.12 * pulse}>
        <planeGeometry args={[SUN_RADIUS * 5, SUN_RADIUS * 5]} />
        <meshBasicMaterial
          map={glow.texture}
          transparent
          opacity={0.75 + 0.25 * pulse}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[SUN_RADIUS * 2, SUN_RADIUS * 2]} />
        <meshBasicMaterial map={disc.texture} transparent fog={false} />
      </mesh>
    </group>
  );
};
