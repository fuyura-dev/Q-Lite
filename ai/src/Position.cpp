#include "Position.h"

MoveResult Position::movePawn(GridPosition pos) {
	return kValid;
}

MoveResult Position::placeWall(GridPosition pos, CellSide side) {
	if (remainingWalls[currentTurn] == 0) {
		return kInvalid;
	}

	if (side == kBottomSide) {
		if (pos.col + 2 >= kGridSize) {
			return kInvalid; // the other side of the wall exceeds boundary
		}
		if (pos.row == kGridSize - 1) {
			return kInvalid; // useless move
		}
		uint8_t compressed_pos = pos.compress();
		uint64_t new_wall_mask = 0b11 << compressed_pos;

		if ((walls[currentTurn] & new_wall_mask) != 0) {
			return kInvalid; // wall overlap
		}
		
		walls[currentTurn] |= new_wall_mask;

		// do bfs
	} else {
		
	}
}

bool Position::hasWall(GridPosition pos, CellSide side) const {
	return false;
}
