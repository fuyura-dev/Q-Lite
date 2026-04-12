#include "Engine.h"

static Color ToColor(int player) {
    return player <= 1 ? kWhite : kBlack;
}

int Engine::test() const {
    return 10;
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