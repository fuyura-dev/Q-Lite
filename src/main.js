const canvas = document.getElementById("game-canvas");
const statusText = document.getElementById("status-text");
const restartButton = document.getElementById("restart-button");
const modeSelect = document.getElementById("mode-select");

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Could not get a 2d drawing context");
}

function drawBoard() {
  context.fillStyle = "#efe3cf";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#b29268";
  context.lineWidth = 2;

  const margin = 72;
  const boardSize = 7;
  const cellSize = (canvas.width - margin * 2) / boardSize;

  for (let i = 0; i <= boardSize; i++) {
    const position = margin + i * cellSize;

    context.beginPath();
    context.moveTo(margin, position);
    context.lineTo(canvas.width - margin, position);
    context.stroke();

    context.beginPath();
    context.moveTo(position, margin);
    context.lineTo(position, canvas.height - margin);
    context.stroke();
  }
}

drawBoard();
