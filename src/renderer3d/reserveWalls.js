import { getReserveWallSlots } from "./geometry";

function createReserveWallKey(playerId, length, index) {
  return `player-${playerId}-wall-${length}-${index}`;
}

function createReserveWallKeys(playerId, wallsRemaining) {
  const keys = [];
  const wallCounts = wallsRemaining ?? 0;

  for (let length = 1; length <= wallCounts.length; length++) {
    const count = wallCounts[length - 1];

    for (let i = 0; i < count; i++) {
      keys.push(createReserveWallKey(playerId, length, i));
    }
  }

  return keys;
}

export function getReserveWallLengthFromKey(reserveWallKey) {
  const match = /-wall-(\d+)-\d+$/.exec(reserveWallKey ?? "");
  return match ? Number(match[1]) : 2;
}

export function createReserveWallStore() {
  const reserveWallSlotsByPlayer = new Map();
  let pendingPlacedReserveWallKey = "";

  function sync(snapshot) {
    const activePlayerIds = new Set(
      snapshot.players.map((player) => player.id),
    );
    const totalSlots = getReserveWallSlots().length;

    for (const player of snapshot.players) {
      const nextKeys = createReserveWallKeys(player.id, player.wallsRemaining);
      const slots = nextKeys.slice(0, totalSlots);

      while (slots.length < totalSlots) {
        slots.push(null);
      }

      if (
        pendingPlacedReserveWallKey &&
        !nextKeys.includes(pendingPlacedReserveWallKey)
      ) {
        pendingPlacedReserveWallKey = "";
      }

      reserveWallSlotsByPlayer.set(player.id, slots);
    }

    for (const playerId of [...reserveWallSlotsByPlayer.keys()]) {
      if (!activePlayerIds.has(playerId)) {
        reserveWallSlotsByPlayer.delete(playerId);
      }
    }
  }

  function getSlots(playerId) {
    return reserveWallSlotsByPlayer.get(playerId) ?? [];
  }

  function getValidKeys() {
    return new Set(
      [...reserveWallSlotsByPlayer.values()].flat().filter(Boolean),
    );
  }

  function commitSelectedReserveWall(reserveWallKey) {
    pendingPlacedReserveWallKey = reserveWallKey;
  }

  return {
    sync,
    getSlots,
    getValidKeys,
    commitSelectedReserveWall,
  };
}
