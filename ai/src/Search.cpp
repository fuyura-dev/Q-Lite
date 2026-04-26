#include "Search.h"
#include <limits>
#include "MoveGen.h"

struct Bounds {
	Score alpha, beta;
};

constexpr auto kMaxDepth = 7;
constexpr Bounds kInitialBounds = {
	.alpha = std::numeric_limits<Score>::min(),
	.beta = std::numeric_limits<Score>::max()
};

namespace {

Score AlphaBetaMin(Position &pos, Bounds bounds, Move& best_move, int depth);

Score AlphaBetaMax(Position &pos, Bounds bounds, Move& best_move, int depth = 0) {
	if (depth == kMaxDepth || pos.IsFinished()) {
		return pos.Evaluate();
	}
	Move restore = {
		MoveKind::kMovePawn,
		pos.GetPawnPosition(pos.GetCurrentTurn())
	};

	for (const auto move : AllMoveList(pos)) {
		pos.DoMove(move);
		Score score = AlphaBetaMin(pos, bounds, best_move, depth + 1);
		pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore);

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

Score AlphaBetaMin(Position &pos, Bounds bounds, Move& best_move, int depth = 0) {
	if (depth == kMaxDepth || pos.IsFinished()) {
		return pos.Evaluate();
	}

	Move restore = {
		MoveKind::kMovePawn,
		pos.GetPawnPosition(pos.GetCurrentTurn())
	};

	for (const auto move : AllMoveList(pos)) {
		pos.DoMove(move);
		Score score = AlphaBetaMax(pos, bounds, best_move, depth + 1);
		pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore);

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

Move DoSearch(Position pos) {
	Move best_move;
	if (pos.GetCurrentTurn() == kWhite) {
		AlphaBetaMax(pos, kInitialBounds, best_move);
	} else {
		AlphaBetaMin(pos, kInitialBounds, best_move);
	}
	return best_move;
}