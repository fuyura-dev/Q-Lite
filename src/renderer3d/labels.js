import * as THREE from "three";

const LABEL_WIDTH = 256;
const LABEL_HEIGHT = 70;
const LABEL_SCALE_X = 1.18;
const LABEL_SCALE_Y = 0.35;

const PLAYER_ACCENTS = {
  1: "#d99a38",
  2: "#58a45b",
};

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

export function createPlayerLabel(playerId) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const accentColor = PLAYER_ACCENTS[playerId] ?? "#ffffff";
  const label = `Player ${playerId}`;

  canvas.width = LABEL_WIDTH;
  canvas.height = LABEL_HEIGHT;

  context.clearRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
  context.shadowColor = "rgba(0, 0, 0, 0.55)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 4;
  context.fillStyle = "rgba(8, 14, 20, 0.78)";
  drawRoundedRect(context, 10, 10, LABEL_WIDTH - 20, LABEL_HEIGHT - 20, 18);
  context.fill();

  context.shadowColor = "transparent";
  context.lineWidth = 4;
  context.strokeStyle = accentColor;
  drawRoundedRect(context, 12, 12, LABEL_WIDTH - 24, LABEL_HEIGHT - 24, 16);
  context.stroke();

  context.fillStyle = "#f7f3e9";
  context.font = "700 34px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, LABEL_WIDTH / 2, LABEL_HEIGHT / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);

  sprite.scale.set(LABEL_SCALE_X, LABEL_SCALE_Y, 1);
  sprite.renderOrder = 10;
  return sprite;
}
