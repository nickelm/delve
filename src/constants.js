// Grid and movement constants
export const CELL_SIZE = 2;
export const DEFAULT_CEILING = 2.8;
export const MOVE_DURATION = 280;
export const TURN_DURATION = 200;
export const DOOR_ANIM_DUR = 500;

// Direction vectors: N, E, S, W
export const DIR_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIR_ANGLE = [0, Math.PI * 1.5, Math.PI, Math.PI * 0.5];

// Wall placement helpers
export const WALL_DIRS = { N: [0, -0.5], E: [0.5, 0], S: [0, 0.5], W: [-0.5, 0] };
export const WALL_ROT = { N: 0, E: Math.PI * 0.5, S: Math.PI, W: Math.PI * 1.5 };
export const WALL_NORM = { N: [0, 0.05], S: [0, -0.05], E: [-0.05, 0], W: [0.05, 0] };
export const WALL_DIR_MAP = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
