import qlite from "./wasm/wasmbuild.js";
import { createRenderer3D } from "./renderer3d.js";

const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");
const infoCurrentTurn = document.getElementById("info-current-turn");
const infoPlayerOneWalls = document.getElementById("info-player-one-walls");
const infoPlayerTwoWalls = document.getElementById("info-player-two-walls");

// TEMP
const devInfoText = document.getElementById("dev-info-text");

const boardViewport = document.getElementById("board-viewport");

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
let buildTime = ""

const USE_MOCK = false;

const MOCK_SNAPSHOT = {
  boardSize: 7,
  currentTurn: 1,
  winner: null,
  players: [
    {
      id: 1,
      row: 6,
      col: 3,
      wallsRemaining: 6,
    },
    {
      id: 2,
      row: 0,
      col: 3,
      wallsRemaining: 7,
    },
  ],
  horizontalWalls: [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 4, col: 3 },
    { row: 4, col: 2 },
  ],
  verticalWalls: [
    { row: 2, col: 1 },
    { row: 3, col: 1 },
    { row: 1, col: 5 },
    { row: 2, col: 5 },
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

function isAiTurn(snapshot) {
  return isHumanVsAiMode() && snapshot?.currentTurn == 2;
}

async function maybeRunAiTurn() {
  if (USE_MOCK || !engine || aiTurnInProgress) {
    return;
  }

  const snapshot = getSnapshot();
  if (!isAiTurn(snapshot) || isGameOver(snapshot)) {
    return;
  }

  aiTurnInProgress = true;
  actionStatusLabel = "Action: AI thinking...";
  refresh();

  await new Promise((res) => window.setTimeout(res, 150));

  engine.doBestMove();
  aiTurnInProgress = false;
  actionStatusLabel = "Action: AI completed its move";
  renderer.clearMoveSelection();
  renderer.clearWallPlacementSelection();
  refresh();
}

async function tryPlaceSelectedWall(wallSlot) {
  if (!wallSlot || !selectedReserveWall) {
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

  const result = engine.placeWall(
    wallSlot.row,
    wallSlot.col,
    getWallSide(wallSlot.axis),
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

  const result = engine.movePawn(moveTarget.row, moveTarget.col);

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

function arrayify(vector) {
  const result = [];
  for (const v of vector) {
    result.push(v);
  }
  return result;
}

// Still temporaray
function createEngineSnapshot() {
  if (USE_MOCK) return MOCK_SNAPSHOT;

  return {
    boardSize: 7,
    currentTurn: engine.getCurrentTurn(),
    winner: null,
    players: [
      {
        id: 1,
        row: engine.getPlayerRow(1),
        col: engine.getPlayerCol(1),
        wallsRemaining: engine.getRemainingWalls(1),
      },
      {
        id: 2,
        row: engine.getPlayerRow(2),
        col: engine.getPlayerCol(2),
        wallsRemaining: engine.getRemainingWalls(2),
      },
    ],
    horizontalWalls: arrayify(engine.getHorizontalWalls()),
    verticalWalls: arrayify(engine.getVerticalWalls()),
    legalPawnMoves: arrayify(engine.getLegalPawnMoves()),
    evaluation: engine.evaluate(),
    buildTime: engine.buildTime()
  };
}

function getSnapshot() {
  if (!engine) return null;
  return createEngineSnapshot();
}

function updateStatus(snapshot) {
  const modeLabel =
    modeSelect.value === "human-vs-ai" ? "Human vs AI" : "Human vs Human";
  const playerOne = snapshot?.players?.[0];
  const playerTwo = snapshot?.players?.[1];
  const winner = getWinner(snapshot);

  let statusTextMessage;

  if (!snapshot) {
    statusTextMessage = engineStatus;
  } else {
    const setup = `Current Setup: ${modeLabel}`;

    if (winner) {
      statusTextMessage = `Player ${winner} wins. ${setup}`;
    } else if (aiTurnInProgress) {
      statusTextMessage = `AI is thinking. ${setup}`;
    } else {
      statusTextMessage = `Renderer ready. ${setup}`;
    }
  }

  statusText.textContent = statusTextMessage;
  infoCurrentTurn.textContent = snapshot
    ? `Player ${snapshot.currentTurn}`
    : "Unavailable";
  infoPlayerOneWalls.textContent = playerOne
    ? `${playerOne.wallsRemaining}`
    : "-";
  infoPlayerTwoWalls.textContent = playerTwo
    ? `${playerTwo.wallsRemaining}`
    : "-";
  evaluation = snapshot ? snapshot.evaluation : 0;
  buildTime = snapshot ? snapshot.buildTime : "";
  updateDevInfo();
}

function refresh() {
  const snapshot = getSnapshot();
  renderer.render(snapshot, {
    mode: modeSelect.value,
    engineStatus,
  });
  updateStatus(snapshot);
}

async function initializeEngine() {
  try {
    const wasmModule = await qlite();
    engine = new wasmModule.Engine();
    engine.wallSide = wasmModule.wallSide;
    engine.moveResult = wasmModule.moveResult;
    buildTime = wasmModule.BUILD_TIME;
    engineStatus = "Engine Ready";
  } catch (error) {
    engineStatus = "Engine not loaded";
    console.error(error);
  }
  refresh();
}

modeSelect?.addEventListener("change", () => {
  refresh();
  void maybeRunAiTurn();
});

restartButton?.addEventListener("click", () => {
  if (engine) {
    engine.reset();
  }
  aiTurnInProgress = false;
  refresh();
});

refresh();
initializeEngine();
