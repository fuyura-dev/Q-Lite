import * as THREE from "three";
import { createSceneBundle } from "./renderer3d/scene";
import {
  clearGroup,
  getCellCenter,
  getLaneCenter,
  createPlacedWallMesh,
  createReserveWallMesh,
  createPawnMesh,
  createHoverCellMesh,
  createSelectedCellMesh,
  createHoverWallMesh,
  createSelectedWallMesh,
  updateWallPreviewMesh,
  createMoveTargetMesh,
} from "./renderer3d/meshes";
import {
  BOARD_MATERIALS,
  BOARD_SIZE,
  CELL_SIZE,
  LANE_SIZE,
  CELL_HEIGHT,
  BOARD_WORLD_SIZE,
  BOARD_DEPTH,
  HALF_BOARD,
  WALL_HEIGHT,
} from "./renderer3d/constants";

function mergeWallSegments(segments, axis) {
  const grouped = new Map();

  for (const segment of segments) {
    const fixed = axis == "horizontal" ? segment.row : segment.col;
    const variable = axis == "horizontal" ? segment.col : segment.row;

    if (!grouped.has(fixed)) {
      grouped.set(fixed, []);
    }
    grouped.get(fixed).push(variable);
  }

  const mergedWalls = [];

  for (const [fixed, values] of grouped) {
    values.sort((a, b) => a - b);

    for (let i = 0; i < values.length; i++) {
      const current = values[i];
      const next = values[i + 1];

      mergedWalls.push(
        axis == "horizontal"
          ? { row: fixed, col: current }
          : { row: current, col: fixed },
      );
      i++;
    }
  }

  return mergedWalls;
}

function getPawnPosition(player) {
  return {
    x: getCellCenter(player.col),
    y: CELL_HEIGHT,
    z: getCellCenter(player.row),
  };
}

function getReserveWallSlots() {
  return [
    getLaneCenter(0),
    getLaneCenter(1),
    getLaneCenter(2),
    getLaneCenter(3),
    getLaneCenter(4),
    getLaneCenter(5),
    -HALF_BOARD - LANE_SIZE / 2,
    HALF_BOARD + LANE_SIZE / 2,
  ];
}

function getReserveWallPosition(playerId, index) {
  const slots = getReserveWallSlots();

  return {
    x: slots[index],
    y: CELL_HEIGHT + WALL_HEIGHT / 2,
    z: getLaneCenter(playerId == 1 ? 7 : -2),
  };
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

function createBoardGroup() {
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

export function createRenderer3D(container, options = {}) {
  if (!container) {
    throw new Error("Missing board viewport element");
  }
  container.replaceChildren();

  const { scene, camera, renderer, controls } = createSceneBundle(container);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let latestSnapshot = null;
  let hoveredCellKey = "";
  let hoveredWallSlotKey = "";
  let selectedCellKey = "";
  let selectedWallSlotKey = "";
  let selectedReserveWallKey = "";
  const reserveWallSlotsByPlayer = new Map();
  const reserveWallIdCounters = new Map();
  let pendingPlacedReserveWallKey = "";

  const { boardGroup, cellMeshes, horizontalSlotMeshes, verticalSlotMeshes } =
    createBoardGroup();
  scene.add(boardGroup);
  const placedWallGroup = new THREE.Group();
  scene.add(placedWallGroup);
  const reserveWallGroup = new THREE.Group();
  scene.add(reserveWallGroup);
  const pawnGroup = new THREE.Group();
  scene.add(pawnGroup);
  const moveTargetGroup = new THREE.Group();
  scene.add(moveTargetGroup);
  const hoverCell = createHoverCellMesh();
  scene.add(hoverCell);
  const selectedCell = createSelectedCellMesh();
  scene.add(selectedCell);
  const hoverWall = createHoverWallMesh();
  scene.add(hoverWall);
  const selectedWall = createSelectedWallMesh();
  scene.add(selectedWall);

  function rerenderSnapshot() {
    if (latestSnapshot) {
      render(latestSnapshot);
    }
  }

  function syncReserveWallSelection() {
    for (const mesh of reserveWallGroup.children) {
      const isSelected = mesh.userData.reserveWallKey == selectedReserveWallKey;
      mesh.material.color.set(isSelected ? "#f08d49" : "#c89352");
      mesh.material.transparent = isSelected;
      mesh.material.opacity = isSelected ? 0.9 : 1;
    }
  }

  function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    render();
  }
  resizeRenderer();

  const resizeObserver = new ResizeObserver(() => {
    resizeRenderer();
  });
  resizeObserver.observe(container);

  function notifyHover(cell) {
    if (options.onHoverCell) {
      options.onHoverCell(cell);
    }
  }

  function notifySelectCell(cell) {
    if (options.onSelectCell) {
      options.onSelectCell(cell);
    }
  }

  function notifySelectReserveWall(reserveWall) {
    if (options.onSelectReserveWall) {
      options.onSelectReserveWall(reserveWall);
    }
  }

  function notifyWallHover(wallSlot) {
    if (options.onHoverWallSlot) {
      options.onHoverWallSlot(wallSlot);
    }
  }

  function notifySelectWallSlot(wallSlot) {
    if (options.onSelectWallSlot) {
      options.onSelectWallSlot(wallSlot);
    }
  }

  function notifySelectMoveTarget(moveTarget) {
    if (options.onSelectMoveTarget) {
      options.onSelectMoveTarget(moveTarget);
    }
  }

  function getCurrentPlayer(snapshot) {
    return (
      snapshot.players.find((player) => player.id == snapshot.currentTurn) ??
      null
    );
  }

  function getClickableMoveTarget(cell) {
    if (!latestSnapshot || !cell) {
      return null;
    }

    const currentPlayer = getCurrentPlayer(latestSnapshot);
    const canShowMoveTargets =
      currentPlayer &&
      selectedCellKey == `${currentPlayer.row}-${currentPlayer.col}`;

    if (!canShowMoveTargets) {
      return null;
    }

    return (
      latestSnapshot.legalPawnMoves?.find(
        (moveTarget) =>
          moveTarget.row == cell.row && moveTarget.col == cell.col,
      ) ?? null
    );
  }

  function setHoveredCell(cell) {
    const cellKey = cell ? `${cell.row}-${cell.col}` : "";
    if (cellKey == hoveredCellKey) {
      return;
    }

    hoveredCellKey = cellKey;

    if (!cell) {
      hoverCell.visible = false;
      notifyHover(null);
      return;
    }

    hoverCell.visible = true;
    hoverCell.position.set(
      getCellCenter(cell.col),
      CELL_HEIGHT + CELL_HEIGHT / 2,
      getCellCenter(cell.row),
    );
    notifyHover(cell);
  }

  function setSelectedCell(cell) {
    const cellKey = cell ? `${cell.row}-${cell.col}` : "";
    if (cellKey == selectedCellKey) {
      return;
    }

    selectedCellKey = cellKey;

    if (!cell) {
      selectedCell.visible = false;
      notifySelectCell(null);
      rerenderSnapshot();
      return;
    }

    selectedCell.visible = true;
    selectedCell.position.set(
      getCellCenter(cell.col),
      CELL_HEIGHT + CELL_HEIGHT / 2 + 0.03,
      getCellCenter(cell.row),
    );
    notifySelectCell(cell);
    rerenderSnapshot();
  }

  function setHoveredWallSlot(wallSlot) {
    const previewWallSlot =
      wallSlot &&
      ((wallSlot.axis == "horizontal" && wallSlot.col < BOARD_SIZE - 1) ||
        (wallSlot.axis == "vertical" && wallSlot.row < BOARD_SIZE - 1))
        ? wallSlot
        : null;
    const wallSlotKey = previewWallSlot
      ? `${previewWallSlot.axis}-${previewWallSlot.row}-${previewWallSlot.col}`
      : "";

    if (wallSlotKey == hoveredWallSlotKey) {
      return;
    }

    hoveredWallSlotKey = wallSlotKey;

    if (!previewWallSlot) {
      hoverWall.visible = false;
      notifyWallHover(null);
      return;
    }

    hoverWall.visible = true;
    updateWallPreviewMesh(hoverWall, previewWallSlot);
    notifyWallHover(previewWallSlot);
  }

  function setSelectedWallSlot(wallSlot) {
    if (!selectedReserveWallKey) {
      selectedWall.visible = false;
      selectedWallSlotKey = "";
      notifySelectWallSlot(null);
      return;
    }

    const previewWallSlot =
      wallSlot &&
      ((wallSlot.axis == "horizontal" && wallSlot.col < BOARD_SIZE - 1) ||
        (wallSlot.axis == "vertical" && wallSlot.row < BOARD_SIZE - 1))
        ? wallSlot
        : null;
    const wallSlotKey = previewWallSlot
      ? `${previewWallSlot.axis}-${previewWallSlot.row}-${previewWallSlot.col}`
      : "";
    if (wallSlotKey == selectedWallSlotKey) {
      return;
    }

    selectedWallSlotKey = wallSlotKey;

    if (!previewWallSlot) {
      selectedWall.visible = false;
      notifySelectWallSlot(null);
      return;
    }

    selectedWall.visible = true;
    updateWallPreviewMesh(selectedWall, previewWallSlot);
    notifySelectWallSlot(previewWallSlot);
  }

  function setSelectedReserveWall(reserveWallKey) {
    if (reserveWallKey == selectedReserveWallKey) {
      return;
    }

    selectedReserveWallKey = reserveWallKey ?? "";
    syncReserveWallSelection();

    if (!selectedReserveWallKey) {
      setSelectedWallSlot(null);
      notifySelectReserveWall(null);
      rerenderSnapshot();
      return;
    }

    notifySelectReserveWall({ key: selectedReserveWallKey });
    rerenderSnapshot();
  }

  function ensureReserveWallKeys(playerId, count) {
    if (!reserveWallSlotsByPlayer.has(playerId)) {
      reserveWallSlotsByPlayer.set(playerId, []);
      reserveWallIdCounters.set(playerId, 0);
    }

    const slots = reserveWallSlotsByPlayer.get(playerId);
    let nextId = reserveWallIdCounters.get(playerId);
    const filledCount = slots.filter(Boolean).length;

    while (slots.length < getReserveWallSlots().length) {
      slots.push(null);
    }

    for (
      let i = 0;
      i < slots.length &&
      filledCount + (nextId - reserveWallIdCounters.get(playerId)) < count;
      i++
    ) {
      if (slots[i]) {
        continue;
      }
      slots[i] = `player-${playerId}-wall-${nextId}`;
      nextId++;
    }

    reserveWallIdCounters.set(playerId, nextId);
  }

  function syncReserveWalls(snapshot) {
    const activePlayerIds = new Set(
      snapshot.players.map((player) => player.id),
    );

    for (const player of snapshot.players) {
      ensureReserveWallKeys(player.id, player.wallsRemaining);
      const slots = reserveWallSlotsByPlayer.get(player.id);
      const targetCount = player.wallsRemaining;
      let filledCount = slots.filter(Boolean).length;

      while (filledCount > targetCount) {
        const selectedIndex = pendingPlacedReserveWallKey
          ? slots.indexOf(pendingPlacedReserveWallKey)
          : -1;

        if (selectedIndex >= 0) {
          slots[selectedIndex] = null;
          pendingPlacedReserveWallKey = "";
          filledCount--;
          continue;
        }

        const lastFilledIndex = slots.findLastIndex(Boolean);
        if (lastFilledIndex < 0) {
          break;
        }
        slots[lastFilledIndex] = null;
        filledCount--;
      }
    }

    for (const playerId of [...reserveWallSlotsByPlayer.keys()]) {
      if (!activePlayerIds.has(playerId)) {
        reserveWallSlotsByPlayer.delete(playerId);
        reserveWallIdCounters.delete(playerId);
      }
    }
  }

  function clearWallPlacementSelection() {
    setSelectedReserveWall(null);
    setSelectedWallSlot(null);
  }

  function commitSelectedReserveWall() {
    pendingPlacedReserveWallKey = selectedReserveWallKey;
  }

  function clearMoveSelection() {
    setSelectedCell(null);
    notifySelectMoveTarget(null);
  }

  function updateHoveredCell(clientX, clientY) {
    if (!latestSnapshot) {
      setHoveredCell(null);
      setHoveredWallSlot(null);
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const wallSlotIntersections = raycaster.intersectObjects(
      [...horizontalSlotMeshes, ...verticalSlotMeshes],
      false,
    );
    const wallSlot =
      wallSlotIntersections[0]?.object?.userData?.wallSlot ?? null;
    setHoveredWallSlot(wallSlot);

    const intersections = raycaster.intersectObjects(cellMeshes, false);
    const cell = intersections[0]?.object?.userData?.cell ?? null;
    setHoveredCell(cell);
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    updateHoveredCell(event.clientX, event.clientY);
  });

  renderer.domElement.addEventListener("click", (event) => {
    if (!latestSnapshot) {
      setSelectedCell(null);
      setSelectedWallSlot(null);
      setSelectedReserveWall(null);
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const reserveWallIntersections = raycaster.intersectObjects(
      reserveWallGroup.children,
      false,
    );
    const reserveWallKey =
      reserveWallIntersections[0]?.object?.userData?.reserveWallKey ?? null;
    if (reserveWallKey) {
      setSelectedReserveWall(reserveWallKey);
      return;
    }

    const wallSlotIntersections = raycaster.intersectObjects(
      [...horizontalSlotMeshes, ...verticalSlotMeshes],
      false,
    );
    const wallSlot =
      wallSlotIntersections[0]?.object?.userData?.wallSlot ?? null;
    setSelectedWallSlot(wallSlot);

    const moveTargetIntersections = raycaster.intersectObjects(
      moveTargetGroup.children,
      false,
    );
    const moveTarget =
      moveTargetIntersections[0]?.object?.userData?.moveTarget ?? null;
    if (moveTarget) {
      notifySelectMoveTarget(moveTarget);
      return;
    }

    const intersections = raycaster.intersectObjects(cellMeshes, false);
    const cell = intersections[0]?.object?.userData?.cell ?? null;

    const cellMoveTarget = getClickableMoveTarget(cell);
    if (cellMoveTarget) {
      notifySelectMoveTarget(cellMoveTarget);
      return;
    }

    setSelectedCell(cell);
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    setHoveredCell(null);
    setHoveredWallSlot(null);
  });

  const clock = new THREE.Clock();
  let animationFrameId = 0;

  function animate() {
    animationFrameId = window.requestAnimationFrame(animate);
    controls.update(clock.getDelta());
    renderer.render(scene, camera);
  }
  animate();

  function render(snapshot, options = {}) {
    if (!snapshot) {
      latestSnapshot = null;
      setHoveredCell(null);
      setHoveredWallSlot(null);
      return;
    }

    latestSnapshot = snapshot;
    syncReserveWalls(snapshot);

    clearGroup(pawnGroup);
    clearGroup(placedWallGroup);
    clearGroup(reserveWallGroup);
    clearGroup(moveTargetGroup);

    for (const player of snapshot.players) {
      const mesh = createPawnMesh(player.id);
      const position = getPawnPosition(player);
      mesh.position.set(position.x, position.y, position.z);
      pawnGroup.add(mesh);
    }

    // Placed Walls
    const horizontalWalls = mergeWallSegments(
      snapshot.horizontalWalls,
      "horizontal",
    );
    const verticalWalls = mergeWallSegments(snapshot.verticalWalls, "vertical");

    for (const wall of horizontalWalls) {
      placedWallGroup.add(createPlacedWallMesh("horizontal", wall));
    }
    for (const wall of verticalWalls) {
      placedWallGroup.add(createPlacedWallMesh("vertical", wall));
    }

    // Unplaced Walls
    for (const player of snapshot.players) {
      const reserveWallSlots = reserveWallSlotsByPlayer.get(player.id) ?? [];
      for (let i = 0; i < reserveWallSlots.length; i++) {
        const reserveWallKey = reserveWallSlots[i];
        if (!reserveWallKey) {
          continue;
        }
        const mesh = createReserveWallMesh(
          reserveWallKey,
          reserveWallKey == selectedReserveWallKey,
        );
        const position = getReserveWallPosition(player.id, i);
        mesh.position.set(position.x, position.y, position.z);
        reserveWallGroup.add(mesh);
      }
    }

    const validReserveWallKeys = new Set(
      [...reserveWallSlotsByPlayer.values()].flat().filter(Boolean),
    );
    if (
      selectedReserveWallKey &&
      !validReserveWallKeys.has(selectedReserveWallKey)
    ) {
      setSelectedReserveWall(null);
    }

    const currentPlayer = getCurrentPlayer(snapshot);
    const canShowMoveTargets =
      currentPlayer &&
      selectedCellKey == `${currentPlayer.row}-${currentPlayer.col}`;

    if (canShowMoveTargets) {
      for (const moveTarget of snapshot.legalPawnMoves ?? []) {
        moveTargetGroup.add(createMoveTargetMesh(moveTarget));
      }
    }
  }

  return {
    clearMoveSelection,
    commitSelectedReserveWall,
    clearWallPlacementSelection,
    render,
  };
}
