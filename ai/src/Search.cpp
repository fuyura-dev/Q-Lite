#include "Search.h"
#include <algorithm>
#include <iostream>
#include <limits>
#include "MoveGen.h"

constexpr Bounds kInitialBounds = {
	.alpha = std::numeric_limits<Score>::min(),
	.beta = std::numeric_limits<Score>::max()
};

Move Searcher::DoSearch(const Position& p) {
	pos = p;
	for (int i = 1; i <= kMaxDepth; i++) {
		if (pos.GetCurrentTurn() == kWhite) {
			AlphaBetaMax(kInitialBounds, i, 0, true);
		} else {
			AlphaBetaMin(kInitialBounds, i, 0, true);
		}
	}

	for (int i = 0; i < kMaxDepth; i++) {
		auto x = pv_moves[0][i];
		if (x.kind == MoveKind::kPlaceWall) {
			std::cout << "Place Wall: " << "row: " << (int)x.pos.row << " col: " << (int)x.pos.col << " " << (x.side == kRightSide ? "right" : "bottom") << '\n';
		} else {
			std::cout << "Move Pawn: " << "row: " << (int)x.pos.row << " col: " << (int)x.pos.col << '\n';
		}
	}
	return pv_moves[0][0];
}

Score Searcher::AlphaBetaMax(Bounds bounds, int depth, int ply, bool pv) {
	if (depth == 0 || pos.IsFinished()) {
		return pos.Evaluate();
	}
	
	Bounds running = bounds;
	Move best_move;
	Move restore = {
		MoveKind::kMovePawn,
		pos.GetPawnPosition(pos.GetCurrentTurn())
	};

	bool finished = false;
	if (pv && depth != 1) {
		Move pv_move = pv_moves[ply][0];
		pos.DoMove(pv_move);
		Score score = AlphaBetaMin(running, depth - 1, ply + 1, true);
		pos.UndoMove(pv_move.kind == MoveKind::kPlaceWall ? pv_move : restore);

		if (running.alpha < score) {
			running.alpha = score;
			best_move = pv_move;
		}

		if (running.alpha >= bounds.beta) {
			finished = true;
		}
	}

	if (!finished) {
		for (const auto move : AllMoveList(pos)) {
			pos.DoMove(move);
			Score score = AlphaBetaMin(running, depth - 1, ply + 1, false);
			pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore);

			if (running.alpha < score) {
				running.alpha = score;
				best_move = move;
			}
			if (running.alpha >= bounds.beta) {
				break;
			}
		}
	}

	if (bounds.alpha < running.alpha && running.alpha < bounds.beta) {
		pv_moves[ply][0] = best_move;
		if (depth != 1) {
			std::copy_n(pv_moves[ply + 1].begin(), depth - 1, pv_moves[ply].begin() + 1);
		}
	}

	return running.alpha;
}

Score Searcher::AlphaBetaMin(Bounds bounds, int depth, int ply, bool pv) {
	if (depth == 0 || pos.IsFinished()) {
		return pos.Evaluate();
	}

	Bounds running = bounds;
	Move best_move;
	Move restore = {
		MoveKind::kMovePawn,
		pos.GetPawnPosition(pos.GetCurrentTurn())
	};

	bool finished = false;
	if (pv && depth != 1) {
		Move pv_move = pv_moves[ply][0];
		pos.DoMove(pv_move);
		Score score = AlphaBetaMax(running, depth - 1, ply + 1, true);
		pos.UndoMove(pv_move.kind == MoveKind::kPlaceWall ? pv_move : restore);

		if (score < running.beta) {
			running.beta = score;
			best_move = pv_move;
		}
	
		if (running.beta <= bounds.alpha) {
			finished = true;
		}

	}

	if (!finished) {
		for (const auto move : AllMoveList(pos)) {
			pos.DoMove(move);
			Score score = AlphaBetaMax(running, depth - 1, ply + 1, false);
			pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore);

			if (score < running.beta) {
				running.beta = score;
				best_move = move;
			}
			if (running.beta <= bounds.alpha) {
				break;
			}
		}
	}


	if (bounds.alpha < running.beta && running.beta < bounds.beta) {
		pv_moves[ply][0] = best_move;
		if (depth != 1) {
			std::copy_n(pv_moves[ply + 1].begin(), depth - 1, pv_moves[ply].begin() + 1);
		}
	}

	return running.beta;
}
