#pragma once

#include <coro/generator.hpp>

#include "Position.h"
#include "Quoridor.h"

coro::generator<GridPosition> AdjacentMoveList(GridPosition grid_pos, const Position& pos);
coro::generator<GridPosition> PawnMoveList(const Position& pos);
coro::generator<Move> AllMoveList(const Position& pos);