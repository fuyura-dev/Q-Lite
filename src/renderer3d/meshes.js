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
      color: isSelected ? "#c8721a" : "#6b3c1a",
      roughness: isSelected ? 0.5 : 0.72,
      metalness: 0.06,
      transparent: isSelected,
      opacity: isSelected ? 0.92 : 1,
      emissive: isSelected ? "#5a2a00" : "#000000",
      emissiveIntensity: isSelected ? 0.3 : 0,
    }),
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.reserveWallKey = reserveWallKey;

  return mesh;
}

export function createPawnMesh(playerId) {
  const pawnGroup = new THREE.Group();
  const mat = playerId == 1 ? BOARD_MATERIALS.pawnOne : BOARD_MATERIALS.pawnTwo;

  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, 0.1, 20),
    mat,
  );
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.y = CELL_HEIGHT + 0.05;
  pawnGroup.add(base);

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.21, 0.42, 20),
    mat,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = CELL_HEIGHT + 0.36;
  pawnGroup.add(body);

  // Round head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat);
  head.castShadow = true;
  head.position.y = CELL_HEIGHT + 0.68;
  pawnGroup.add(head);

  return pawnGroup;
}

export function createHoverCellMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.05, CELL_SIZE * 0.92),
    new THREE.MeshStandardMaterial({
      color: "#c8a040",
      transparent: true,
      opacity: 0.45,
      emissive: "#7a5010",
      emissiveIntensity: 0.4,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createSelectedCellMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(CELL_SIZE * 0.82, 0.07, CELL_SIZE * 0.82),
    new THREE.MeshStandardMaterial({
      color: "#e08020",
      transparent: true,
      opacity: 0.72,
      emissive: "#6a3000",
      emissiveIntensity: 0.5,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createHoverWallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#a07840",
      transparent: true,
      opacity: 0.55,
      emissive: "#3a2500",
      emissiveIntensity: 0.3,
    }),
  );
  mesh.visible = false;
  return mesh;
}

export function createSelectedWallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_SPAN, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({
      color: "#d07020",
      transparent: true,
      opacity: 0.82,
      emissive: "#5a2500",
      emissiveIntensity: 0.45,
    }),
  );
  mesh.visible = false;
  return mesh;
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
    new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20),
    new THREE.MeshStandardMaterial({
      color: "#c8a030",
      transparent: true,
      opacity: 0.8,
      emissive: "#6a4800",
      emissiveIntensity: 0.5,
    }),
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.moveTarget = moveTarget;
  mesh.position.set(
    getCellCenter(moveTarget.col),
    CELL_HEIGHT + 0.08,
    getCellCenter(moveTarget.row),
  );
  return mesh;
}
