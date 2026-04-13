#include "Position.h"

#include <algorithm>
#include "MoveGen.h"

Color Position::GetCurrentTurn() const {
	return currentTurn;
}

GridPosition Position::GetPawnPosition(Color player) const {
	return pawnPositions[player];
}

uint8_t Position::GetRemainingWalls(Color player) const {
	return remainingWalls[player];
}

MoveResult Position::DoMove(Move move) {
	if (move.kind == MoveKind::kMovePawn) {
		return MovePawn(move.pos);
	}
	return PlaceWall(move.pos, *move.side);
}

MoveResult Position::MovePawn(GridPosition pos) {
	auto moves = GenCurrentPawnMoves(*this);
	if (std::ranges::find(moves, pos) == moves.end()) {
		return kInvalid;
	}
	pawnPositions[currentTurn] = pos;
	if (pos.row == kTargetRow[currentTurn]) {
		return kWin;
	}
	ChangeTurn();
	return kValid;
}

MoveResult Position::PlaceWall(GridPosition pos, WallSide side) {
	if (remainingWalls[currentTurn] == 0) {
		return kInvalid;
	}

	if (pos.col == kGridSize - 1) {
		return kInvalid;
	}
	if (pos.row == kGridSize - 1) {
		return kInvalid;
	}

	if (HasWall(pos, side)) {
		return kInvalid;
	}
	uint64_t mask = 1LL << pos.compress();

	WallSide other_side = side == kBottomSide ? kRightSide : kBottomSide;
	if (walls[other_side] & mask) {
		return kInvalid; // intersecting wall    -- -|- --
	}
	walls[side] |= mask;
	remainingWalls[currentTurn]--;
	ChangeTurn();
	return kValid;
}

bool Position::HasWall(GridPosition pos, WallSide side) const {
	uint64_t wall_mask = 1LL << pos.compress();
	if (side == kBottomSide) {
		if (pos.col > 0) {
			wall_mask |= 1LL << (pos + GridPosition{ 0, -1 }).compress();
		}
	} else {
		if (pos.row > 0) {
			wall_mask |= 1LL << (pos + GridPosition{ -1, 0 }).compress();
		}
	}
	return (walls[side] & wall_mask) != 0;
}

void Position::ChangeTurn() {
	currentTurn = currentTurn == kWhite ? kBlack : kWhite;
}
