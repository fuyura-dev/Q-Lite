#include <emscripten/bind.h>
#include "Engine.h"

using namespace emscripten;


EMSCRIPTEN_BINDINGS(engine) {
    class_<Engine>("Engine")
        .constructor()
        .function("getCurrentTurn", &Engine::GetCurrentTurn)
		.function("getHorizontalWalls", &Engine::GetHorizontalWalls)
		.function("getVerticalWalls", &Engine::GetVerticalWalls)
        .function("getPlayerRow", &Engine::GetPlayerRow)
        .function("getPlayerCol", &Engine::GetPlayerCol)
        .function("getRemainingWalls", &Engine::GetRemainingWalls)
		.function("placeWall", &Engine::PlaceWall)
		.function("movePawn", &Engine::MovePawn)
		.function("doBestMove", &Engine::DoBestMove)
		.function("reset", &Engine::Reset)
        ;

    value_object<GridPosition>("gridPosition")
        .field("row", &GridPosition::row)
        .field("col", &GridPosition::col)
        ;

    register_vector<GridPosition>("VectorGridPos");

    enum_<WallSide>("wallSide")
        .value("RIGHT_SIDE", kRightSide)
        .value("BOTTOM_SIDE", kBottomSide)
        ;

    enum_<MoveResult>("moveResult")
        .value("INVALID", kInvalid)
        .value("VALID", kValid)
        .value("WIN", kWin)
        ;
}