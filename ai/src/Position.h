#pragma once

#include <cstdint>
#include <optional>
#include "Quoridor.h"

enum class MoveKind : uint8_t {
	kMovePawn,
	kPlaceWall
};

struct Move {
	MoveKind kind;
	GridPosition pos;
	std::optional<WallSide> side;
};

using Score = int;

class Position {
public:
	bool DoMove(const Move &move);
	void UndoMove(const Move& move);

	bool MovePawn(GridPosition pos);
	void PlaceWall(GridPosition pos, WallSide side);

	Color GetCurrentTurn() const;
	GridPosition GetPawnPosition(Color player) const;
	uint8_t GetRemainingWalls(Color player) const;

	bool HasWall(GridPosition pos, WallSide side) const;
	bool CanPlaceWall(GridPosition pos, WallSide side) const;

	Score Evaluate() const;
	bool IsFinished() const;

private:
	void ChangeTurn();
	static bool IsReachable(GridPosition start_pos, uint8_t target_row, uint64_t right_walls, uint64_t bot_walls);

	Color currentTurn = kWhite;
	uint8_t remainingWalls[2] = {
		kWallsPerPlayer,
		kWallsPerPlayer
	};
	GridPosition pawnPositions[2] = {
		kStartPositions[kWhite],
		kStartPositions[kBlack]
	};
	uint64_t walls[2] = {0};
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