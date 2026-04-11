#include <emscripten/bind.h>
#include "Engine.h"

using namespace emscripten;


EMSCRIPTEN_BINDINGS(engine) {
    class_<Engine>("Engine")
        .constructor()
        .function("test", &Engine::test);
}