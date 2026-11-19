import React, { useEffect, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InterleavedBufferAttribute,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { hex } from "../../theme/colors";
import { LandscapeTheme } from "../../theme/landscape";
import {
  CELL_SIZE,
  FAR_FADE_END,
  FAR_FADE_START,
  GRID_LINE_WIDTH,
  MOUNTAIN_MAX_HEIGHT,
  TERRAIN_COLS,
  TERRAIN_NEAR_Z,
  TERRAIN_ROWS,
} from "./config";
import { generateHeightmap, smoothstep } from "./heightmap";

const VERTEX_COUNT = TERRAIN_ROWS * TERRAIN_COLS;

const buildGeometries = (width: number, height: number) => {
  const position = new BufferAttribute(new Float32Array(VERTEX_COUNT * 3), 3);
  const colors = new Float32Array(VERTEX_COUNT * 3);

  const triangles: number[] = [];
  const segments: number[] = [];
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const a = r * TERRAIN_COLS + c;
      if (c < TERRAIN_COLS - 1) {
        segments.push(a, a + 1);
      }
      if (r < TERRAIN_ROWS - 1) {
        segments.push(a, a + TERRAIN_COLS);
      }
      if (c < TERRAIN_COLS - 1 && r < TERRAIN_ROWS - 1) {
        const b = a + 1;
        const d = a + TERRAIN_COLS;
        triangles.push(a, d, b, b, d, d + 1);
      }
    }
  }

  const surface = new BufferGeometry();
  surface.setAttribute("position", position);
  surface.setIndex(triangles);

  // Fat lines (constant width in pixels). Buffers are allocated once here,
  // then updated in place every frame.
  const gridGeometry = new LineSegmentsGeometry();
  gridGeometry.setPositions(new Float32Array(segments.length * 3));
  gridGeometry.setColors(new Float32Array(segments.length * 3));
  const material = new LineMaterial({
    vertexColors: true,
    linewidth: GRID_LINE_WIDTH,
    fog: true,
  });
  material.resolution.set(width, height);
  const grid = new LineSegments2(gridGeometry, material);
  grid.frustumCulled = false;

  return {
    surface,
    grid,
    position,
    colors,
    segments: Uint32Array.from(segments),
  };
};

const interleavedArray = (geometry: LineSegmentsGeometry, name: string) =>
  (geometry.getAttribute(name) as InterleavedBufferAttribute).data;

export const Terrain: React.FC<{
  seed: string;
  colors: LandscapeTheme["grid"];
}> = ({ seed, colors: gridColors }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const heights = useMemo(() => generateHeightmap(seed), [seed]);
  const geometries = useMemo(
    () => buildGeometries(width, height),
    [width, height],
  );

  useEffect(() => {
    return () => {
      geometries.surface.dispose();
      geometries.grid.geometry.dispose();
      geometries.grid.material.dispose();
    };
  }, [geometries]);

  // The camera travels exactly one heightmap period during the video.
  // The mesh moves by less than a cell, then jumps back while the heightmap
  // shifts by one row: both states are identical, so the motion is seamless.
  const distance = (frame / durationInFrames) * TERRAIN_ROWS * CELL_SIZE;
  const shift = Math.floor(distance / CELL_SIZE);
  const offset = distance - shift * CELL_SIZE;

  // Grid line colors, from the flat floor to the mountain peaks
  const [low, mid, high] = useMemo(
    () => gridColors.map((name) => new Color(hex(name))),
    [gridColors],
  );

  useMemo(() => {
    const { position, colors, segments, surface, grid } = geometries;
    const halfWidth = ((TERRAIN_COLS - 1) / 2) * CELL_SIZE;
    const tmp = new Color();

    for (let r = 0; r < TERRAIN_ROWS; r++) {
      const z = TERRAIN_NEAR_Z - r * CELL_SIZE + offset;
      const fade = 1 - smoothstep(FAR_FADE_START, FAR_FADE_END, -z);
      const source = ((r + shift) % TERRAIN_ROWS) * TERRAIN_COLS;

      for (let c = 0; c < TERRAIN_COLS; c++) {
        const i = r * TERRAIN_COLS + c;
        const y = heights[source + c] * fade;
        position.setXYZ(i, c * CELL_SIZE - halfWidth, y, z);

        const t = Math.min(1, y / MOUNTAIN_MAX_HEIGHT);
        if (t < 0.35) {
          tmp.lerpColors(low, mid, smoothstep(0, 0.35, t));
        } else {
          tmp.lerpColors(mid, high, smoothstep(0.35, 1, t));
        }
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
    }
    position.needsUpdate = true;
    surface.computeBoundingSphere();

    // Copy vertex data to the line segments (start and end of each segment)
    const segmentPositions = interleavedArray(grid.geometry, "instanceStart");
    const segmentColors = interleavedArray(grid.geometry, "instanceColorStart");
    const vertices = position.array as Float32Array;
    for (let s = 0; s < segments.length; s++) {
      const v = segments[s] * 3;
      for (let k = 0; k < 3; k++) {
        segmentPositions.array[s * 3 + k] = vertices[v + k];
        segmentColors.array[s * 3 + k] = colors[v + k];
      }
    }
    segmentPositions.needsUpdate = true;
    segmentColors.needsUpdate = true;
  }, [geometries, heights, shift, offset, low, mid, high]);

  return (
    <group>
      <mesh geometry={geometries.surface}>
        {/* Pushed back a little so the grid lines are always drawn on top */}
        <meshBasicMaterial
          color={hex("crust")}
          side={DoubleSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <primitive object={geometries.grid} />
    </group>
  );
};
