import { createRenderer3D } from "./renderer3d.js";
import { createClassPreviewRenderer } from "./renderer3d/classPreview.js";

const gameStage = document.querySelector(".game-stage");
const mainMenu = document.getElementById("main-menu");
const startGameButton = document.getElementById("start-game-button");
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
let aiTurnInProgress = false;
let aiAutoplayEnabled = true;
let aiLoopToken = 0;
let latestSnapshot = null;
let gameStarted = false;

let buildTime = "";

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
    },
    {
      id: 2,
      row: 0,
      col: 3,
      wallsRemaining: [4, 3, 1],
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
  devInfoText.innerHTML = `Engine Status: ${engineStatus}<br>${hoverCellLabel}<br>${hoverWallLabel}<br>${selectedCellLabel}<br>${selectedWallLabel}<br>${selectedReserveWallLabel}<br>${selectedMoveTargetLabel}<br>${actionStatusLabel}<br>Evaluation: ${evaluation}<br>Build Time: ${buildTime}`;
}

function getWallSide(axis) {
  return axis === "horizontal"
    ? engine.wallSide.BOTTOM_SIDE
    : engine.wallSide.RIGHT_SIDE;
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
      await engine.doBestMove();
      actionStatusLabel = "Action: AI completed its move";
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

  if (isGameOver(await getSnapshot())) {
    blockInteraction("Action: game over, press restart");
    return;
  }

  if (isAiControlledTurn(await getSnapshot())) {
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
});

// Still temporaray
async function createEngineSnapshot() {
  if (USE_MOCK) return MOCK_SNAPSHOT;

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
        classId: selectedPlayerClasses[1],
      },
      {
        id: 2,
        row: await engine.getPlayerRow(2),
        col: await engine.getPlayerCol(2),
        wallsRemaining: await engine.getRemainingWalls(2),
        classId: selectedPlayerClasses[2],
      },
    ],
    horizontalWalls: (await engine.getWalls()).filter(
      (w) => w.side == engine.wallSide.BOTTOM_SIDE,
    ),
    verticalWalls: (await engine.getWalls()).filter(
      (w) => w.side == engine.wallSide.RIGHT_SIDE,
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
  infoPlayerOneWalls.textContent = playerOne
    ? `${playerOne.wallsRemaining}`
    : "-";
  infoPlayerTwoWalls.textContent = playerTwo
    ? `${playerTwo.wallsRemaining}`
    : "-";
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

async function resetCurrentGame(actionLabel) {
  cancelAiLoop();
  if (engine) {
    await engine.reset();
  }
  actionStatusLabel = actionLabel;
  clearSelections();
  await refresh();
}

async function startGame() {
  if (!engine) {
    return;
  }

  hideClassPreview();
  gameStarted = true;
  gameStage?.classList.add("is-playing");
  await resetCurrentGame("Action: game started");
  await maybeRunAiTurn();
}

async function showMainMenu() {
  gameStarted = false;
  cancelAiLoop();
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
    engineStatus = "Engine Ready";
  } catch (error) {
    engineStatus = "Engine not loaded";
    console.error(error);
  }
  refresh();
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

    modeSelect.value = button.dataset.menuMode;
    modeSelect.dispatchEvent(new Event("change"));
  });
}

for (const button of classChoiceButtons) {
  button.addEventListener("click", () => {
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
  startGame();
});

mainMenuButton?.addEventListener("click", () => {
  showMainMenu();
});

debugToggle?.addEventListener("change", () => {
  if (devInfo) {
    devInfo.hidden = !debugToggle.checked;
  }
});

aiToggleButton?.addEventListener("click", async () => {
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
  actionStatusLabel = "Action: stepping AI move";
  await refresh();
  await maybeRunAiTurn({ singleStep: true });
});

restartButton?.addEventListener("click", async () => {
  await resetCurrentGame("Action: game restarted");
  await maybeRunAiTurn();
});

syncMenuModeButtons();
syncClassChoiceButtons();
refresh();
initializeEngine();
