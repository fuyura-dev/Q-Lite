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

MoveResult Position::DoMove(Move move) {
	if (move.kind == MoveKind::kMovePawn) {
		return MovePawn(move.pos);
	}
	return PlaceWall(move.pos, *move.side);
}

MoveResult Position::MovePawn(GridPosition pos) {
	return kValid;
}

MoveResult Position::PlaceWall(GridPosition pos, WallSide side) {
	if (remainingWalls[currentTurn] == 0) {
		return kInvalid;
	}

	uint64_t new_wall_mask = 0;

	if (side == kBottomSide) {
		if (pos.col == kGridSize - 1) {
			return kInvalid; // the other side of the wall exceeds boundary
		}
		if (pos.row == kGridSize - 1) {
			return kInvalid; // useless move
		}
		uint8_t compressed_pos = pos.compress();
		new_wall_mask = 0b11LL << compressed_pos;
	} else {
		if (pos.row == kGridSize - 1) {
			return kInvalid;
		}
		if (pos.col == kGridSize - 1) {
			return kInvalid;
		}
		uint8_t compressed_pos = pos.compress();
		new_wall_mask = (1LL | (1LL << kGridSize)) << compressed_pos;
	}

	if ((walls[side] & new_wall_mask) != 0) {
		return kInvalid; // wall overlap
	}

	walls[side] |= new_wall_mask;
	remainingWalls[currentTurn]--;
	ChangeTurn();
	return kValid;
}

bool Position::HasWall(GridPosition pos, WallSide side) const {
	return (walls[side] & (1LL << pos.compress())) != 0;
}

void Position::ChangeTurn() {
	currentTurn = currentTurn == kWhite ? kBlack : kWhite;
}
