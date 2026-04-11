const canvas = document.getElementById("game-canvas");
const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get a 2d drawing context");
}

const BOARD_SIZE = 7;
const BOARD_MARGIN = 72;
const CELL_SIZE = (canvas.width - BOARD_MARGIN * 2) / BOARD_SIZE;
const PAWN_RADIUS = CELL_SIZE * 0.24;

function createMockSnapshot() {
  return {
    boardSize: BOARD_SIZE,
    currentTurn: 1,
    winner: null,
    players: [
      { id: 1, row: 0, col: 3, wallsRemaining: 8 },
      { id: 2, row: 0, col: 3, wallsRemaining: 8 },
    ],
    horizontalWalls: [],
    verticalWalls: [],
  };
}

function getDisplayState() {
  let gameSnapshot = createMockSnapshot();
  return gameSnapshot;
}

function drawGrid() {
  context.strokeStyle = "#b29268";
  context.lineWidth = 2;

  for (let i = 0; i <= BOARD_SIZE; i++) {
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
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
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
    CELL_SIZE * BOARD_SIZE,
    CELL_SIZE,
  );
  context.fillRect(
    BOARD_MARGIN,
    BOARD_MARGIN + CELL_SIZE * (BOARD_SIZE - 1),
    CELL_SIZE * BOARD_SIZE,
    CELL_SIZE,
  );
}

function drawFrame() {
  context.strokeStyle = "#8f6a41";
  context.lineWidth = 6;
  context.strokeRect(
    BOARD_MARGIN,
    BOARD_MARGIN,
    CELL_SIZE * BOARD_SIZE,
    CELL_SIZE * BOARD_SIZE,
  );
}

function render(snapshot) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawCells();
  drawGrid();
  drawGoalRows();
  drawFrame();
}

function updateStatus() {
  const modeLabel =
    modeSelect.value === "human-vs-ai" ? "Human vs AI" : "Human vs Human";

  statusText.textContent = `Board ready. Current setup: ${modeLabel}`;
}

modeSelect?.addEventListener("change", () => {
  updateStatus();
});

restartButton?.addEventListener("click", () => {
  render();
});

render();
updateStatus();
