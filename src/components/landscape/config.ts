// Camera
export const CAMERA_FOV = 50; // vertical, in degrees
export const CAMERA_HEIGHT = 1.6;
export const CAMERA_PITCH = (3 * Math.PI) / 180; // slightly looking up

// Screen position of the horizon (0 = top, 1 = bottom), used to align the CSS sky.
export const HORIZON_RATIO =
  0.5 +
  Math.tan(CAMERA_PITCH) / (2 * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180));

// Terrain grid. The heightmap repeats every TERRAIN_ROWS rows, and the camera
// travels exactly TERRAIN_ROWS cells during the composition, so it loops
// whatever its duration.
export const CELL_SIZE = 1;
export const TERRAIN_ROWS = 90;
export const TERRAIN_COLS = 161;
export const TERRAIN_NEAR_Z = 6; // first row, behind the camera

// Grid line width, in pixels
export const GRID_LINE_WIDTH = 2.5;

// Flat corridor in front of the camera, mountains on both sides.
export const FLAT_HALF_WIDTH = 4;
export const MOUNTAIN_RAMP = 8;
export const MOUNTAIN_MAX_HEIGHT = 9;

// Mountains flatten when reaching the end of the grid, so rows recycled
// at the far edge never pop.
export const FAR_FADE_START = 50;
export const FAR_FADE_END = 80;

export const FOG_NEAR = 12;
export const FOG_FAR = 85;

// Sun and distant mountains (static, they don't move with the terrain)
export const SUN_DISTANCE = 320;
export const SUN_RADIUS = 60;
export const FAR_MOUNTAINS_DISTANCE = 260;
