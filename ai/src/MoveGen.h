#pragma once

#include <vector>
#include "Position.h"
#include "Quoridor.h"


std::vector<GridPosition> GenPawnMovesUnrestricted(GridPosition pawn, const Position& pos);
std::vector<GridPosition> GenCurrentPawnMoves(const Position& pos);
