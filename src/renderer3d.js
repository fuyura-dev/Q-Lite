import * as THREE from "three";
import { createBoardGroup } from "./renderer3d/board";
import {
  getCellCenter,
  getLaneCenter,
  getReserveWallSlots,
  getPawnPosition,
  mergeWallSegments,
  getReserveWallPosition,
} from "./renderer3d/geometry";
import { createSceneBundle } from "./renderer3d/scene";
import {
  clearGroup,
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
import { createReserveWallStore } from "./renderer3d/reserveWalls";

export function createRenderer3D(container, options = {}) {
  if (!container) {
    throw new Error("Missing board viewport element");
  }
  container.replaceChildren();

  const { scene, camera, renderer, controls } = createSceneBundle(container);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let latestSnapshot = null;
  let latestRenderOptions = {};
  let hoveredCellKey = "";
  let hoveredWallSlotKey = "";
  let selectedCellKey = "";
  let selectedWallSlotKey = "";
  let selectedReserveWallKey = "";
  const reserveWallStore = createReserveWallStore();

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const { boardGroup, cellMeshes, horizontalSlotMeshes, verticalSlotMeshes } =
    createBoardGroup();
  worldGroup.add(boardGroup);
  const placedWallGroup = new THREE.Group();
  worldGroup.add(placedWallGroup);
  const reserveWallGroup = new THREE.Group();
  worldGroup.add(reserveWallGroup);
  const pawnGroup = new THREE.Group();
  worldGroup.add(pawnGroup);
  const moveTargetGroup = new THREE.Group();
  worldGroup.add(moveTargetGroup);
  const hoverCell = createHoverCellMesh();
  worldGroup.add(hoverCell);
  const selectedCell = createSelectedCellMesh();
  worldGroup.add(selectedCell);
  const hoverWall = createHoverWallMesh();
  worldGroup.add(hoverWall);
  const selectedWall = createSelectedWallMesh();
  worldGroup.add(selectedWall);

  function rerenderSnapshot() {
    if (latestSnapshot) {
      render(latestSnapshot, latestRenderOptions);
    }
  }

  function getTargetBoardRotation(snapshot, renderOptions) {
    if (!snapshot) {
      return 0;
    }

    if (renderOptions.mode !== "human-vs-human") {
      return 0;
    }

    return snapshot.currentTurn == 2 ? Math.PI : 0;
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

    if (!selectedReserveWallKey) {
      setSelectedWallSlot(null);
      notifySelectReserveWall(null);
      rerenderSnapshot();
      return;
    }

    notifySelectReserveWall({ key: selectedReserveWallKey });
    rerenderSnapshot();
  }

  function clearWallPlacementSelection() {
    setSelectedReserveWall(null);
    setSelectedWallSlot(null);
  }

  function commitSelectedReserveWall() {
    reserveWallStore.commitSelectedReserveWall(selectedReserveWallKey);
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
    const targetRotation = getTargetBoardRotation(
      latestSnapshot,
      latestRenderOptions,
    );
    worldGroup.rotation.y += (targetRotation - worldGroup.rotation.y) * 0.05;
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
    latestRenderOptions = options;
    reserveWallStore.sync(snapshot);

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
      const reserveWallSlots = reserveWallStore.getSlots(player.id);
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

    const validReserveWallKeys = reserveWallStore.getValidKeys();
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
