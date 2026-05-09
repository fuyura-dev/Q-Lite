#pragma once

#include <cstdint>

#include "MoveGen.h"
#include "Quoridor.h"

constexpr int8_t kUnreachable = -1;

int8_t BFS(GridPosition start_pos, uint8_t target_row, uint64_t right_walls,
           uint64_t bot_walls);