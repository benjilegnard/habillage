import React, { useEffect, useMemo } from "react";
import { random } from "remotion";
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import { hex } from "../colors";
import { FAR_MOUNTAINS_DISTANCE, SUN_RADIUS } from "./config";
import { smoothstep } from "./heightmap";

const HALF_WIDTH = 700;
const STEP = 6;
const CLEAR_HALF_WIDTH = SUN_RADIUS * 0.9; // nothing in front of the sun
const MAX_HEIGHT = 34;

// Static mountain range on the horizon, flat in the center
const buildProfile = (seed: string) => {
  const count = Math.floor((HALF_WIDTH * 2) / STEP) + 1;
  const raw = Array.from({ length: count }, (_, i) =>
    random(`${seed}-far-${i}`),
  );
  // Smooth a bit, keep some sharp peaks
  const smooth = raw.map((v, i) => {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(count - 1, i + 1)];
    return 0.5 * v + 0.25 * (prev + next);
  });
  return smooth.map((v, i) => {
    const x = -HALF_WIDTH + i * STEP;
    const side = smoothstep(
      CLEAR_HALF_WIDTH,
      CLEAR_HALF_WIDTH + 80,
      Math.abs(x),
    );
    return new Vector3(x, side * MAX_HEIGHT * (0.25 + v * v), 0);
  });
};

export const FarMountains: React.FC<{ seed: string }> = ({ seed }) => {
  const { fill, outline } = useMemo(() => {
    const points = buildProfile(seed);
    const shape = new Shape();
    shape.moveTo(-HALF_WIDTH, -1);
    for (const p of points) {
      shape.lineTo(p.x, p.y);
    }
    shape.lineTo(HALF_WIDTH, -1);
    shape.closePath();
    return {
      fill: new ShapeGeometry(shape),
      outline: new Line(
        new BufferGeometry().setFromPoints(points),
        new LineBasicMaterial({ color: hex("mauve"), fog: false }),
      ),
    };
  }, [seed]);

  useEffect(() => {
    return () => {
      fill.dispose();
      outline.geometry.dispose();
      outline.material.dispose();
    };
  }, [fill, outline]);

  return (
    <group position={[0, 0, -FAR_MOUNTAINS_DISTANCE]}>
      <mesh geometry={fill}>
        <meshBasicMaterial color={hex("crust")} fog={false} />
      </mesh>
      <primitive object={outline} />
    </group>
  );
};
