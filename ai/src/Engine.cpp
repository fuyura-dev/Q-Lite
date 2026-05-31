#include "Engine.h"

#include <algorithm>
#include <array>
#include <cstdlib>
#include <ctime>
#include <ranges>

#include "MoveGen.h"
#include "Search.h"

static Color ToColor(int player) { return player <= 1 ? kWhite : kBlack; }

Engine::Engine() { std::srand(std::time({})); }

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
    return kWallLengths | std::views::transform([&](const auto length) {
               return pos.GetRemainingWalls(ToColor(player), length);
           }) |
           std::ranges::to<std::vector<int>>();
}

std::vector<Wall> Engine::GetWalls() const {
    return kAllWallMoves | std::views::filter([&](const auto w) {
               auto [grid_pos, side, length] = w;
               return pos.HasWall(grid_pos, side, length);
           }) |
           std::ranges::to<std::vector>();
}

std::vector<GridPosition> Engine::GetLegalPawnMoves() const {
    return PawnMoveList(pos) | std::ranges::to<std::vector>();
}

int Engine::Evaluate() const { return pos.Evaluate(); }

void Engine::SetPlayerClass(int player, Class c) {
    classes[ToColor(player)] = c;
}

constexpr std::array kClassChoose = {Class::kGhost, Class::kBuilder,
                                     Class::kRunner};
constexpr auto kExtraWalls = 2;

std::vector<Class> Engine::StartMatch() {
    for (Color color : {kWhite, kBlack}) {
        if (classes[color] == Class::kRandom) {
            classes[color] = kClassChoose[std::rand() % kClassChoose.size()];
        }
        SpecialState special;
        switch (classes[color]) {
            case Class::kGhost:
                special.can_pass_walls = true;
                break;
            case Class::kBuilder:
                special.extra_walls = kExtraWalls;
                break;
            case Class::kRunner:
                special.can_move_two_tiles = true;
                special.move_two_tiles_available = true;
                break;
            default:
                break;
        }
        pos.GetSpecialState(color) = special;
    }
    return classes;
}

void Engine::Reset() {
    pos = Position();
    classes = {Class::kBuilder, Class::kBuilder};  // temporary
}

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
    if (!std::ranges::contains(moves, GridPosition{row, col})) {
        return kInvalid;
    }
    return pos.MovePawn({row, col}) ? kWin : kValid;
}

MoveResult Engine::DoBestMove() {
    Move best_move = DoSearch(pos);
    return pos.DoMove(best_move) ? kWin : kValid;
}
