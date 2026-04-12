#pragma once

#include <cstdint>
#include "Quoridor.h"

enum MoveResult : uint8_t {
	kInvalid,
	kValid,
	kWin
};

class Position {
public:
	MoveResult MovePawn(GridPosition pos);
	MoveResult PlaceWall(GridPosition pos, WallSide side);

	Color GetCurrentTurn() const;
	GridPosition GetPawnPosition(Color player) const;
	uint8_t GetRemainingWalls(Color player) const;

	bool HasWall(GridPosition pos, WallSide side) const;

private:
	Color currentTurn = kWhite;
	uint8_t remainingWalls[2] = {
		kWallsPerPlayer, 
		kWallsPerPlayer
	};
	uint64_t walls[2] = {0};
	GridPosition pawnPositions[2] = {
		kStartPositions[kWhite], 
		kStartPositions[kBlack]
	};
};

// each bit in the walls array represents whether a wall exists for a cell.
// walls[kRightSide] corresponds to walls on the right side, etc.
//
// 
// 7 * 7 = 49 bits are used minus 7 since you can't / useless to place a wall at the edge of the last row / column
//
//    ----|-------
//    | 0 | 1 | 2 | ...   bit 1 in walls[kBottomSide] indicates a wall
//    ----|-------        on the bottom side of cell 1.
//    | 7 | ...