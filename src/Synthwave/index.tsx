import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { z } from "zod";
import { hex } from "../colors";
import {
  CAMERA_FOV,
  CAMERA_HEIGHT,
  CAMERA_PITCH,
  FOG_FAR,
  FOG_NEAR,
} from "./config";
import { FarMountains } from "./FarMountains";
import { Sky } from "./Sky";
import { Sun } from "./Sun";
import { Terrain } from "./Terrain";
import { VhsOverlay } from "./VhsOverlay";

export const synthwaveSchema = z.object({
  seed: z.string(),
});

export const Synthwave: React.FC<z.infer<typeof synthwaveSchema>> = ({
  seed,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: hex("crust") }}>
      <AbsoluteFill style={{ filter: "blur(0.4px) saturate(1.15)" }}>
        <Sky seed={seed} />
        <ThreeCanvas
          width={width}
          height={height}
          // No tone mapping: keep the exact palette colors
          flat
          camera={{
            fov: CAMERA_FOV,
            near: 0.1,
            far: 2000,
            position: [0, CAMERA_HEIGHT, 0],
            rotation: [CAMERA_PITCH, 0, 0],
          }}
        >
          <fog attach="fog" args={[hex("crust"), FOG_NEAR, FOG_FAR]} />
          <Sun />
          <FarMountains seed={seed} />
          {/* Flat ground from the end of the terrain to the horizon */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -1000]}>
            <planeGeometry args={[4000, 2000]} />
            <meshBasicMaterial color={hex("crust")} />
          </mesh>
          <Terrain seed={seed} />
        </ThreeCanvas>
      </AbsoluteFill>
      <VhsOverlay />
    </AbsoluteFill>
  );
};
