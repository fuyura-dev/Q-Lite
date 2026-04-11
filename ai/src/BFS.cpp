#include "BFS.h"

#include <queue>
#include <utility>

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

namespace {

WallSide ToWallSide(CellSide side) {
	if (side == CellSide::kLeftSide || side == CellSide::kRightSide) {
		return kRightSide;
	}
	return kBottomSide;
}

bool InBounds(GridPosition pos) {
	return 0 <= std::min(pos.row, pos.col) && std::max(pos.row, pos.col) < kGridSize;
}

GridPosition operator+(GridPosition ths, GridPosition that) {
	return { ths.row + that.row, ths.col + that.col };
}

bool HasWall(const Position& pos, GridPosition wall_pos, const CellSideVector& cell_side_vector) {
	auto [side, vector] = cell_side_vector;
	WallSide wall_side = ToWallSide(side);
	if (side == CellSide::kRightSide || side == CellSide::kBottomSide) {
		return pos.HasWall(wall_pos, wall_side);
	}
	return pos.HasWall(wall_pos + vector, wall_side);
}

}


int8_t BFS(GridPosition start_pos, GridPosition end_pos, const Position& pos) {
	std::queue<std::pair<GridPosition, int8_t>> queue;
	uint64_t visited = 0;

	auto try_visit = [&visited](GridPosition pos) {
		auto mask = (1LL << pos.compress());
		if (visited & (1 << mask)) {
			return false;
		}
		visited |= mask;
		return true;
	};

	queue.emplace(start_pos, 0);
	visited |= 1LL << start_pos.compress();

	while (!queue.empty()) {
		auto [current_pos, distance] = queue.front();
		queue.pop();
		if (current_pos == end_pos) {
			return distance;
		}

		for (const auto& cell_side_vector : kAdjacent) {
			GridPosition new_grid_pos = current_pos + cell_side_vector.second;
			if (!InBounds(new_grid_pos) || HasWall(pos, current_pos, cell_side_vector)) {
				continue;
			}
			if (try_visit(new_grid_pos)) {
				queue.emplace(new_grid_pos, distance + 1);
			}
		}
	}

	return kUnreachable;
}
