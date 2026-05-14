#include "Engine.h"

#include <ranges>

#include "MoveGen.h"
#include "Search.h"

static Color ToColor(int player) { return player <= 1 ? kWhite : kBlack; }

int Engine::GetCurrentTurn() const {
    return static_cast<int>(pos.GetCurrentTurn()) + 1;
}

int Engine::GetPlayerRow(int player) const {
    return pos.GetPawnPosition(ToColor(player)).row;
}

int Engine::GetPlayerCol(int player) const {
    return pos.GetPawnPosition(ToColor(player)).col;
}

std::vector<int> Engine::GetRemainingWalls(int player) const {
    std::vector<int> ret;
    for (WallLength length : {kOne, kTwo, kThree}) {
        ret.push_back(pos.GetRemainingWalls(ToColor(player), length));
    }
    return ret;
}
std::vector<Wall> Engine::GetWalls() const {
    std::vector<Wall> walls;
    for (int8_t row = 0; row < kGridSize; row++) {
        for (int8_t col = 0; col < kGridSize; col++) {
            for (WallLength length : {kOne, kTwo, kThree}) {
                if (pos.HasWall({row, col}, kRightSide, length)) {
                    walls.emplace_back(GridPosition{row, col}, kRightSide,
                                       length);
                }
                if (pos.HasWall({row, col}, kBottomSide, length)) {
                    walls.emplace_back(GridPosition{row, col}, kBottomSide,
                                       length);
                }
            }
        }
    }
    return walls;
}

std::vector<GridPosition> Engine::GetLegalPawnMoves() const {
    std::vector<GridPosition> moves;
    for (GridPosition move : PawnMoveList(pos)) {
        moves.push_back(move);
    }
    return moves;
}

int Engine::Evaluate() const { return pos.Evaluate(); }

void Engine::Reset() { pos = Position(); }

MoveResult Engine::PlaceWall(int8_t row, int8_t col, WallSide side,
                             WallLength length) {
    if (pos.CanPlaceWall({row, col}, side, length)) {
        pos.PlaceWall({row, col}, side, length);
        return kValid;
    }
    return kInvalid;
}

MoveResult Engine::MovePawn(int8_t row, int8_t col) {
    auto moves = PawnMoveList(pos);
    if (std::ranges::find(moves, GridPosition{row, col}) == moves.end()) {
        return kInvalid;
    }
    return pos.MovePawn({row, col}) ? kWin : kValid;
}

MoveResult Engine::DoBestMove() {
    Move best_move = DoSearch(pos);
    return pos.DoMove(best_move) ? kWin : kValid;
}
