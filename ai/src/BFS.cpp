#include "BFS.h"

consteval uint64_t ComputeVerticalMask() {
	uint64_t mask = 0;
	for (int row = 0; row < kGridSize; row++) {
		mask |= 1LL << (row * kGridSize);
	}
	return mask;
}

constexpr uint64_t kLeftMostMask = ComputeVerticalMask();
constexpr uint64_t kRightMostMask = kLeftMostMask << (kGridSize - 1);
constexpr uint64_t kTopMostMask = (1LL << kGridSize) - 1;
constexpr uint64_t kBottomMostMask = kTopMostMask << (kTotalCells - kGridSize);


int8_t BFS(GridPosition start_pos, uint8_t target_row, uint64_t right_walls, uint64_t bot_walls) {
	uint64_t visited = 1LL << start_pos.compress();

	uint64_t expanded_right = right_walls | (right_walls << kGridSize);
	uint64_t expanded_bot = bot_walls | (bot_walls << 1);
	int8_t distance = 0;

	while (true) {
		if (visited & (kTopMostMask << (target_row * kGridSize))) {
			return distance;
		}
		uint64_t new_visited = 0;
		new_visited |= ((visited & ~kRightMostMask) << 1) & ~(expanded_right << 1); // visit right
		new_visited |= ((visited & ~kLeftMostMask) >> 1) & ~expanded_right; // visit left
		new_visited |= ((visited & ~kBottomMostMask) << kGridSize) & ~(expanded_bot << kGridSize); // visit bot
		new_visited |= ((visited & ~kTopMostMask) >> kGridSize) & ~expanded_bot; // visit top
		if ((visited & new_visited) == new_visited) {
			break;
		}
		visited |= new_visited;
		distance++;
	}
	return kUnreachable;
}
