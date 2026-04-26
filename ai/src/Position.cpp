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

bool Position::DoMove(const Move &move) {
	if (move.kind == MoveKind::kMovePawn) {
		return MovePawn(move.pos);
	}
	PlaceWall(move.pos, *move.side);
	return false;
}

void Position::UndoMove(const Move& move) {
	ChangeTurn();
	if (move.kind == MoveKind::kMovePawn) {
		pawnPositions[currentTurn] = move.pos;
	} else {
		remainingWalls[currentTurn]++;
		walls[*move.side] &= ~(1LL << move.pos.compress());
	}
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

	uint64_t same_side_mask = 1LL << pos.compress();
	if (side == kBottomSide) {
		if (pos.col > 0) {
			same_side_mask |= 1LL << (pos + GridPosition{ 0, -1 }).compress();
		}
		if (pos.col < kGridSize - 2) {
			same_side_mask |= 1LL << (pos + GridPosition{ 0, 1 }).compress();
		}
	} else {
		if (pos.col > 0) {
			same_side_mask |= 1LL << (pos + GridPosition{ -1, 0 }).compress();
		}
		if (pos.col < kGridSize - 2) {
			same_side_mask |= 1LL << (pos + GridPosition{ 1, 0 }).compress();
		}
	}

	if (walls[side] & same_side_mask) {
		return false;
	}
	uint64_t mask = 1LL << pos.compress();
	WallSide other_side = side == kBottomSide ? kRightSide : kBottomSide;
	if (walls[other_side] & mask) {
		return false;
	}
	
	uint64_t right_walls = walls[kRightSide];
	uint64_t bot_walls = walls[kBottomSide];

	if (side == kRightSide) {
		right_walls |= (1LL << pos.compress());
	} else {
		bot_walls |= (1LL << pos.compress());
	}

	auto reachable_for = [&](Color color) {
		return IsReachable(pawnPositions[color], kTargetRow[color], right_walls, bot_walls);
	};

	return reachable_for(kWhite) && reachable_for(kBlack);
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
		auto distance = BFS(pawnPositions[color], kTargetRow[color], walls[kRightSide], walls[kBottomSide]);

		return (kTotalCells - distance) + static_cast<Score>(remainingWalls[color]);
	};

	return evaluate_for(kWhite) - evaluate_for(kBlack);

}

bool Position::IsFinished() const {
	return pawnPositions[kWhite].row == kTargetRow[kWhite] || pawnPositions[kBlack].row == kTargetRow[kBlack];
}

void Position::ChangeTurn() {
	currentTurn = currentTurn == kWhite ? kBlack : kWhite;
}

bool Position::IsReachable(GridPosition start_pos, uint8_t target_row, uint64_t right_walls, uint64_t bot_walls) {
	return BFS(start_pos, target_row, right_walls, bot_walls) != kUnreachable;
}