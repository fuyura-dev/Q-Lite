#pragma once

#include <array>
#include "Position.h"

constexpr auto kMaxDepth = 7;

struct Bounds {
	Score alpha, beta;
};

class Searcher {
public:
	Move DoSearch(const Position& pos);

private:
	Score AlphaBetaMin(Bounds bounds, int depth, int ply, bool pv);
	Score AlphaBetaMax(Bounds bounds, int depth, int ply, bool pv);

	std::array<std::array<Move, kMaxDepth>, kMaxDepth> pv_moves;
	Position pos;
};