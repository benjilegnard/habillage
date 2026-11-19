import { random } from "remotion";
import {
  CELL_SIZE,
  FLAT_HALF_WIDTH,
  MOUNTAIN_MAX_HEIGHT,
  MOUNTAIN_RAMP,
  TERRAIN_COLS,
  TERRAIN_ROWS,
} from "./config";

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// 3x3 box blur. Rows wrap around (the terrain must be periodic along its
// depth to loop), columns are clamped.
const blur = (src: Float32Array): Float32Array<ArrayBuffer> => {
  const out = new Float32Array(src.length);
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    for (let c = 0; c < TERRAIN_COLS; c++) {
      let sum = 0;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = (r + dr + TERRAIN_ROWS) % TERRAIN_ROWS;
        for (let dc = -1; dc <= 1; dc++) {
          const cc = Math.min(TERRAIN_COLS - 1, Math.max(0, c + dc));
          sum += src[rr * TERRAIN_COLS + cc];
        }
      }
      out[r * TERRAIN_COLS + c] = sum / 9;
    }
  }
  return out;
};

const normalize = (src: Float32Array): Float32Array<ArrayBuffer> => {
  let min = Infinity;
  let max = -Infinity;
  for (const v of src) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return src.map((v) => (v - min) / (max - min || 1));
};

const noiseLayer = (seed: string, passes: number): Float32Array => {
  let grid = new Float32Array(TERRAIN_ROWS * TERRAIN_COLS).map((_, i) =>
    random(`${seed}-${passes}-${i}`),
  );
  for (let i = 0; i < passes; i++) {
    grid = blur(grid);
  }
  return normalize(grid);
};

/**
 * Seeded heightmap of TERRAIN_ROWS x TERRAIN_COLS, periodic along rows.
 * Height is 0 in the central corridor and grows on the left and right sides.
 */
export const generateHeightmap = (seed: string): Float32Array => {
  const coarse = noiseLayer(seed, 6);
  const fine = noiseLayer(seed, 1);
  const halfWidth = ((TERRAIN_COLS - 1) / 2) * CELL_SIZE;

  const heights = new Float32Array(TERRAIN_ROWS * TERRAIN_COLS);
  for (let r = 0; r < TERRAIN_ROWS; r++) {
    for (let c = 0; c < TERRAIN_COLS; c++) {
      const i = r * TERRAIN_COLS + c;
      const x = c * CELL_SIZE - halfWidth;
      const sideDistance = Math.abs(x) - FLAT_HALF_WIDTH;
      if (sideDistance <= 0) {
        continue;
      }
      const mask = smoothstep(0, MOUNTAIN_RAMP, sideDistance);
      const growth = 1 + sideDistance / halfWidth;
      const n = 0.75 * coarse[i] + 0.25 * fine[i];
      heights[i] = MOUNTAIN_MAX_HEIGHT * mask * growth * (0.08 + n * n);
    }
  }
  return heights;
};

export { smoothstep };
