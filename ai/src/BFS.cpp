#include "BFS.h"

#include <queue>
#include <utility>
#include "MoveGen.h"

int8_t BFS(GridPosition start_pos, GridPosition end_pos, const Position& pos) {
	std::queue<std::pair<GridPosition, int8_t>> queue;
	uint64_t visited = 0;

	auto try_visit = [&visited](GridPosition pos) {
		auto mask = (1LL << pos.compress());
		if (visited & mask) {
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

		for (auto move : GenPawnMovesUnrestricted(current_pos, pos)) {
			if (try_visit(move)) {
				queue.emplace(move, distance + 1);
			}
		}
	}

	return kUnreachable;
}
