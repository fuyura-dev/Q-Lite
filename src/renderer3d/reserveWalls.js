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

function getReserveWallPlayerFromKey(reserveWallKey) {
  const match = /^player-(\d+)-wall-/.exec(reserveWallKey ?? "");
  return match ? Number(match[1]) : null;
}

function padReserveWallSlots(slots, totalSlots) {
  const paddedSlots = slots.slice(0, totalSlots);

  while (paddedSlots.length < totalSlots) {
    paddedSlots.push(null);
  }

  return paddedSlots;
}

function getWallCountInSlots(slots, length) {
  return slots.filter(
    (reserveWallKey) =>
      reserveWallKey && getReserveWallLengthFromKey(reserveWallKey) == length,
  ).length;
}

function findPendingWallSlot(slots, playerId, length, pendingReserveWallKey) {
  if (
    !pendingReserveWallKey ||
    getReserveWallPlayerFromKey(pendingReserveWallKey) != playerId ||
    getReserveWallLengthFromKey(pendingReserveWallKey) != length
  ) {
    return -1;
  }

  return slots.indexOf(pendingReserveWallKey);
}

function findLastWallSlot(slots, length) {
  return slots.findLastIndex(
    (reserveWallKey) =>
      reserveWallKey && getReserveWallLengthFromKey(reserveWallKey) == length,
  );
}

function createNextUnusedReserveWallKey(slots, playerId, length) {
  const usedKeys = new Set(slots.filter(Boolean));

  for (let index = 0; index <= slots.length; index++) {
    const reserveWallKey = createReserveWallKey(playerId, length, index);

    if (!usedKeys.has(reserveWallKey)) {
      return reserveWallKey;
    }
  }

  return null;
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
      const wallCounts = player.wallsRemaining ?? [];
      let slots = reserveWallSlotsByPlayer.get(player.id);

      slots = slots
        ? padReserveWallSlots(slots, totalSlots)
        : padReserveWallSlots(
            createReserveWallKeys(player.id, wallCounts),
            totalSlots,
          );

      for (let length = 1; length <= wallCounts.length; length++) {
        const desiredCount = wallCounts[length - 1];
        let currentCount = getWallCountInSlots(slots, length);

        while (currentCount > desiredCount) {
          const pendingSlot = findPendingWallSlot(
            slots,
            player.id,
            length,
            pendingPlacedReserveWallKey,
          );
          const slotToClear =
            pendingSlot >= 0 ? pendingSlot : findLastWallSlot(slots, length);

          if (slotToClear < 0) {
            break;
          }

          slots[slotToClear] = null;
          currentCount--;
        }

        while (currentCount < desiredCount) {
          const emptySlot = slots.findIndex(
            (reserveWallKey) => !reserveWallKey,
          );
          const nextKey = createNextUnusedReserveWallKey(
            slots,
            player.id,
            length,
          );

          if (emptySlot < 0 || !nextKey) {
            break;
          }

          slots[emptySlot] = nextKey;
          currentCount++;
        }
      }

      reserveWallSlotsByPlayer.set(player.id, slots);
    }

    if (
      pendingPlacedReserveWallKey &&
      ![...reserveWallSlotsByPlayer.values()]
        .flat()
        .includes(pendingPlacedReserveWallKey)
    ) {
      pendingPlacedReserveWallKey = "";
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
