export const BOARD_SIZE = 7;
export const CELL_SIZE = 0.9;
export const CELL_HEIGHT = 0.12;
export const LANE_SIZE = 0.2;
export const BOARD_WORLD_SIZE =
  BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * LANE_SIZE;
export const HALF_BOARD = BOARD_WORLD_SIZE / 2;
export const WALL_SPAN = CELL_SIZE * 2 + LANE_SIZE;
export const WALL_THICKNESS = LANE_SIZE * 0.8;
export const WALL_HEIGHT = 0.7;
export const BOARD_DEPTH = BOARD_WORLD_SIZE + WALL_SPAN * 2;
export const HALF_DEPTH = BOARD_DEPTH / 2;
