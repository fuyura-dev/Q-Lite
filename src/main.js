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

const USE_MOCK = true;

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
};

function updateDevInfo() {
  devInfoText.innerHTML = `Engine Status: ${engineStatus}<br>${hoverCellLabel}<br>${hoverWallLabel}<br>${selectedCellLabel}<br>${selectedWallLabel}`;
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
