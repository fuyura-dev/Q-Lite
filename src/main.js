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
  devInfoText.innerHTML = `Engine Status: ${engineStatus}<br>${hoverCellLabel}<br>${hoverWallLabel}<br>${selectedCellLabel}<br>${selectedWallLabel}<br>${selectedReserveWallLabel}<br>${selectedMoveTargetLabel}<br>${actionStatusLabel}<br>Evaluation: ${evaluation}`;
}

function getWallSide(axis) {
  return axis === "horizontal"
    ? engine.wallSide.BOTTOM_SIDE
    : engine.wallSide.RIGHT_SIDE;
}

function tryPlaceSelectedWall(wallSlot) {
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
}

function tryMovePawn(moveTarget) {
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
    evaluation: engine.evaluate()
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

  statusText.textContent = snapshot
    ? `Renderer ready. Current setup: ${modeLabel}`
    : engineStatus;
  infoCurrentTurn.textContent = snapshot
    ? `Player ${snapshot.currentTurn}`
    : "Unavailable";
  infoPlayerOneWalls.textContent = playerOne
    ? `${playerOne.wallsRemaining}`
    : "-";
  infoPlayerTwoWalls.textContent = playerTwo
    ? `${playerTwo.wallsRemaining}`
    : "-";
  evaluation = snapshot ? snapshot.evaluation : 0
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
    engineStatus = "Engine Ready";
  } catch (error) {
    engineStatus = "Engine not loaded";
    console.error(error);
  }
  refresh();
}

modeSelect?.addEventListener("change", () => {
  refresh();
});

restartButton?.addEventListener("click", () => {
  if (engine) {
    engine.reset();
  }
  refresh();
});

refresh();
initializeEngine();
