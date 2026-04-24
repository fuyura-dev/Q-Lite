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

const renderer = createRenderer3D(boardViewport);

function arrayify(vector) {
  const result = [];
  for (const v of vector) {
    result.push(v);
  }
  return result;
}

// Still temporaray
function createEngineSnapshot() {
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
  devInfoText.innerHTML = `Engine Status: ${engineStatus}`;
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
