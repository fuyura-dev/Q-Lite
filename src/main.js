const canvas = document.getElementById("game-canvas");
const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");
const infoCurrentTurn = document.getElementById("info-current-turn");
const infoPlayerOneWalls = document.getElementById("info-player-one-walls");
const infoPlayerTwoWalls = document.getElementById("info-player-two-walls");

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get a 2d drawing context");
}

const GRID_SIZE = 7;
const BOARD_MARGIN = 72;
const CELL_SIZE = (canvas.width - BOARD_MARGIN * 2) / GRID_SIZE;
const PAWN_RADIUS = CELL_SIZE * 0.24;
const WALL_THICKNESS = 12;

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

function getDisplayState() {
  // TODO
  let gameSnapshot = createMockSnapshot();
  return gameSnapshot;
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
    context.fillRect(x, y, CELL_SIZE * 2, WALL_THICKNESS);
  });

  snapshot.verticalWalls.forEach((wall) => {
    const x = BOARD_MARGIN + (wall.col + 1) * CELL_SIZE - WALL_THICKNESS / 2;
    const y = BOARD_MARGIN + wall.row * CELL_SIZE;
    context.fillRect(x, y, WALL_THICKNESS, CELL_SIZE * 2);
  });
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
}

function refresh() {
  const snapshot = getDisplayState();
  render(snapshot);
  updateStatus(snapshot);
}

modeSelect?.addEventListener("change", () => {
  refresh();
});

restartButton?.addEventListener("click", () => {
  refresh();
});

refresh();
