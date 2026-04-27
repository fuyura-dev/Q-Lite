import {
  HALF_BOARD,
  CELL_SIZE,
  LANE_SIZE,
  CELL_HEIGHT,
  WALL_HEIGHT,
} from "./constants";

export function getCellCenter(index) {
  const offset = HALF_BOARD - CELL_SIZE / 2;
  return -offset + index * (CELL_SIZE + LANE_SIZE);
}

export function getLaneCenter(index) {
  return getCellCenter(index) + (CELL_SIZE + LANE_SIZE) / 2;
}

export function mergeWallSegments(segments, axis) {
  const grouped = new Map();

  for (const segment of segments) {
    const fixed = axis == "horizontal" ? segment.row : segment.col;
    const variable = axis == "horizontal" ? segment.col : segment.row;

    if (!grouped.has(fixed)) {
      grouped.set(fixed, []);
    }
    grouped.get(fixed).push(variable);
  }

  const mergedWalls = [];

  for (const [fixed, values] of grouped) {
    values.sort((a, b) => a - b);

    for (let i = 0; i < values.length; i++) {
      const current = values[i];
      const next = values[i + 1];

      mergedWalls.push(
        axis == "horizontal"
          ? { row: fixed, col: current }
          : { row: current, col: fixed },
      );
      i++;
    }
  }

  return mergedWalls;
}

export function getPawnPosition(player) {
  return {
    x: getCellCenter(player.col),
    y: CELL_HEIGHT,
    z: getCellCenter(player.row),
  };
}

export function getReserveWallSlots() {
  return [
    getLaneCenter(0),
    getLaneCenter(1),
    getLaneCenter(2),
    getLaneCenter(3),
    getLaneCenter(4),
    getLaneCenter(5),
    -HALF_BOARD - LANE_SIZE / 2,
    HALF_BOARD + LANE_SIZE / 2,
  ];
}

export function getReserveWallPosition(playerId, index) {
  const slots = getReserveWallSlots();

  return {
    x: slots[index],
    y: CELL_HEIGHT + WALL_HEIGHT / 2,
    z: getLaneCenter(playerId == 1 ? 7 : -2),
  };
}
