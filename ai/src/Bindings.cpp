#include <emscripten/bind.h>

#include "Engine.h"

using namespace emscripten;

namespace {

int GetLength(const Wall& wall) { return wall.length + 1; }

void SetLength(Wall& wall, int v) {}

void PlaceWall(Engine& engine, int8_t row, int8_t col, WallSide side,
               int length) {
    engine.PlaceWall(row, col, side, static_cast<WallLength>(length - 1));
}

}  // namespace

EMSCRIPTEN_BINDINGS(engine) {
    class_<Engine>("Engine")
        .constructor()
        .function("getCurrentTurn", &Engine::GetCurrentTurn)
        .function("getWalls", &Engine::GetWalls)
        .function("getPlayerRow", &Engine::GetPlayerRow)
        .function("getPlayerCol", &Engine::GetPlayerCol)
        .function("getRemainingWalls", &Engine::GetRemainingWalls)
        .function("getLegalPawnMoves", &Engine::GetLegalPawnMoves)
        .function("placeWall", &PlaceWall)
        .function("movePawn", &Engine::MovePawn)
        .function("doBestMove", &Engine::DoBestMove)
        .function("reset", &Engine::Reset)
        .function("evaluate", &Engine::Evaluate);

    constant("BUILD_TIME", std::string(__DATE__ " " __TIME__));

    value_object<GridPosition>("gridPosition")
        .field("row", &GridPosition::row)
        .field("col", &GridPosition::col);

    value_object<Wall>("wall")
        .field("pos", &Wall::pos)
        .field("side", &Wall::side)
        .field("length", &GetLength, &SetLength);

    register_vector<int>("VectorInt");
    register_vector<Wall>("VectorWall");
    register_vector<GridPosition>("VectorGridPos");

    enum_<WallSide>("wallSide", enum_value_type::number)
        .value("RIGHT_SIDE", kRightSide)
        .value("BOTTOM_SIDE", kBottomSide);

    enum_<MoveResult>("moveResult", enum_value_type::number)
        .value("INVALID", kInvalid)
        .value("VALID", kValid)
        .value("WIN", kWin);
}