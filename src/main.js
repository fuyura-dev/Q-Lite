import qlite from "./wasm/wasmbuild.js";

const canvas = document.getElementById("game-canvas");
const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");
const infoCurrentTurn = document.getElementById("info-current-turn");
const infoPlayerOneWalls = document.getElementById("info-player-one-walls");
const infoPlayerTwoWalls = document.getElementById("info-player-two-walls");

// TEMP
const devInfoText = document.getElementById("dev-info-text");

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get a 2d drawing context");
}

const GRID_SIZE = 7;
const BOARD_MARGIN = 72;
const CELL_SIZE = (canvas.width - BOARD_MARGIN * 2) / GRID_SIZE;
const PAWN_RADIUS = CELL_SIZE * 0.24;
const WALL_THICKNESS = 12;
let selectedCell = null;
let engine = null;
let engineStatus = "Loading Engine...";

function createMockSnapshot() {
  return {
    boardSize: GRID_SIZE,
    currentTurn: 2,
    winner: null,
    players: [
      {
        id: 1,
        row: GRID_SIZE - 1,
        col: Math.floor(GRID_SIZE / 2),
        wallsRemaining: 2,
      },
      { id: 2, row: 0, col: Math.floor(GRID_SIZE / 2), wallsRemaining: 3 },
    ],
    horizontalWalls: [{ row: 1, col: 2 }],
    verticalWalls: [{ row: 2, col: 4 }],
  };
}

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
    boardSize: GRID_SIZE,
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
    verticalWalls: arrayify(engine.getVerticalWalls())
  };
}

function getDisplayState() {
  // TODO: Remove fallback once engine is complete
  return engine ? createEngineSnapshot() : createMockSnapshot();
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

function drawGrid() {
  context.strokeStyle = "#b29268";
  context.lineWidth = 2;

  for (let i = 0; i <= GRID_SIZE; i++) {
    const position = BOARD_MARGIN + i * CELL_SIZE;

    context.beginPath();
    context.moveTo(BOARD_MARGIN, position);
    context.lineTo(canvas.width - BOARD_MARGIN, position);
    context.stroke();

    context.beginPath();
    context.moveTo(position, BOARD_MARGIN);
    context.lineTo(position, canvas.height - BOARD_MARGIN);
    context.stroke();
  }
}

function drawBackground() {
  context.fillStyle = "#efe3cf";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCells() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = BOARD_MARGIN + j * CELL_SIZE;
      const y = BOARD_MARGIN + i * CELL_SIZE;
      const isLight = (i + j) % 2 === 0;

      context.fillStyle = isLight ? "#fdf6ea" : "#f4e7d2";
      context.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawGoalRows() {
  context.fillStyle = "#702b2b36";
  context.fillRect(
    BOARD_MARGIN,
    BOARD_MARGIN,
    CELL_SIZE * GRID_SIZE,
    CELL_SIZE,
  );
  context.fillRect(
    BOARD_MARGIN,
    BOARD_MARGIN + CELL_SIZE * (GRID_SIZE - 1),
    CELL_SIZE * GRID_SIZE,
    CELL_SIZE,
  );
}

function drawFrame() {
  context.strokeStyle = "#8f6a41";
  context.lineWidth = 6;
  context.strokeRect(
    BOARD_MARGIN,
    BOARD_MARGIN,
    CELL_SIZE * GRID_SIZE,
    CELL_SIZE * GRID_SIZE,
  );
}

function getCellCenter(row, col) {
  return {
    x: BOARD_MARGIN + col * CELL_SIZE + CELL_SIZE / 2,
    y: BOARD_MARGIN + row * CELL_SIZE + CELL_SIZE / 2,
  };
}

function drawPawns(snapshot) {
  const pawnColors = {
    1: { fill: "#8c5e34", stroke: "#5e3b18" },
    2: { fill: "#2f4858", stroke: "#1b2d37" },
  };

  snapshot.players.forEach((player) => {
    const { x, y } = getCellCenter(player.row, player.col);
    const colors = pawnColors[player.id];

    context.beginPath();
    context.fillStyle = colors.fill;
    context.strokeStyle = colors.stroke;
    context.lineWidth = 4;
    context.arc(x, y, PAWN_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });
}

function drawWalls(snapshot) {
  context.fillStyle = "#6f4a2d";

  snapshot.horizontalWalls.forEach((wall) => {
    const x = BOARD_MARGIN + wall.col * CELL_SIZE;
    const y = BOARD_MARGIN + (wall.row + 1) * CELL_SIZE - WALL_THICKNESS / 2;
    context.fillRect(x, y, CELL_SIZE, WALL_THICKNESS);
  });

  snapshot.verticalWalls.forEach((wall) => {
    const x = BOARD_MARGIN + (wall.col + 1) * CELL_SIZE - WALL_THICKNESS / 2;
    const y = BOARD_MARGIN + wall.row * CELL_SIZE;
    context.fillRect(x, y, WALL_THICKNESS, CELL_SIZE);
  });
}

function drawSelectedCell() {
  if (!selectedCell) {
    return;
  }

  const x = BOARD_MARGIN + selectedCell.col * CELL_SIZE;
  const y = BOARD_MARGIN + selectedCell.row * CELL_SIZE;

  context.strokeStyle = "#8c5e34";
  context.lineWidth = 3;
  context.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
}

function render(snapshot) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawCells();
  drawGrid();
  drawGoalRows();
  drawFrame();
  drawPawns(snapshot);
  drawWalls(snapshot);
  drawSelectedCell();
}

function updateStatus(snapshot) {
  const modeLabel =
    modeSelect.value === "human-vs-ai" ? "Human vs AI" : "Human vs Human";
  const playerOne = snapshot.players[0];
  const playerTwo = snapshot.players[1];

  statusText.textContent = `Board ready. Current setup: ${modeLabel}`;
  infoCurrentTurn.textContent = `Player ${snapshot.currentTurn}`;
  infoPlayerOneWalls.textContent = `${playerOne.wallsRemaining}`;
  infoPlayerTwoWalls.textContent = `${playerTwo.wallsRemaining}`;

  const selectedText = selectedCell
    ? `Selected cell: row ${selectedCell.row}, col ${selectedCell.col}`
    : "blank";
  const devText = selectedText;
  const devEngineStatus = `Engine Status: ${engineStatus}`;
  devInfoText.innerHTML = `${devText}<br>${devEngineStatus}`;
}

function refresh() {
  const snapshot = getDisplayState();
  render(snapshot);
  updateStatus(snapshot);
}

function getBoardCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const boardStart = BOARD_MARGIN;
  const boardEnd = boardStart + CELL_SIZE * GRID_SIZE;

  if (
    canvasX < boardStart ||
    canvasX >= boardEnd ||
    canvasY < boardStart ||
    canvasY >= boardEnd
  ) {
    return null;
  }

  return {
    row: Math.floor((canvasY - boardStart) / CELL_SIZE),
    col: Math.floor((canvasX - boardStart) / CELL_SIZE),
  };
}

modeSelect?.addEventListener("change", () => {
  refresh();
});

restartButton?.addEventListener("click", () => {
  selectedCell = null;
  refresh();
});

canvas?.addEventListener("click", (event) => {
  selectedCell = getBoardCellFromEvent(event);
  refresh();
});

refresh();
initializeEngine();
