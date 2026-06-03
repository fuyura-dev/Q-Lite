import { createRenderer3D } from "./renderer3d.js";
import { createClassPreviewRenderer } from "./renderer3d/classPreview.js";
import {
  playActionSound,
  playGameMusic,
  playGameButtonSound,
  playMenuSelectSound,
  playOpeningMusic,
  playStartGameSound,
  playVictorySound,
  stopGameMusic,
  stopOpeningMusic,
} from "./audio.js";

const gameStage = document.querySelector(".game-stage");
const mainMenu = document.getElementById("main-menu");
const startGameButton = document.getElementById("start-game-button");
const creditsButton = document.getElementById("credits-button");
const creditsOverlay = document.getElementById("credits-overlay");
const creditsCloseButton = document.getElementById("credits-close-button");
const mainMenuButton = document.getElementById("main-menu-button");
const menuModeButtons = [...document.querySelectorAll("[data-menu-mode]")];
const classChoiceButtons = [
  ...document.querySelectorAll("[data-class-choice]"),
];
const classGroupTitles = [
  ...document.querySelectorAll("[data-class-group-title]"),
];
const playerTwoClassGroup = document.querySelector('[data-class-group="2"]');
const classPreviewPanel = document.getElementById("class-preview");
const classPreviewViewport = document.getElementById("class-preview-viewport");
const classPreviewPlayer = document.getElementById("class-preview-player");
const classPreviewTitle = document.getElementById("class-preview-title");
const classPreviewDescription = document.getElementById(
  "class-preview-description",
);
const winnerOverlay = document.getElementById("winner-overlay");
const winnerTitle = document.getElementById("winner-title");
const winnerDescription = document.getElementById("winner-description");
const winnerRestartButton = document.getElementById("winner-restart-button");
const winnerMainMenuButton = document.getElementById("winner-main-menu-button");

const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");
const modeDisplayText = document.getElementById("mode-display-text");
const aiToggleButton = document.getElementById("ai-toggle-button");
const aiStepButton = document.getElementById("ai-step-button");

const infoCurrentTurn = document.getElementById("info-current-turn");
const infoPlayerOneWalls = document.getElementById("info-player-one-walls");
const infoPlayerTwoWalls = document.getElementById("info-player-two-walls");
const infoPlayerOneClass = document.getElementById("info-player-one-class");
const infoPlayerTwoClass = document.getElementById("info-player-two-class");

const devInfo = document.getElementById("dev-info");
const devInfoText = document.getElementById("dev-info-text");
const debugToggle = document.getElementById("debug-toggle");
const gameSidebar = document.querySelector(".game-sidebar");
const gameInfoToggle = document.getElementById("game-info-toggle");

const boardViewport = document.getElementById("board-viewport");
const classPreview = classPreviewViewport
  ? createClassPreviewRenderer(classPreviewViewport)
  : null;

let engine = null;
let engineStatus = "Loading Engine...";
let hoverCellLabel = "Hovered Cell: none";
let hoverWallLabel = "Hovered Wall: none";
let selectedCellLabel = "Selected Cell: none";
let selectedWallLabel = "Selected Wall: none";
let selectedReserveWallLabel = "Selected Reserve Wall: none";
let selectedReserveWall = null;
let actionStatusLabel = "Action: none";
let selectedMoveTargetLabel = "Selected Move Target: none";
let evaluation = 0;
let fpsLabel = "FPS: --";
let aiTurnInProgress = false;
let aiAutoplayEnabled = true;
let aiLoopToken = 0;
let latestSnapshot = null;
let gameStarted = false;
let announcedWinner = null;
let gameInfoCollapsed = false;
let creditsReturnFocus = null;
const wallOwners = new Map();

let buildTime = "";
let pawnClasses = {};
let pawnClassesFromString = {};

const AI_MOVE_DELAY_MS = 300;

const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});

worker.onerror = (event) => {
  console.log(event);
};

worker.onmessageerror = (event) => {
  console.log(event);
};

const USE_MOCK = false;

const selectedPlayerClasses = {
  1: "runner",
  2: "builder",
};

const MOCK_SNAPSHOT = {
  boardSize: 7,
  currentTurn: 1,
  winner: null,
  players: [
    {
      id: 1,
      row: 6,
      col: 3,
      wallsRemaining: [4, 3, 1],
      extraWalls: 0,
    },
    {
      id: 2,
      row: 0,
      col: 3,
      wallsRemaining: [4, 3, 1],
      extraWalls: 2,
    },
  ],
  horizontalWalls: [
    { pos: { row: 1, col: 1 }, side: 1, length: 3 },
    { pos: { row: 4, col: 2 }, side: 1, length: 1 },
  ],
  verticalWalls: [
    { pos: { row: 2, col: 1 }, side: 0, length: 3 },
    { pos: { row: 1, col: 5 }, side: 0, length: 2 },
  ],
  legalPawnMoves: [
    { row: 5, col: 3 },
    { row: 6, col: 2 },
    { row: 6, col: 4 },
  ],
};

function updateDevInfo() {
  devInfoText.innerHTML = `Engine Status: ${engineStatus}<br>${fpsLabel}<br>${hoverCellLabel}<br>${hoverWallLabel}<br>${selectedCellLabel}<br>${selectedWallLabel}<br>${selectedReserveWallLabel}<br>${selectedMoveTargetLabel}<br>${actionStatusLabel}<br>Evaluation: ${evaluation}<br>Build Time: ${buildTime}`;
}

function getWallSide(axis) {
  return axis === "horizontal"
    ? engine.wallSide.BOTTOM_SIDE
    : engine.wallSide.RIGHT_SIDE;
}

function getWallOwnerKey(axis, wall) {
  return `${axis}:${wall.pos.row}:${wall.pos.col}:${wall.length ?? 2}`;
}

function rememberWallOwner(axis, wall, playerId) {
  wallOwners.set(getWallOwnerKey(axis, wall), playerId);
}

function withWallOwners(axis, walls) {
  return walls.map((wall) => ({
    ...wall,
    ownerId: wallOwners.get(getWallOwnerKey(axis, wall)) ?? null,
  }));
}

function getSnapshotWallKeySet(snapshot) {
  const keys = new Set();

  for (const wall of snapshot?.horizontalWalls ?? []) {
    keys.add(getWallOwnerKey("horizontal", wall));
  }
  for (const wall of snapshot?.verticalWalls ?? []) {
    keys.add(getWallOwnerKey("vertical", wall));
  }

  return keys;
}

function rememberNewWallOwners(beforeKeys, afterSnapshot, playerId) {
  for (const wall of afterSnapshot?.horizontalWalls ?? []) {
    const key = getWallOwnerKey("horizontal", wall);
    if (!beforeKeys.has(key)) {
      wallOwners.set(key, playerId);
    }
  }

  for (const wall of afterSnapshot?.verticalWalls ?? []) {
    const key = getWallOwnerKey("vertical", wall);
    if (!beforeKeys.has(key)) {
      wallOwners.set(key, playerId);
    }
  }
}

function isHumanVsAiMode() {
  return modeSelect?.value == "human-vs-ai";
}

function isAiVsAiMode() {
  return modeSelect?.value == "ai-vs-ai";
}

function getModeLabel() {
  if (isAiVsAiMode()) return "AI vs AI";
  return isHumanVsAiMode() ? "Human vs AI" : "Human vs Human";
}

function getClassGroupLabel(playerId) {
  if (isAiVsAiMode()) {
    return `AI ${playerId} Class`;
  }

  if (isHumanVsAiMode()) {
    return playerId == 1 ? "Your Class" : "AI Class";
  }

  return `Player ${playerId} Class`;
}

function getClassLabel(classId) {
  if (!classId) {
    return "-";
  }

  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function getWallsLabel(player) {
  if (!player?.wallsRemaining) {
    return "-";
  }

  const wallsLabel = player.wallsRemaining.join(" / ");
  return player.extraWalls > 0
    ? `${wallsLabel} + ${player.extraWalls}`
    : wallsLabel;
}

function syncClassChoiceButtons() {
  for (const button of classChoiceButtons) {
    const playerId = Number(button.dataset.classChoicePlayer);
    const isSelected =
      selectedPlayerClasses[playerId] == button.dataset.classId;
    button.classList.toggle("is-selected", isSelected);
  }
}

function syncClassSelectionVisibility() {
  const isHumanVsAi = isHumanVsAiMode();

  playerTwoClassGroup?.classList.toggle("is-hidden", isHumanVsAi);

  for (const title of classGroupTitles) {
    title.textContent = getClassGroupLabel(
      Number(title.dataset.classGroupTitle),
    );
  }
}

function showClassPreview(button) {
  const playerId = Number(button.dataset.classChoicePlayer);
  const classId = button.dataset.classId;

  classPreviewPanel?.classList.add("is-visible");

  if (classPreviewPlayer) {
    classPreviewPlayer.textContent = getClassGroupLabel(playerId);
  }

  if (classPreviewTitle) {
    classPreviewTitle.textContent = button.dataset.classTitle ?? classId;
  }

  if (classPreviewDescription) {
    classPreviewDescription.textContent = button.dataset.classDescription ?? "";
  }

  classPreview?.show({ playerId, classId });
}

function hideClassPreview() {
  classPreviewPanel?.classList.remove("is-visible");
  classPreview?.hide();
}

function showCreditsModal() {
  if (!creditsOverlay) {
    return;
  }

  creditsReturnFocus = document.activeElement;
  creditsOverlay.hidden = false;
  creditsCloseButton?.focus();
}

function hideCreditsModal() {
  if (!creditsOverlay || creditsOverlay.hidden) {
    return;
  }

  creditsOverlay.hidden = true;
  creditsReturnFocus?.focus?.();
  creditsReturnFocus = null;
}

function updateWinnerOverlay(snapshot) {
  const winner = getWinner(snapshot);
  const shouldShow = gameStarted && winner;

  if (shouldShow && announcedWinner !== winner) {
    announcedWinner = winner;
    playVictorySound();
  }

  if (winnerOverlay) {
    winnerOverlay.hidden = !shouldShow;
  }

  if (!shouldShow) {
    return;
  }

  const winningPlayer = snapshot.players?.find((player) => player.id == winner);
  const classLabel = getClassLabel(winningPlayer?.classId);

  if (winnerTitle) {
    winnerTitle.textContent = `Player ${winner} Wins`;
  }

  if (winnerDescription) {
    winnerDescription.textContent = `${classLabel} claims the path.`;
  }
}

function getWinner(snapshot) {
  if (!snapshot) {
    return null;
  }

  const playerOne = snapshot.players?.[0];
  const playerTwo = snapshot.players?.[1];

  if (playerOne?.row == 0) {
    return 1;
  }

  if (playerTwo?.row == snapshot.boardSize - 1) {
    return 2;
  }

  return null;
}

function isGameOver(snapshot) {
  return getWinner(snapshot) !== null;
}

function isAiControlledTurn(snapshot) {
  if (!snapshot) return false;
  if (isAiVsAiMode()) return true;
  return isHumanVsAiMode() && snapshot.currentTurn == 2;
}

function canHumanInteract(snapshot) {
  if (!gameStarted) return false;
  if (!snapshot) return false;
  if (isGameOver(snapshot) || aiTurnInProgress) return false;
  return !isAiControlledTurn(snapshot);
}

function cancelAiLoop() {
  aiLoopToken += 1;
  aiTurnInProgress = false;
}

function delay(ms) {
  return new Promise((r) => window.setTimeout(r, ms));
}

function blockInteraction(message) {
  actionStatusLabel = message;
  renderer.clearMoveSelection();
  renderer.clearWallPlacementSelection();
  updateDevInfo();
}

async function maybeRunAiTurn(options = {}) {
  const { singleStep = false } = options;

  if (!gameStarted || USE_MOCK || !engine || aiTurnInProgress) {
    return;
  }

  const snapshot = await getSnapshot();
  if (!isAiControlledTurn(snapshot) || isGameOver(snapshot)) {
    return;
  }

  if (!singleStep && !aiAutoplayEnabled) {
    refresh();
    return;
  }

  const loopToken = ++aiLoopToken;
  aiTurnInProgress = true;

  try {
    while (true) {
      const currentSnapshot = await getSnapshot();

      if (
        loopToken != aiLoopToken ||
        !currentSnapshot ||
        isGameOver(currentSnapshot) ||
        !isAiControlledTurn(currentSnapshot)
      ) {
        return;
      }

      if (!singleStep && !aiAutoplayEnabled) {
        actionStatusLabel = "Action: AI paused";
        return;
      }

      actionStatusLabel = singleStep
        ? "Action: AI executing next move"
        : "Action: AI thinking";
      await refresh();
      const beforeWallKeys = getSnapshotWallKeySet(currentSnapshot);
      const start = performance.now();
      await engine.doBestMove();
      rememberNewWallOwners(
        beforeWallKeys,
        await getSnapshot(),
        currentSnapshot.currentTurn,
      );
      actionStatusLabel = `Action: AI completed its move (${Math.round(performance.now() - start)} ms)`;
      renderer.clearMoveSelection();
      renderer.clearWallPlacementSelection();
      await refresh();

      if (singleStep) return;

      await delay(AI_MOVE_DELAY_MS);
    }
  } finally {
    if (loopToken == aiLoopToken) {
      aiTurnInProgress = false;
    }
    await refresh();
  }
}

async function tryPlaceSelectedWall(wallSlot) {
  if (!wallSlot || !selectedReserveWall) {
    return;
  }

  const snapshot = await getSnapshot();

  if (isGameOver(snapshot)) {
    blockInteraction("Action: game over, press restart");
    return;
  }

  if (isAiControlledTurn(snapshot)) {
    blockInteraction("Action: wait for AI turn to finish");
    return;
  }

  if (USE_MOCK) {
    actionStatusLabel = `Action: mock place ${wallSlot.axis} wall at (${wallSlot.row}, ${wallSlot.col})`;
    updateDevInfo();
    return;
  }

  if (!engine) {
    actionStatusLabel = "Action: engine not ready";
    updateDevInfo();
    return;
  }

  const result = await engine.placeWall(
    wallSlot.row,
    wallSlot.col,
    getWallSide(wallSlot.axis),
    selectedReserveWall.length,
  );

  if (result === engine.moveResult.INVALID) {
    actionStatusLabel = `Action: invalid ${wallSlot.axis} wall at (${wallSlot.row}, ${wallSlot.col})`;
    updateDevInfo();
    return;
  }

  playActionSound();
  rememberWallOwner(
    wallSlot.axis,
    {
      pos: { row: wallSlot.row, col: wallSlot.col },
      length: selectedReserveWall.length,
    },
    snapshot.currentTurn,
  );
  actionStatusLabel = `Action: placed ${wallSlot.axis} wall at (${wallSlot.row}, ${wallSlot.col})`;
  renderer.commitSelectedReserveWall();
  selectedReserveWall = null;
  selectedReserveWallLabel = "Selected Reserve Wall: none";
  selectedWallLabel = "Selected Wall: none";
  renderer.clearWallPlacementSelection();
  refresh();
  await maybeRunAiTurn();
}

async function tryMovePawn(moveTarget) {
  if (!moveTarget) {
    return;
  }

  if (isGameOver(await getSnapshot())) {
    blockInteraction("Action: game over, press restart");
    return;
  }

  if (isAiControlledTurn(await getSnapshot())) {
    blockInteraction("Action: wait for the AI turn to finish");
    return;
  }

  if (USE_MOCK) {
    actionStatusLabel = `Action: mock move pawn to (${moveTarget.row}, ${moveTarget.col})`;
    selectedMoveTargetLabel = `Selected Move Target: (${moveTarget.row}, ${moveTarget.col})`;
    updateDevInfo();
    return;
  }

  if (!engine) {
    actionStatusLabel = "Action: engine not ready";
    updateDevInfo();
    return;
  }

  const result = await engine.movePawn(moveTarget.row, moveTarget.col);

  if (result === engine.moveResult.INVALID) {
    actionStatusLabel = `Action: invalid pawn move to (${moveTarget.row}, ${moveTarget.col})`;
    selectedMoveTargetLabel = `Selected Move Target: (${moveTarget.row}, ${moveTarget.col})`;
    updateDevInfo();
    return;
  }

  playActionSound();
  actionStatusLabel =
    result === engine.moveResult.WIN
      ? `Action: winning pawn move to (${moveTarget.row}, ${moveTarget.col})`
      : `Action: moved pawn to (${moveTarget.row}, ${moveTarget.col})`;
  selectedMoveTargetLabel = "Selected Move Target: none";
  renderer.clearMoveSelection();
  refresh();

  if (result !== engine.moveResult.WIN) {
    await maybeRunAiTurn();
  }
}

const renderer = createRenderer3D(boardViewport, {
  canInteract: () => canHumanInteract(latestSnapshot),
  onHoverCell: (cell) => {
    hoverCellLabel = cell
      ? `Hovered Cell: (${cell.row}, ${cell.col})`
      : "Hovered Cell: none";
    updateDevInfo();
  },
  onHoverWallSlot: (wallSlot) => {
    hoverWallLabel = wallSlot
      ? `Hovered Wall: ${wallSlot.axis} (${wallSlot.row}, ${wallSlot.col})`
      : "Hovered Wall: none";
    updateDevInfo();
  },
  onSelectCell: (cell) => {
    selectedCellLabel = cell
      ? `Selected Cell: (${cell.row}, ${cell.col})`
      : "Selected Cell: none";
    updateDevInfo();
  },
  onSelectWallSlot: (wallSlot) => {
    selectedWallLabel = wallSlot
      ? `Selected Wall: ${wallSlot.axis} (${wallSlot.row}, ${wallSlot.col})`
      : "Selected Wall: none";
    updateDevInfo();
    tryPlaceSelectedWall(wallSlot);
  },
  onSelectReserveWall: (reserveWall) => {
    selectedReserveWall = reserveWall;
    selectedReserveWallLabel = reserveWall
      ? `Selected Reserve Wall: ${reserveWall.key}`
      : "Selected Reserve Wall: none";
    if (!reserveWall) {
      selectedWallLabel = "Selected Wall: none";
    }
    updateDevInfo();
  },
  onSelectMoveTarget: (moveTarget) => {
    selectedMoveTargetLabel = moveTarget
      ? `Selected Move Target: (${moveTarget.row}, ${moveTarget.col})`
      : "Selected Move Target: none";
    updateDevInfo();
    tryMovePawn(moveTarget);
  },
  onFpsUpdate: (fps) => {
    fpsLabel = `FPS: ${fps}`;
    updateDevInfo();
  },
});

// Still temporaray
async function createEngineSnapshot() {
  if (USE_MOCK) return MOCK_SNAPSHOT;

  const walls = await engine.getWalls();

  return {
    boardSize: 7,
    currentTurn: await engine.getCurrentTurn(),
    winner: null,
    players: [
      {
        id: 1,
        row: await engine.getPlayerRow(1),
        col: await engine.getPlayerCol(1),
        wallsRemaining: await engine.getRemainingWalls(1),
        extraWalls: await engine.getExtraWalls(1),
        classId: selectedPlayerClasses[1],
      },
      {
        id: 2,
        row: await engine.getPlayerRow(2),
        col: await engine.getPlayerCol(2),
        wallsRemaining: await engine.getRemainingWalls(2),
        extraWalls: await engine.getExtraWalls(2),
        classId: selectedPlayerClasses[2],
      },
    ],
    horizontalWalls: withWallOwners(
      "horizontal",
      walls.filter((w) => w.side == engine.wallSide.BOTTOM_SIDE),
    ),
    verticalWalls: withWallOwners(
      "vertical",
      walls.filter((w) => w.side == engine.wallSide.RIGHT_SIDE),
    ),
    legalPawnMoves: await engine.getLegalPawnMoves(),
    evaluation: await engine.evaluate(),
    // buildTime: engine.buildTime(),
  };
}

function getSnapshot() {
  if (!engine) return null;
  return createEngineSnapshot();
}

function updateStatus(snapshot) {
  const playerOne = snapshot?.players?.[0];
  const playerTwo = snapshot?.players?.[1];
  const winner = getWinner(snapshot);

  let statusTextMessage;

  if (!snapshot) {
    statusTextMessage =
      engineStatus == "Engine Ready" ? "Preparing game..." : engineStatus;
  } else {
    if (winner) {
      statusTextMessage = `Player ${winner} wins.`;
    } else if (aiTurnInProgress) {
      statusTextMessage = `AI is thinking...`;
    } else if (isAiControlledTurn(snapshot) && !aiAutoplayEnabled) {
      statusTextMessage = `AI paused. Player ${snapshot.currentTurn} is waiting`;
    } else {
      statusTextMessage = `Player ${snapshot.currentTurn}'s turn`;
    }
  }

  statusText.textContent = statusTextMessage;
  infoCurrentTurn.textContent = snapshot
    ? winner
      ? `Player ${winner} won`
      : `Player ${snapshot.currentTurn}`
    : "Unavailable";
  infoPlayerOneWalls.textContent = getWallsLabel(playerOne);
  infoPlayerTwoWalls.textContent = getWallsLabel(playerTwo);
  if (infoPlayerOneClass) {
    infoPlayerOneClass.textContent = getClassLabel(playerOne?.classId);
  }
  if (infoPlayerTwoClass) {
    infoPlayerTwoClass.textContent = getClassLabel(playerTwo?.classId);
  }
  evaluation = snapshot ? snapshot.evaluation : 0;
  updateDevInfo();
}

function updateControlState(snapshot) {
  const aiModeEnabled = isHumanVsAiMode() || isAiVsAiMode();
  const gameOver = isGameOver(snapshot);
  const aiTurn = isAiControlledTurn(snapshot);

  if (modeDisplayText) {
    modeDisplayText.textContent = getModeLabel();
  }

  if (aiToggleButton) {
    aiToggleButton.hidden = !aiModeEnabled;
    aiToggleButton.textContent = aiAutoplayEnabled ? "Pause AI" : "Start AI";
    aiToggleButton.disabled = !aiModeEnabled || !snapshot || gameOver;
  }

  if (aiStepButton) {
    aiStepButton.hidden = !aiModeEnabled;
    aiStepButton.disabled =
      !aiModeEnabled || !snapshot || gameOver || aiTurnInProgress || !aiTurn;
  }

  if (startGameButton) {
    startGameButton.disabled = !engine;
    startGameButton.textContent = engine ? "Start Game" : "Loading Engine";
  }
}

function syncGameInfoCollapsed() {
  gameSidebar?.classList.toggle("is-info-collapsed", gameInfoCollapsed);
}

async function refresh() {
  const snapshot = await getSnapshot();
  latestSnapshot = snapshot;
  renderer.render(snapshot, {
    mode: modeSelect.value,
    engineStatus,
    menuActive: !gameStarted,
  });
  updateStatus(snapshot);
  updateControlState(snapshot);
  updateWinnerOverlay(snapshot);
}

function syncMenuModeButtons() {
  for (const button of menuModeButtons) {
    const isSelected = button.dataset.menuMode == modeSelect?.value;
    button.classList.toggle("is-selected", isSelected);
  }

  syncClassSelectionVisibility();
}

function clearSelections() {
  selectedMoveTargetLabel = "Selected Move Target: none";
  selectedWallLabel = "Selected Wall: none";
  selectedReserveWallLabel = "Selected Reserve Wall: none";
  selectedCellLabel = "Selected Cell: none";
  selectedReserveWall = null;
  renderer.clearMoveSelection();
  renderer.clearWallPlacementSelection();
}

async function resetCurrentGame(actionLabel, isRestart = false) {
  cancelAiLoop();
  if (engine && isRestart) {
    await engine.restartMatch();
  }
  announcedWinner = null;
  wallOwners.clear();
  actionStatusLabel = actionLabel;
  clearSelections();
  await refresh();
}

async function startGame() {
  if (!engine) {
    return;
  }
  stopOpeningMusic();
  playGameMusic();
  await engine.reset();
  await engine.setPlayerClass(1, pawnClasses[selectedPlayerClasses[1]]);
  if (!isHumanVsAiMode()) {
    await engine.setPlayerClass(2, pawnClasses[selectedPlayerClasses[2]]);
  }
  const classes = await engine.startMatch();
  selectedPlayerClasses[1] = pawnClassesFromString[classes[0]];
  selectedPlayerClasses[2] = pawnClassesFromString[classes[1]];
  hideClassPreview();
  gameStarted = true;
  gameStage?.classList.add("is-playing");
  await resetCurrentGame("Action: game started");
  await maybeRunAiTurn();
}

async function showMainMenu() {
  gameStarted = false;
  announcedWinner = null;
  cancelAiLoop();
  stopGameMusic();
  playOpeningMusic();
  gameStage?.classList.remove("is-playing");
  actionStatusLabel = "Action: returned to main menu";
  clearSelections();
  await refresh();
}

function createEngineProxy(wasmModule) {
  function makeFunction(name) {
    return (...args) => {
      return new Promise((res) => {
        const id = (Math.random() + 1).toString(36).substring(7);
        const fn = (event) => {
          if (event.data.id == id) {
            res(event.data.ret);
            worker.removeEventListener("message", fn);
          }
        };
        worker.addEventListener("message", fn);
        worker.postMessage({
          name: name,
          args: args,
          id: id,
        });
      });
    };
  }

  return new Proxy(wasmModule, {
    get(target, prop) {
      const value = Reflect.get(...arguments);
      if (value === undefined) {
        return makeFunction(prop);
      }
      return value;
    },
  });
}

async function initializeEngine() {
  try {
    const wasmModule = await new Promise((res) => {
      const fn = (event) => {
        res(event.data);
        worker.removeEventListener("message", fn);
      };
      worker.addEventListener("message", fn);
    });
    console.log(wasmModule);
    engine = createEngineProxy(wasmModule);
    buildTime = wasmModule.BUILD_TIME;
    pawnClasses = wasmModule.pawnClasses;
    pawnClassesFromString = Object.fromEntries(
      Object.entries(pawnClasses).map(([key, value]) => [value, key]),
    );
    engineStatus = "Engine Ready";
    await refresh();
    return true;
  } catch (error) {
    engineStatus = "Engine not loaded";
    console.error(error);
    await refresh();
    return false;
  }
}

modeSelect?.addEventListener("change", async () => {
  cancelAiLoop();
  actionStatusLabel = "Action: mode changed";
  renderer.clearMoveSelection();
  renderer.clearWallPlacementSelection();
  hideClassPreview();
  syncMenuModeButtons();
  refresh();
  await maybeRunAiTurn();
});

for (const button of menuModeButtons) {
  button.addEventListener("click", () => {
    if (!modeSelect) {
      return;
    }

    playMenuSelectSound();
    modeSelect.value = button.dataset.menuMode;
    modeSelect.dispatchEvent(new Event("change"));
  });
}

for (const button of classChoiceButtons) {
  button.addEventListener("click", () => {
    playMenuSelectSound();
    const playerId = Number(button.dataset.classChoicePlayer);
    selectedPlayerClasses[playerId] = button.dataset.classId;
    syncClassChoiceButtons();
  });

  button.addEventListener("pointerenter", () => {
    showClassPreview(button);
  });

  button.addEventListener("focus", () => {
    showClassPreview(button);
  });

  button.addEventListener("pointerleave", () => {
    hideClassPreview();
  });

  button.addEventListener("blur", () => {
    hideClassPreview();
  });
}

startGameButton?.addEventListener("click", () => {
  if (!engine) {
    return;
  }

  playStartGameSound();
  startGame();
});

creditsButton?.addEventListener("click", () => {
  playGameButtonSound();
  showCreditsModal();
});

creditsCloseButton?.addEventListener("click", () => {
  playGameButtonSound();
  hideCreditsModal();
});

creditsOverlay?.addEventListener("click", (event) => {
  if (event.target === creditsOverlay) {
    hideCreditsModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideCreditsModal();
  }
});

mainMenuButton?.addEventListener("click", () => {
  playGameButtonSound();
  showMainMenu();
});

debugToggle?.addEventListener("change", () => {
  if (devInfo) {
    devInfo.hidden = !debugToggle.checked;
  }
});

gameInfoToggle?.addEventListener("click", () => {
  playGameButtonSound();
  gameInfoCollapsed = !gameInfoCollapsed;
  syncGameInfoCollapsed();
});

aiToggleButton?.addEventListener("click", async () => {
  playGameButtonSound();
  aiAutoplayEnabled = !aiAutoplayEnabled;
  actionStatusLabel = aiAutoplayEnabled
    ? "Action: AI autoplay resumed"
    : "Action: AI autoplay paused";
  await refresh();

  if (aiAutoplayEnabled) {
    await maybeRunAiTurn();
  }
});

aiStepButton?.addEventListener("click", async () => {
  playGameButtonSound();
  actionStatusLabel = "Action: stepping AI move";
  await refresh();
  await maybeRunAiTurn({ singleStep: true });
});

restartButton?.addEventListener("click", async () => {
  playGameButtonSound();
  await resetCurrentGame("Action: game restarted", true);
  await maybeRunAiTurn();
});

winnerRestartButton?.addEventListener("click", async () => {
  playGameButtonSound();
  await resetCurrentGame("Action: game restarted", true);
  await maybeRunAiTurn();
});

winnerMainMenuButton?.addEventListener("click", () => {
  playGameButtonSound();
  showMainMenu();
});

syncMenuModeButtons();
syncClassChoiceButtons();
syncGameInfoCollapsed();
playOpeningMusic();
refresh();
initializeEngine();
