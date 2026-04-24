#include "Position.h"
#include <limits>
#include "BFS.h"

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
	Position temp_pos = *this;
	temp_pos.PlaceWall(pos, side);
	return !temp_pos.IsAnyPawnPathBlocked();
}

constexpr auto kWinningScore = std::numeric_limits<Score>::max() - 10;

Score Position::Evaluate() const {  // positive  if white is winning
	if (pawnPositions[kWhite].row == kTargetRow[kWhite]) {
		return kWinningScore;
	}

	if (pawnPositions[kBlack].row == kTargetRow[kBlack]) {
		return -kWinningScore;
	}

	auto evaluate_for = [&](Color color) -> Score {
		auto distance = BFS(pawnPositions[color], [&](GridPosition current_pos) {
			return current_pos.row == kTargetRow[color];
		}, *this);

		return (kTotalCells - distance) + static_cast<Score>(remainingWalls[color]);
	};

	return evaluate_for(kWhite) - evaluate_for(kBlack);

}

void Position::ChangeTurn() {
	currentTurn = currentTurn == kWhite ? kBlack : kWhite;
}

bool Position::IsAnyPawnPathBlocked() const {
	return IsPawnPathBlocked(kWhite) || IsPawnPathBlocked(kBlack);
}

bool Position::IsPawnPathBlocked(Color color) const {
	return BFS(pawnPositions[color], [&](GridPosition current_pos) {
		return current_pos.row == kTargetRow[color];
	}, *this) == kUnreachable;
}
