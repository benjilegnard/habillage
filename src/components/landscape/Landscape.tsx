import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { hex } from "../../theme/colors";
import { LandscapeTheme } from "../../theme/landscape";
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

/**
 * Synthwave landscape: sky, sun on the horizon and a grid terrain moving
 * towards it. Loops over the duration of the composition.
 */
export const Landscape: React.FC<{
  seed: string;
  theme: LandscapeTheme;
}> = ({ seed, theme }) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      <Sky seed={seed} theme={theme.sky} />
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
        <Sun theme={theme.sun} />
        <FarMountains seed={seed} outline={theme.farMountainsOutline} />
        {/* Flat ground from the end of the terrain to the horizon */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -1000]}>
          <planeGeometry args={[4000, 2000]} />
          <meshBasicMaterial color={hex("crust")} />
        </mesh>
        <Terrain seed={seed} colors={theme.grid} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
