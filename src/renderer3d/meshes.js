import * as THREE from "three";
import {
  BOARD_MATERIALS,
  CELL_HEIGHT,
  CELL_SIZE,
  WALL_HEIGHT,
  WALL_SPAN,
  WALL_THICKNESS,
  HALF_BOARD,
  LANE_SIZE,
} from "./constants";
import { getCellCenter, getLaneCenter } from "./geometry";

export function clearGroup(group) {
  group.clear();
}

export function createPlacedWallMesh(axis, wall) {
  const isHorizontal = axis == "horizontal";
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      isHorizontal ? WALL_SPAN : WALL_THICKNESS,
      WALL_HEIGHT,
      isHorizontal ? WALL_THICKNESS : WALL_SPAN,
    ),
    BOARD_MATERIALS.wall,
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    getLaneCenter(wall.col),
    CELL_HEIGHT + WALL_HEIGHT / 2,
    getLaneCenter(wall.row),
  );

  return mesh;
}

export function createReserveWallMesh(reserveWallKey, isSelected = false) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_SPAN),
    new THREE.MeshStandardMaterial({
      color: isSelected ? "#f08d49" : "#c89352",
      transparent: isSelected,
      opacity: isSelected ? 0.9 : 1,
    }),
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.reserveWallKey = reserveWallKey;

  return mesh;
}

export function createPawnMesh(playerId) {
  const pawnGroup = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.3, 0.5, 24),
    playerId == 1 ? BOARD_MATERIALS.pawnOne : BOARD_MATERIALS.pawnTwo,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = 0.3;
  pawnGroup.add(body);

  return pawnGroup;
}

export function createHoverCellMesh() {
  const hoverCell = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.05, CELL_SIZE * 0.92),
    new THREE.MeshStandardMaterial({
      color: "#efe28a",
      transparent: true,
      opacity: 0.55,
    }),
  );
  hoverCell.visible = false;
  return hoverCell;
}

export function createSelectedCellMesh() {
  const selectedCell = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.82, 0.07, CELL_SIZE * 0.82),
    new THREE.MeshStandardMaterial({
      color: "#d98f39",
      transparent: true,
      opacity: 0.72,
    }),
  );
  selectedCell.visible = false;
  return selectedCell;
}

export function createHoverWallMesh() {
  const hoverWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#79d6b8",
      transparent: true,
      opacity: 0.65,
    }),
  );
  hoverWall.visible = false;
  return hoverWall;
}

export function createSelectedWallMesh() {
  const selectedWall = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#f08d49",
      transparent: true,
      opacity: 0.82,
    }),
  );
  selectedWall.visible = false;
  return selectedWall;
}

export function updateWallPreviewMesh(mesh, wallSlot) {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BoxGeometry(
    wallSlot.axis == "horizontal" ? WALL_SPAN : WALL_THICKNESS,
    WALL_HEIGHT,
    wallSlot.axis == "horizontal" ? WALL_THICKNESS : WALL_SPAN,
  );
  mesh.position.set(
    getLaneCenter(wallSlot.col),
    CELL_HEIGHT + WALL_HEIGHT / 2,
    getLaneCenter(wallSlot.row),
  );
}

export function createMoveTargetMesh(moveTarget) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24),
    new THREE.MeshStandardMaterial({
      color: "#4bb978",
      transparent: true,
      opacity: 0.85,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.moveTarget = moveTarget;
  mesh.position.set(
    getCellCenter(moveTarget.col),
    CELL_HEIGHT + 0.08,
    getCellCenter(moveTarget.row),
  );
  return mesh;
}
