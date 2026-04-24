#include "Search.h"
#include <limits>
#include "MoveGen.h"

struct Bounds {
	Score alpha, beta;
};

constexpr auto kMaxDepth = 5;
constexpr Bounds kInitialBounds = {
	.alpha = std::numeric_limits<Score>::min(),
	.beta = std::numeric_limits<Score>::max()
};

namespace {

Score AlphaBetaMin(Position pos, Bounds bounds, Move& best_move, int depth);

Score AlphaBetaMax(Position pos, Bounds bounds, Move& best_move, int depth = 0) {
	if (depth == kMaxDepth) {
		return pos.Evaluate();
	}

	for (const auto move : AllMoveList(pos)) {
		Position tmp_pos = pos;
		tmp_pos.DoMove(move);
		Score score = AlphaBetaMin(tmp_pos, bounds, best_move, depth - 1);
		if (bounds.alpha < score) {
			bounds.alpha = score;
			if (depth == 0) {
				best_move = move;
			}
		}
		if (bounds.alpha >= bounds.beta) {
			break;
		}
	}
	return bounds.alpha;
}

Score AlphaBetaMin(Position pos, Bounds bounds, Move& best_move, int depth = 0) {
	if (depth == kMaxDepth) {
		return pos.Evaluate();
	}

	for (const auto move : AllMoveList(pos)) {
		Position tmp_pos = pos;
		tmp_pos.DoMove(move);
		Score score = AlphaBetaMax(tmp_pos, bounds, best_move, depth - 1);
		if (score < bounds.beta) {
			bounds.beta = score;
			if (depth == 0) {
				best_move = move;
			}
		}
		if (bounds.beta <= bounds.alpha) {
			break;
		}
	}
	return bounds.beta;
}

}

Move DoSearch(const Position& pos) {
	Move best_move;
	if (pos.GetCurrentTurn() == kWhite) {
		AlphaBetaMax(pos, kInitialBounds, best_move);
	} else {
		AlphaBetaMin(pos, kInitialBounds, best_move);
	}
	return best_move;
}