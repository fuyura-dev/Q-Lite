#include "MoveGen.h"

#include <algorithm>

enum class CellSide : uint8_t {
	kRightSide,
	kBottomSide,
	kLeftSide,
	kTopSide
};

using CellSideVector = std::pair<CellSide, GridPosition>;

inline constexpr CellSideVector kAdjacent[4] = {
	{CellSide::kRightSide, {.row = 0, .col = 1}},
	{CellSide::kBottomSide, {.row = 1, .col = 0}},
	{CellSide::kLeftSide, {.row = 0, .col = -1}},
	{CellSide::kTopSide, {.row = -1, .col = 0}}
};

namespace {

WallSide ToWallSide(CellSide side) {
    if (side == CellSide::kLeftSide || side == CellSide::kRightSide) {
        return kRightSide;
    }
    return kBottomSide;
}

bool InBounds(GridPosition pos) {
    return 0 <= std::min(pos.row, pos.col) &&
           std::max(pos.row, pos.col) < kGridSize;
}

bool HasWall(const Position& pos, GridPosition wall_pos,
             const CellSideVector& cell_side_vector) {
    auto [side, vector] = cell_side_vector;
    WallSide wall_side = ToWallSide(side);
    if (side == CellSide::kRightSide || side == CellSide::kBottomSide) {
        return pos.HasWall(wall_pos, wall_side);
    }
    return pos.HasWall(wall_pos + vector, wall_side);
}

}  // namespace

coro::generator<GridPosition> AdjacentMoveList(GridPosition grid_pos, const Position& pos) {
	for (auto current_vector : kAdjacent) {
		GridPosition new_grid_pos = grid_pos + current_vector.second;
		if (InBounds(new_grid_pos) && !HasWall(pos, grid_pos, current_vector)) {
			co_yield new_grid_pos;
		}
	}
}

coro::generator<GridPosition> PawnMoveList(const Position& pos) {
	GridPosition player = pos.GetPawnPosition(pos.GetCurrentTurn());
	GridPosition other = pos.GetPawnPosition(pos.GetCurrentTurn() == kWhite ? kBlack : kWhite);
	bool will_jump = false, straight_jump = false;


	for (auto current : AdjacentMoveList(player, pos)) {
		if (current != other) {
			co_yield current;
		} else {
			will_jump = true;
			GridPosition vector = other - player;
			GridPosition jump = other + vector;
			if (std::ranges::contains(AdjacentMoveList(other, pos), jump)) {
				straight_jump = true;
			}
		}

	}

	if (will_jump) {
		for (auto current : AdjacentMoveList(other, pos)) {
			GridPosition grid_pos = current;
			if (grid_pos == player) {
				continue;
			}
			bool same_row_or_col = grid_pos.row == player.row ||
				grid_pos.col == player.col;
			if (same_row_or_col == straight_jump) {
				co_yield grid_pos;
			}
		}
	}
}

coro::generator<Move> AllMoveList(const Position& pos) {
	for (auto grid_pos : PawnMoveList(pos)) {
		co_yield Move{
			.kind = MoveKind::kMovePawn,
			.pos = grid_pos,
			.side = std::nullopt
		};
	}

	if (pos.GetRemainingWalls(pos.GetCurrentTurn()) == 0) {
		co_return;
	}

	for (uint8_t wall_current = 0; wall_current < kTotalCells; wall_current++) {
		GridPosition grid_pos = GridPosition::from_compressed(wall_current);
		for (WallSide side : {kRightSide, kBottomSide}) {
			if (pos.CanPlaceWall(grid_pos, side)) {
				co_yield Move{
					.kind = MoveKind::kPlaceWall,
					.pos = grid_pos,
					.side = side
				};
			}
		}
	}
}