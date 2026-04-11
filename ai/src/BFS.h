#pragma once

#include <cstdint>

#include "Position.h"
#include "Quoridor.h"

int8_t BFS(GridPosition start_pos, GridPosition end_pos, const Position &pos);

constexpr int8_t kUnreachable = -1;