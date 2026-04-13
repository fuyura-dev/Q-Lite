#include "Engine.h"
#include "MoveGen.h"

static Color ToColor(int player) {
    return player <= 1 ? kWhite : kBlack;
}

int Engine::GetCurrentTurn() const {
    return static_cast<int>(pos.GetCurrentTurn()) + 1;
}

int Engine::GetPlayerRow(int player) const {
    return pos.GetPawnPosition(ToColor(player)).row;
}

int Engine::GetPlayerCol(int player) const {
    return pos.GetPawnPosition(ToColor(player)).col;
}

int Engine::GetRemainingWalls(int player) const {
    return pos.GetRemainingWalls(ToColor(player));
}

std::vector<GridPosition> Engine::GetHorizontalWalls() const {
    return { {0, 1} };
}

std::vector<GridPosition> Engine::GetVerticalWalls() const {
    std::vector<GridPosition> walls;
	for (int8_t row = 0; row < kGridSize; row++) {
		for (int8_t col = 0; col < kGridSize; col++) {
            if (pos.HasWall({ row, col }, kRightSide)) {
                walls.emplace_back(row, col);
            }
		}
	}
    return walls;
}

void Engine::Reset() {
    pos = Position();
}

MoveResult Engine::PlaceWall(int8_t row, int8_t col, WallSide side) {
    if (pos.CanPlaceWall({ row, col }, side)) {
        pos.PlaceWall({ row, col }, side);
        return kValid;
    }
    return kInvalid;

}

MoveResult Engine::MovePawn(int8_t row, int8_t col) {
    auto moves = GenCurrentPawnMoves(pos);
    if (std::ranges::find(moves, GridPosition{ row, col }) == moves.end()) {
        return kInvalid;
    }
    return pos.MovePawn({ row, col }) ? kWin : kValid;
}

MoveResult Engine::DoBestMove() {
    return kValid;
}
