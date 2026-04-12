#include <emscripten/bind.h>
#include "Engine.h"

using namespace emscripten;


EMSCRIPTEN_BINDINGS(engine) {
    class_<Engine>("Engine")
        .constructor()
        .function("test", &Engine::test)
        .function("getCurrentTurn", &Engine::GetCurrentTurn)
        .function("getPlayerRow", &Engine::GetPlayerRow)
        .function("getPlayerCol", &Engine::GetPlayerCol)
        .function("getRemainingWalls", &Engine::GetRemainingWalls)
        ;
}