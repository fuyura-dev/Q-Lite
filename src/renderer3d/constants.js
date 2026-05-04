import * as THREE from "three";

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

export const BOARD_MATERIALS = {
  frame: new THREE.MeshStandardMaterial({
    color: "#1e0f07",
    roughness: 0.85,
    metalness: 0.05,
  }),
  top: new THREE.MeshStandardMaterial({
    color: "#2e1a0c",
    roughness: 0.8,
    metalness: 0.04,
  }),
  cell: new THREE.MeshStandardMaterial({
    color: "#3b2010",
    roughness: 0.78,
    metalness: 0.03,
  }),
  lane: new THREE.MeshStandardMaterial({
    color: "#130a04",
    roughness: 0.92,
    metalness: 0.0,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: "#6b3c1a",
    roughness: 0.72,
    metalness: 0.06,
  }),
  pawnOne: new THREE.MeshStandardMaterial({
    color: "#d4861e",
    metalness: 0.1,
  }),
  pawnTwo: new THREE.MeshStandardMaterial({
    color: "#3b6b3a",
    roughness: 0.6,
    metalness: 0.08,
  }),
};
