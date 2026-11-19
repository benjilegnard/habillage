import React, { useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CanvasTexture, SRGBColorSpace } from "three";
import { hex, rgba } from "../colors";
import { SUN_DISTANCE, SUN_RADIUS } from "./config";

const TEXTURE_SIZE = 1024;
const STRIPE_COUNT = 7;
// How many stripes scroll by during the whole video (integer, for the loop)
const STRIPE_CYCLES = 10;

const createTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { canvas, texture };
};

const drawSun = (canvas: HTMLCanvasElement, phase: number) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const size = TEXTURE_SIZE;
  ctx.clearRect(0, 0, size, size);

  // Disc with a yellow > orange > red vertical gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, hex("yellow"));
  gradient.addColorStop(0.25, hex("peach"));
  gradient.addColorStop(0.6, hex("red"));
  gradient.addColorStop(1, hex("maroon"));
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

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

const createGlow = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, rgba("peach", 0.5));
    gradient.addColorStop(0.35, rgba("red", 0.3));
    gradient.addColorStop(0.65, rgba("mauve", 0.1));
    gradient.addColorStop(1, rgba("mauve", 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

export const Sun: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const sun = useMemo(createTexture, []);
  const glow = useMemo(createGlow, []);

  useEffect(() => {
    return () => {
      sun.texture.dispose();
      glow.dispose();
    };
  }, [sun, glow]);

  const phase = ((frame / durationInFrames) * STRIPE_CYCLES) % 1;
  useMemo(() => {
    drawSun(sun.canvas, phase);
    sun.texture.needsUpdate = true;
  }, [sun, phase]);

  // Slightly above the ground: the bottom of the sun sets behind the horizon
  const y = SUN_RADIUS * 0.4;

  return (
    <group position={[0, y, -SUN_DISTANCE]}>
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[SUN_RADIUS * 5, SUN_RADIUS * 5]} />
        <meshBasicMaterial
          map={glow}
          transparent
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[SUN_RADIUS * 2, SUN_RADIUS * 2]} />
        <meshBasicMaterial map={sun.texture} transparent fog={false} />
      </mesh>
    </group>
  );
};
