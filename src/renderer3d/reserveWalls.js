import { getReserveWallSlots } from "./geometry";

export function createReserveWallStore() {
  const reserveWallSlotsByPlayer = new Map();
  const reserveWallIdCounters = new Map();
  let pendingPlacedReserveWallKey = "";

  function ensureReserveWallKeys(playerId, count) {
    if (!reserveWallSlotsByPlayer.has(playerId)) {
      reserveWallSlotsByPlayer.set(playerId, []);
      reserveWallIdCounters.set(playerId, 0);
    }

    const slots = reserveWallSlotsByPlayer.get(playerId);
    let nextId = reserveWallIdCounters.get(playerId);
    const filledCount = slots.filter(Boolean).length;

    while (slots.length < getReserveWallSlots().length) {
      slots.push(null);
    }

    for (
      let i = 0;
      i < slots.length &&
      filledCount + (nextId - reserveWallIdCounters.get(playerId)) < count;
      i++
    ) {
      if (slots[i]) {
        continue;
      }
      slots[i] = `player-${playerId}-wall-${nextId}`;
      nextId++;
    }

    reserveWallIdCounters.set(playerId, nextId);
  }

  function sync(snapshot) {
    const activePlayerIds = new Set(
      snapshot.players.map((player) => player.id),
    );

    for (const player of snapshot.players) {
      ensureReserveWallKeys(player.id, player.wallsRemaining);
      const slots = reserveWallSlotsByPlayer.get(player.id);
      const targetCount = player.wallsRemaining;
      let filledCount = slots.filter(Boolean).length;

      while (filledCount > targetCount) {
        const selectedIndex = pendingPlacedReserveWallKey
          ? slots.indexOf(pendingPlacedReserveWallKey)
          : -1;

        if (selectedIndex >= 0) {
          slots[selectedIndex] = null;
          pendingPlacedReserveWallKey = "";
          filledCount--;
          continue;
        }

        const lastFilledIndex = slots.findLastIndex(Boolean);
        if (lastFilledIndex < 0) {
          break;
        }
        slots[lastFilledIndex] = null;
        filledCount--;
      }
    }

    for (const playerId of [...reserveWallSlotsByPlayer.keys()]) {
      if (!activePlayerIds.has(playerId)) {
        reserveWallSlotsByPlayer.delete(playerId);
        reserveWallIdCounters.delete(playerId);
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
