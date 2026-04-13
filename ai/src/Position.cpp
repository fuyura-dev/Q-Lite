#include "Position.h"

Color Position::GetCurrentTurn() const {
	return currentTurn;
}

GridPosition Position::GetPawnPosition(Color player) const {
	return pawnPositions[player];
}

uint8_t Position::GetRemainingWalls(Color player) const {
	return remainingWalls[player];
}

bool Position::DoMove(Move move) {
	if (move.kind == MoveKind::kMovePawn) {
		return MovePawn(move.pos);
	}
	PlaceWall(move.pos, *move.side);
	return false;
}

bool Position::MovePawn(GridPosition pos) {
	pawnPositions[currentTurn] = pos;
	if (pos.row == kTargetRow[currentTurn]) {
		return true;
	}
	ChangeTurn();
	return false;
}

void Position::PlaceWall(GridPosition pos, WallSide side) {
	walls[side] |= 1LL << pos.compress();
	remainingWalls[currentTurn]--;
	ChangeTurn();
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

bool Position::CanPlaceWall(GridPosition pos, WallSide side) const {
	if (remainingWalls[currentTurn] == 0) {
		return false;
	}
	if (pos.col == kGridSize - 1) {
		return false;
	}
	if (pos.row == kGridSize - 1) {
		return false;
	}
	if (HasWall(pos, side)) {
		return false;
	}

	uint64_t mask = 1LL << pos.compress();
	WallSide other_side = side == kBottomSide ? kRightSide : kBottomSide;
	if (walls[other_side] & mask) {
		return false;
	}
	return true;
}

void Position::ChangeTurn() {
	currentTurn = currentTurn == kWhite ? kBlack : kWhite;
}
