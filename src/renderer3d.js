import * as THREE from "three";
import { createBoardGroup } from "./renderer3d/board";
import {
  getCellCenter,
  getLaneCenter,
  getReserveWallSlots,
  getPawnPosition,
  getReserveWallPosition,
} from "./renderer3d/geometry";
import { createSceneBundle } from "./renderer3d/scene";
import {
  clearGroup,
  createPlacedWallMesh,
  createReserveWallMesh,
  createHoverCellMesh,
  createSelectedCellMesh,
  createHoverWallMesh,
  createSelectedWallMesh,
  updateWallPreviewMesh,
  createMoveTargetMesh,
} from "./renderer3d/meshes";
import { createPawnMesh } from "./renderer3d/pawns";
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
import {
  createReserveWallStore,
  getReserveWallLengthFromKey,
} from "./renderer3d/reserveWalls";

const DEV_PAWN_VIEWER = false;
const DEV_PAWN_VIEWER_CLASS = "builder";

export function createRenderer3D(container, options = {}) {
  if (!container) {
    throw new Error("Missing board viewport element");
  }
  container.replaceChildren();

  const FULL_TURN = Math.PI * 2;
  const MENU_ROTATION_SPEED = 0.18;

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
  if (!DEV_PAWN_VIEWER) {
    worldGroup.add(boardGroup);
  }
  const placedWallGroup = new THREE.Group();
  worldGroup.add(placedWallGroup);
  const reserveWallGroup = new THREE.Group();
  worldGroup.add(reserveWallGroup);
  const pawnGroup = new THREE.Group();
  worldGroup.add(pawnGroup);
  const devViewerGroup = new THREE.Group();
  worldGroup.add(devViewerGroup);
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

  function setupDevPawnViewer() {
    clearGroup(devViewerGroup);
    clearGroup(placedWallGroup);
    clearGroup(reserveWallGroup);
    clearGroup(pawnGroup);
    clearGroup(moveTargetGroup);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.9, 0.08, 36),
      new THREE.MeshStandardMaterial({
        color: "#24140a",
        roughness: 0.78,
        metalness: 0.08,
      }),
    );
    platform.receiveShadow = true;
    platform.position.y = -0.04;
    devViewerGroup.add(platform);

    const pawn = createPawnMesh(1, DEV_PAWN_VIEWER_CLASS);
    pawn.scale.setScalar(1.9);
    pawn.position.y = -CELL_HEIGHT;
    devViewerGroup.add(pawn);

    camera.position.set(0.2, 2.2, 3.4);
    controls.target.set(0, 0.55, 0);
    controls.enablePan = true;
    controls.minDistance = 1.4;
    controls.maxDistance = 7;
    controls.update();
  }

  if (DEV_PAWN_VIEWER) {
    setupDevPawnViewer();
  }

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

  function getNearestRotation(currentRotation, targetRotation) {
    const fullTurns = Math.round(
      (currentRotation - targetRotation) / FULL_TURN,
    );
    return targetRotation + fullTurns * FULL_TURN;
  }

  function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    render(latestSnapshot, latestRenderOptions);
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

  function isPreviewWallSlotInBounds(wallSlot, wallLength) {
    if (!wallSlot) {
      return false;
    }

    if (wallSlot.axis == "horizontal") {
      return (
        wallSlot.row < BOARD_SIZE - 1 &&
        wallSlot.col + wallLength - 1 < BOARD_SIZE
      );
    }

    return (
      wallSlot.col < BOARD_SIZE - 1 &&
      wallSlot.row + wallLength - 1 < BOARD_SIZE
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
    const previewWallLength = getReserveWallLengthFromKey(
      selectedReserveWallKey,
    );
    const previewWallSlot = isPreviewWallSlotInBounds(
      wallSlot,
      previewWallLength,
    )
      ? wallSlot
      : null;
    const wallSlotKey = previewWallSlot
      ? `${previewWallSlot.axis}-${previewWallSlot.row}-${previewWallSlot.col}`
      : "";

    if (
      wallSlotKey == hoveredWallSlotKey &&
      hoverWall.userData.wallLength == previewWallLength
    ) {
      return;
    }

    hoveredWallSlotKey = wallSlotKey;

    if (!previewWallSlot) {
      hoverWall.visible = false;
      notifyWallHover(null);
      return;
    }

    hoverWall.visible = true;
    hoverWall.userData.wallLength = previewWallLength;
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

    const previewWallLength = getReserveWallLengthFromKey(
      selectedReserveWallKey,
    );
    const previewWallSlot = isPreviewWallSlotInBounds(
      wallSlot,
      previewWallLength,
    )
      ? wallSlot
      : null;
    const wallSlotKey = previewWallSlot
      ? `${previewWallSlot.axis}-${previewWallSlot.row}-${previewWallSlot.col}`
      : "";

    if (
      wallSlotKey == selectedWallSlotKey &&
      selectedWall.userData.wallLength == previewWallLength
    ) {
      return;
    }

    selectedWallSlotKey = wallSlotKey;

    if (!previewWallSlot) {
      selectedWall.visible = false;
      notifySelectWallSlot(null);
      return;
    }

    selectedWall.visible = true;
    selectedWall.userData.wallLength = previewWallLength;
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
      if (hoveredWallSlotKey) {
        const [axis, row, col] = hoveredWallSlotKey.split("-");
        setHoveredWallSlot({ axis, row: Number(row), col: Number(col) });
      }
      rerenderSnapshot();
      return;
    }

    notifySelectReserveWall({
      key: selectedReserveWallKey,
      length: getReserveWallLengthFromKey(selectedReserveWallKey),
    });
    if (hoveredWallSlotKey) {
      const [axis, row, col] = hoveredWallSlotKey.split("-");
      setHoveredWallSlot({ axis, row: Number(row), col: Number(col) });
    }
    if (selectedWallSlotKey) {
      const [axis, row, col] = selectedWallSlotKey.split("-");
      setSelectedWallSlot({ axis, row: Number(row), col: Number(col) });
    }
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
    if (options.canInteract && !options.canInteract(latestSnapshot)) {
      return;
    }

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
    const delta = clock.getDelta();
    controls.update(delta);

    if (latestRenderOptions.menuActive) {
      worldGroup.rotation.y =
        (worldGroup.rotation.y + delta * MENU_ROTATION_SPEED) % FULL_TURN;
      renderer.render(scene, camera);
      return;
    }
    const targetRotation = getTargetBoardRotation(
      latestSnapshot,
      latestRenderOptions,
    );
    const nearestTargetRotation = getNearestRotation(
      worldGroup.rotation.y,
      targetRotation,
    );
    worldGroup.rotation.y +=
      (nearestTargetRotation - worldGroup.rotation.y) * 0.05;
    renderer.render(scene, camera);
  }
  animate();

  function render(snapshot, options = {}) {
    latestRenderOptions = options;

    if (DEV_PAWN_VIEWER) {
      latestSnapshot = snapshot;
      setHoveredCell(null);
      setHoveredWallSlot(null);
      return;
    }

    if (!snapshot) {
      latestSnapshot = null;
      setHoveredCell(null);
      setHoveredWallSlot(null);
      return;
    }

    latestSnapshot = snapshot;
    reserveWallStore.sync(snapshot);

    clearGroup(pawnGroup);
    clearGroup(placedWallGroup);
    clearGroup(reserveWallGroup);
    clearGroup(moveTargetGroup);

    for (const player of snapshot.players) {
      const mesh = createPawnMesh(player.id, player.classId);
      const position = getPawnPosition(player);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.y = player.id == 1 ? Math.PI : 0;
      pawnGroup.add(mesh);
    }

    // Placed Walls
    for (const wall of snapshot.horizontalWalls ?? []) {
      placedWallGroup.add(createPlacedWallMesh("horizontal", wall));
    }
    for (const wall of snapshot.verticalWalls ?? []) {
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
        const wallLength = getReserveWallLengthFromKey(reserveWallKey);
        const position = getReserveWallPosition(player.id, i, wallLength);
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
