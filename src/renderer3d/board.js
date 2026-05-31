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
  MAX_RESERVE_WALL_SPAN,
} from "./constants";
import { getCellCenter, getLaneCenter } from "./geometry";

const BOARD_TEXTURE_REPEAT = 1.3;
const TOP_PANEL_TEXTURE_REPEAT = 0.9;
const CELL_LIGHTNESS_VARIATION = [
  [0.02, -0.04, 0.03, -0.01, 0.04, -0.03, 0.01],
  [-0.03, 0.01, -0.02, 0.04, -0.01, 0.03, -0.04],
  [0.04, -0.01, 0.02, -0.03, 0.01, -0.04, 0.03],
  [-0.01, 0.03, -0.04, 0.02, -0.03, 0.01, 0.04],
  [0.03, -0.02, 0.01, -0.04, 0.04, -0.01, 0.02],
  [-0.04, 0.04, -0.01, 0.03, -0.02, 0.02, -0.03],
  [0.01, -0.03, 0.04, -0.02, 0.03, -0.04, 0.02],
];

const CELL_WARMTH_VARIATION = [
  [0.01, -0.02, 0, 0.02, -0.01, 0.01, -0.02],
  [0.02, 0, -0.01, 0.01, -0.02, 0.02, 0],
  [-0.01, 0.02, 0.01, -0.02, 0, -0.01, 0.02],
  [0, -0.01, 0.02, 0.01, -0.02, 0, 0.01],
  [0.02, -0.02, 0, -0.01, 0.01, 0.02, -0.01],
  [-0.02, 0.01, -0.01, 0.02, 0, -0.02, 0.01],
  [0.01, 0, 0.02, -0.01, 0.02, -0.02, 0],
];

function roughenTopSurface(geometry, row, col, strength = 0.045) {
  const position = geometry.getAttribute("position");

  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);

    if (y > -0.01) {
      const x = position.getX(i);
      const z = position.getZ(i);

      const noise =
        seededNoise(row + Math.floor(x * 10), col + Math.floor(z * 10), 19) -
        0.5;

      position.setY(i, y + noise * strength);
    }
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function loadBoardTexture(path, repeat = BOARD_TEXTURE_REPEAT) {
  const texture = new THREE.TextureLoader().load(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

function createBoardFloorMaterial(options = {}) {
  const repeat = options.repeat ?? BOARD_TEXTURE_REPEAT;
  const colorMap = loadBoardTexture(
    "/textures/board/Brickwall%20Damaged%20Moss_BaseColor.jpg",
    repeat,
  );
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const normalMap = loadBoardTexture(
    "/textures/board/Brickwall%20Damaged%20Moss_Normal.jpg",
    repeat,
  );
  const roughnessMap = loadBoardTexture(
    "/textures/board/Brickwall%20Damaged%20Moss_Roughness.jpg",
    repeat,
  );

  return new THREE.MeshStandardMaterial({
    color: options.color ?? "#ffffff",
    map: colorMap,
    normalMap,
    normalScale: new THREE.Vector2(
      options.normalScale ?? 0.55,
      options.normalScale ?? 0.55,
    ),
    roughness: options.roughness ?? 0.9,
    roughnessMap,
    metalness: 0.02,
  });
}

function applyBoardSurfaceUvs(geometry, centerX, centerZ, surfaceSize) {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");

  for (let i = 0; i < position.count; i++) {
    const worldX = centerX + position.getX(i);
    const worldZ = centerZ + position.getZ(i);
    const u = ((worldX + surfaceSize / 2) / surfaceSize) * BOARD_TEXTURE_REPEAT;
    const v = ((worldZ + surfaceSize / 2) / surfaceSize) * BOARD_TEXTURE_REPEAT;

    uv.setXY(i, u, v);
  }

  uv.needsUpdate = true;
}

function applyWrappedBoardUvs(geometry, centerX, centerZ, surfaceSize) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const sideTextureDrop = 0.01;

  for (let i = 0; i < position.count; i++) {
    const worldX = centerX + position.getX(i);
    const worldZ = centerZ + position.getZ(i);
    const topU =
      ((worldX + surfaceSize / 2) / surfaceSize) * BOARD_TEXTURE_REPEAT;
    const topV =
      ((worldZ + surfaceSize / 2) / surfaceSize) * BOARD_TEXTURE_REPEAT;

    if (normal.getY(i) > 0.55) {
      uv.setXY(i, topU, topV);
      continue;
    }

    const sideU =
      Math.abs(normal.getX(i)) > Math.abs(normal.getZ(i)) ? topV : topU;
    const verticalDrop = 1 - (position.getY(i) + CELL_HEIGHT / 2) / CELL_HEIGHT;
    const sideV = topV + verticalDrop * sideTextureDrop;

    uv.setXY(i, sideU, sideV);
  }

  uv.needsUpdate = true;
}

function createTexturedTopBox(
  width,
  height,
  depth,
  centerX,
  centerZ,
  material,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  applyBoardSurfaceUvs(geometry, centerX, centerZ, BOARD_DEPTH + 0.84);

  return new THREE.Mesh(geometry, [
    BOARD_MATERIALS.cell,
    BOARD_MATERIALS.cell,
    material,
    BOARD_MATERIALS.cell,
    BOARD_MATERIALS.cell,
    BOARD_MATERIALS.cell,
  ]);
}

function getCellTopMaterial(baseMaterial, row, col) {
  const material = baseMaterial.clone();
  const variationRow =
    ((row % CELL_LIGHTNESS_VARIATION.length) +
      CELL_LIGHTNESS_VARIATION.length) %
    CELL_LIGHTNESS_VARIATION.length;
  const variationCol =
    ((col % CELL_LIGHTNESS_VARIATION[variationRow].length) +
      CELL_LIGHTNESS_VARIATION[variationRow].length) %
    CELL_LIGHTNESS_VARIATION[variationRow].length;
  const lightness =
    1 + CELL_LIGHTNESS_VARIATION[variationRow][variationCol] * 5;
  const warmth = 1 + CELL_WARMTH_VARIATION[variationRow][variationCol] * 3.5;

  material.color.setRGB(
    0.84 * lightness * warmth,
    0.78 * lightness,
    0.68 * lightness * (2 - warmth),
  );

  return material;
}

function seededNoise(row, col, salt) {
  const value = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function createJaggedRectShape(row, col, width, depth, intensity = 1) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  // roughInset = constant unevenness
  // chipInset = harder broken chunks
  const roughInset = 0.01;
  const chipInset = 0.02;
  const widthSegments = Math.max(4, Math.ceil(width / (CELL_SIZE * 0.38)));
  const depthSegments = Math.max(4, Math.ceil(depth / (CELL_SIZE * 0.38)));
  const points = [];

  function edgeInset(edge, index, segments) {
    const baseInset =
      (0.012 + seededNoise(row, col, edge * 100 + index) * roughInset) *
      intensity;

    const chipCount = Math.max(1, Math.floor(segments / 3));

    let chipInsetTotal = 0;

    for (let chip = 0; chip < chipCount; chip++) {
      const chipCenter =
        1 +
        Math.floor(
          seededNoise(row, col, edge * 1000 + chip * 97 + 81) *
            Math.max(1, segments - 1),
        );

      const chipWidth =
        seededNoise(row, col, edge * 1000 + chip * 97 + 82) > 0.45 ? 1 : 0;

      const isChip =
        index > 0 &&
        index < segments &&
        Math.abs(index - chipCenter) <= chipWidth;

      if (isChip) {
        chipInsetTotal +=
          (chipInset +
            seededNoise(row, col, edge * 1000 + chip * 97 + 90 + index) *
              0.055) *
          intensity;
      }
    }

    return baseInset + chipInsetTotal;
  }

  for (let i = 0; i <= widthSegments; i++) {
    const t = i / widthSegments;
    points.push(
      new THREE.Vector2(
        -halfWidth + t * width,
        -halfDepth + edgeInset(0, i, widthSegments),
      ),
    );
  }

  for (let i = 1; i <= depthSegments; i++) {
    const t = i / depthSegments;
    points.push(
      new THREE.Vector2(
        halfWidth - edgeInset(1, i, depthSegments),
        -halfDepth + t * depth,
      ),
    );
  }

  for (let i = 1; i <= widthSegments; i++) {
    const t = i / widthSegments;
    points.push(
      new THREE.Vector2(
        halfWidth - t * width,
        halfDepth - edgeInset(2, i, widthSegments),
      ),
    );
  }

  for (let i = 1; i < depthSegments; i++) {
    const t = i / depthSegments;
    points.push(
      new THREE.Vector2(
        -halfWidth + edgeInset(3, i, depthSegments),
        halfDepth - t * depth,
      ),
    );
  }

  const shape = new THREE.Shape(points);
  shape.closePath();
  return shape;
}

function createJaggedTopMesh(
  row,
  col,
  width,
  depth,
  centerX,
  centerZ,
  material,
  sideMaterial = BOARD_MATERIALS.cell,
  intensity = 1,
) {
  const geometry = new THREE.ExtrudeGeometry(
    createJaggedRectShape(row, col, width, depth, intensity),
    {
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.01,
      bevelThickness: 0.008,
      depth: CELL_HEIGHT,
    },
  );

  geometry.rotateX(-Math.PI / 2);
  roughenTopSurface(geometry, row, col, 0.07);
  geometry.computeVertexNormals();
  applyWrappedBoardUvs(geometry, centerX, centerZ, BOARD_DEPTH + 0.84);

  const mesh = new THREE.Mesh(geometry, [material, sideMaterial]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(centerX, CELL_HEIGHT - CELL_HEIGHT / 2, centerZ);
  return mesh;
}

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
  const floorMaterial = createBoardFloorMaterial({
    color: "#8f8068",
    normalScale: 0.28,
    roughness: 1,
    repeat: TOP_PANEL_TEXTURE_REPEAT,
  });
  const cellTopMaterial = createBoardFloorMaterial({
    color: "#d6c7ad",
    normalScale: 0.42,
    roughness: 0.96,
  });
  const cellSideMaterial = createBoardFloorMaterial({
    color: "#8a7354",
    normalScale: 0.24,
    roughness: 1,
    repeat: 1.05,
  });
  const frameSize = BOARD_DEPTH + 1.4;
  const topPanelSize = BOARD_DEPTH + 0.84;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(frameSize, 0.7, frameSize),
    BOARD_MATERIALS.frame,
  );
  frame.receiveShadow = true;
  frame.position.y = -0.3;
  boardGroup.add(frame);

  const topPanel = new THREE.Mesh(
    new THREE.BoxGeometry(topPanelSize, 0.16, topPanelSize),
    floorMaterial,
  );
  topPanel.receiveShadow = true;
  topPanel.position.y = -0.02;
  boardGroup.add(topPanel);

  // CELL
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tileTopMaterial = getCellTopMaterial(cellTopMaterial, r, c);
      const cellX = getCellCenter(c);
      const cellZ = getCellCenter(r);
      const tile = createJaggedTopMesh(
        r,
        c,
        CELL_SIZE,
        CELL_SIZE,
        cellX,
        cellZ,
        tileTopMaterial,
        cellSideMaterial,
      );
      tile.userData.cell = { row: r, col: c };

      boardGroup.add(tile);
      cellMeshes.push(tile);

      if (r == 0 || r == BOARD_SIZE - 1) {
        const extendedCellZ =
          (r === 0 ? -1 : 1) *
          (HALF_BOARD + LANE_SIZE + MAX_RESERVE_WALL_SPAN / 2);
        const extendedCell = createJaggedTopMesh(
          r + (r === 0 ? -1 : 1),
          c,
          CELL_SIZE,
          MAX_RESERVE_WALL_SPAN,
          getCellCenter(c),
          extendedCellZ,
          getCellTopMaterial(cellTopMaterial, r + (r === 0 ? -1 : 1), c),
          cellSideMaterial,
          0.85,
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

  for (const side of [-1, 1]) {
    const sideStripWidth = CELL_SIZE;
    const sideStripLength = BOARD_DEPTH + LANE_SIZE * 2;
    const stripX = side * (HALF_BOARD + LANE_SIZE + sideStripWidth / 2);

    const sideStrip = createJaggedTopMesh(
      side,
      8,
      sideStripWidth,
      sideStripLength,
      stripX,
      0,
      cellTopMaterial,
      cellSideMaterial,
      0.85,
    );
    boardGroup.add(sideStrip);
  }

  // LANE
  // for (let lane = 0; lane < BOARD_SIZE - 1; lane++) {
  //   const lanePosition =
  //     -HALF_BOARD + CELL_SIZE + lane * (CELL_SIZE + LANE_SIZE) + LANE_SIZE / 2;

  //   const verticalLane = new THREE.Mesh(
  //     new THREE.BoxGeometry(LANE_SIZE, 0.08, BOARD_WORLD_SIZE + 0.14),
  //     BOARD_MATERIALS.lane,
  //   );
  //   verticalLane.position.set(lanePosition, 0.06, 0);
  //   verticalLane.receiveShadow = true;
  //   boardGroup.add(verticalLane);

  //   const horizontalLane = new THREE.Mesh(
  //     new THREE.BoxGeometry(BOARD_WORLD_SIZE + 0.14, 0.08, LANE_SIZE),
  //     BOARD_MATERIALS.lane,
  //   );
  //   horizontalLane.position.set(0, 0.06, lanePosition);
  //   horizontalLane.receiveShadow = true;
  //   boardGroup.add(horizontalLane);
  // }

  return { boardGroup, cellMeshes, horizontalSlotMeshes, verticalSlotMeshes };
}
