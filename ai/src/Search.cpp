#include "Search.h"

#include <limits>
#include <utility>

#include "MoveGen.h"

struct Bounds {
    Score alpha, beta;
};

constexpr auto kMaxDepth = 5;
constexpr Bounds kInitialBounds = {.alpha = std::numeric_limits<Score>::min(),
                                   .beta = std::numeric_limits<Score>::max()};

using SearchResult = std::pair<Score, int>;

namespace {

SearchResult AlphaBetaMin(Position &pos, Bounds bounds, Move &best_move,
                          int depth);

SearchResult AlphaBetaMax(Position &pos, Bounds bounds, Move &best_move,
                          int depth = 0) {
    if (depth == kMaxDepth || pos.IsFinished()) {
        return {pos.Evaluate(), depth};
    }
    Move restore = {MoveKind::kMovePawn,
                    pos.GetPawnPosition(pos.GetCurrentTurn())};
    int min_evaluated = kMaxDepth;
    for (const auto move : AllMoveList(pos)) {
        SpecialState state;
        pos.DoMove(move, &state);
        auto [score, evaluated_at] =
            AlphaBetaMin(pos, bounds, best_move, depth + 1);
        pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore, state);

        if (bounds.alpha < score ||
            (score == bounds.alpha && evaluated_at < min_evaluated)) {
            bounds.alpha = score;
            min_evaluated = evaluated_at;
            if (depth == 0) {
                best_move = move;
            }
        }
        if (bounds.alpha >= bounds.beta) {
            break;
        }
    }
    return {bounds.alpha, min_evaluated};
}

SearchResult AlphaBetaMin(Position &pos, Bounds bounds, Move &best_move,
                          int depth = 0) {
    if (depth == kMaxDepth || pos.IsFinished()) {
        return {pos.Evaluate(), depth};
    }

    Move restore = {MoveKind::kMovePawn,
                    pos.GetPawnPosition(pos.GetCurrentTurn())};
    int min_evaluated = kMaxDepth;
    for (const auto move : AllMoveList(pos)) {
        SpecialState state;
        pos.DoMove(move, &state);
        auto [score, evaluated_at] =
            AlphaBetaMax(pos, bounds, best_move, depth + 1);
        pos.UndoMove(move.kind == MoveKind::kPlaceWall ? move : restore, state);

        if (score < bounds.beta ||
            (score == bounds.beta && evaluated_at < min_evaluated)) {
            bounds.beta = score;
            min_evaluated = evaluated_at;
            if (depth == 0) {
                best_move = move;
            }
        }
        if (bounds.beta <= bounds.alpha) {
            break;
        }
    }
    return {bounds.beta, min_evaluated};
}

}  // namespace

Move DoSearch(Position pos) {
    Move best_move;
    if (pos.GetCurrentTurn() == kWhite) {
        AlphaBetaMax(pos, kInitialBounds, best_move);
    } else {
        AlphaBetaMin(pos, kInitialBounds, best_move);
    }
    return best_move;
}