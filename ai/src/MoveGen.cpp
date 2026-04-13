#include "MoveGen.h"
#include <algorithm>
#include <iterator>

enum class CellSide : uint8_t {
	kRightSide,
	kBottomSide,
	kLeftSide,
	kTopSide
};

using CellSideVector = std::pair<CellSide, GridPosition>;

constexpr CellSideVector kAdjacent[4] = {
	{CellSide::kRightSide, {.row = 0, .col = 1}},
	{CellSide::kBottomSide, {.row = 1, .col = 0}},
	{CellSide::kLeftSide, {.row = 0, .col = -1}},
	{CellSide::kTopSide, {.row = -1, .col = 0}}
};

WallSide ToWallSide(CellSide side) {
	if (side == CellSide::kLeftSide || side == CellSide::kRightSide) {
		return kRightSide;
	}
	return kBottomSide;
}

bool InBounds(GridPosition pos) {
	return 0 <= std::min(pos.row, pos.col) && std::max(pos.row, pos.col) < kGridSize;
}

bool HasWall(const Position& pos, GridPosition wall_pos, const CellSideVector& cell_side_vector) {
	auto [side, vector] = cell_side_vector;
	WallSide wall_side = ToWallSide(side);
	if (side == CellSide::kRightSide || side == CellSide::kBottomSide) {
		return pos.HasWall(wall_pos, wall_side);
	}
	return pos.HasWall(wall_pos + vector, wall_side);
}

std::vector<GridPosition> GenPawnMovesUnrestricted(GridPosition pawn, const Position& pos) {
	std::vector<GridPosition> moves;
	for (const auto& cell_side_vector : kAdjacent) {
		GridPosition new_grid_pos = pawn + cell_side_vector.second;
		if (!InBounds(new_grid_pos) || HasWall(pos, pawn, cell_side_vector)) {
			continue;
		}
		moves.push_back(new_grid_pos);
	}
	return moves;
}

std::vector<GridPosition> GenCurrentPawnMoves(const Position& pos) {
	Color color = pos.GetCurrentTurn();
	GridPosition player = pos.GetPawnPosition(color);
	GridPosition other = pos.GetPawnPosition(color == kWhite ? kBlack : kWhite);
	auto moves = GenPawnMovesUnrestricted(player, pos);

	if (const auto it = std::ranges::find(moves, other); it != moves.end()) {
		moves.erase(it);
		auto jump_moves = GenPawnMovesUnrestricted(other, pos);
		std::erase(jump_moves, player);
		decltype(jump_moves)::iterator jump_over;
		if (player.row == other.row) {
			jump_over = std::ranges::find_if(jump_moves, [&](auto m) {
				return m.row == player.row;
			});
		} else {
			jump_over = std::ranges::find_if(jump_moves, [&](auto m) {
				return m.col == player.col;
			});
		}
		if (jump_over != jump_moves.end()) {
			moves.push_back(*jump_over);
		} else {
			std::ranges::copy(jump_moves, std::back_inserter(moves));
		}
	}
	return moves;
}
