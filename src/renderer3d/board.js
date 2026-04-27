import * as THREE from "three";
import {
  BOARD_SIZE,
  CELL_SIZE,
  LANE_SIZE,
  CELL_HEIGHT,
  BOARD_WORLD_SIZE,
  BOARD_DEPTH,
  BOARD_MATERIALS,
  HALF_BOARD,
} from "./constants";
import { getCellCenter, getLaneCenter } from "./meshes";

function createWallSlotTargets() {
  const horizontalSlotMeshes = [];
  const verticalSlotMeshes = [];
  const slotMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  for (let row = 0; row < BOARD_SIZE - 1; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const horizontalSlot = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE, 0.18, LANE_SIZE * 1.4),
        slotMaterial,
      );
      horizontalSlot.position.set(
        getCellCenter(col),
        CELL_HEIGHT + 0.09,
        getLaneCenter(row),
      );
      horizontalSlot.userData.wallSlot = { axis: "horizontal", row, col };
      horizontalSlotMeshes.push(horizontalSlot);
    }
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 1; col++) {
      const verticalSlot = new THREE.Mesh(
        new THREE.BoxGeometry(LANE_SIZE * 1.4, 0.18, CELL_SIZE),
        slotMaterial,
      );
      verticalSlot.position.set(
        getLaneCenter(col),
        CELL_HEIGHT + 0.09,
        getCellCenter(row),
      );
      verticalSlot.userData.wallSlot = { axis: "vertical", row, col };
      verticalSlotMeshes.push(verticalSlot);
    }
  }

  return { horizontalSlotMeshes, verticalSlotMeshes };
}

export function createBoardGroup() {
  const boardGroup = new THREE.Group();
  const cellMeshes = [];
  const { horizontalSlotMeshes, verticalSlotMeshes } = createWallSlotTargets();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WORLD_SIZE + 1, 0.7, BOARD_DEPTH + 1.4),
    BOARD_MATERIALS.frame,
  );
  frame.receiveShadow = true;
  frame.position.y = -0.3;
  boardGroup.add(frame);

  const topPanel = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.42, 0.16, BOARD_DEPTH + 0.84),
    BOARD_MATERIALS.top,
  );
  topPanel.receiveShadow = true;
  topPanel.position.y = -0.02;
  boardGroup.add(topPanel);

  // CELL
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(CELL_SIZE, CELL_HEIGHT, CELL_SIZE),
        BOARD_MATERIALS.cell,
      );

      tile.castShadow = true;
      tile.receiveShadow = true;
      tile.position.set(getCellCenter(c), CELL_HEIGHT, getCellCenter(r));
      tile.userData.cell = { row: r, col: c };
      boardGroup.add(tile);
      cellMeshes.push(tile);

      if (r == 0 || r == BOARD_SIZE - 1) {
        const extendedCell = new THREE.Mesh(
          new THREE.BoxGeometry(
            CELL_SIZE,
            CELL_HEIGHT,
            CELL_SIZE * 2 + LANE_SIZE,
          ),
          BOARD_MATERIALS.cell,
        );
        extendedCell.castShadow = true;
        extendedCell.receiveShadow = true;
        extendedCell.position.set(
          getCellCenter(c),
          CELL_HEIGHT,
          (r === 0 ? -1 : 1) *
            (HALF_BOARD + LANE_SIZE + (CELL_SIZE * 2 + LANE_SIZE) / 2),
        );
        boardGroup.add(extendedCell);
      }
    }
  }

  for (const slotMesh of horizontalSlotMeshes) {
    boardGroup.add(slotMesh);
  }
  for (const slotMesh of verticalSlotMeshes) {
    boardGroup.add(slotMesh);
  }

  // LANE
  for (let lane = 0; lane < BOARD_SIZE - 1; lane++) {
    const lanePosition =
      -HALF_BOARD + CELL_SIZE + lane * (CELL_SIZE + LANE_SIZE) + LANE_SIZE / 2;

    const verticalLane = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_SIZE, 0.08, BOARD_WORLD_SIZE + 0.14),
      BOARD_MATERIALS.lane,
    );
    verticalLane.position.set(lanePosition, 0.06, 0);
    verticalLane.receiveShadow = true;
    boardGroup.add(verticalLane);

    const horizontalLane = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.14, 0.08, LANE_SIZE),
      BOARD_MATERIALS.lane,
    );
    horizontalLane.position.set(0, 0.06, lanePosition);
    horizontalLane.receiveShadow = true;
    boardGroup.add(horizontalLane);
  }

  return { boardGroup, cellMeshes, horizontalSlotMeshes, verticalSlotMeshes };
}
