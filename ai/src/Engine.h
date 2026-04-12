#pragma once

#include "Position.h"

class Engine {
public:
	int test() const;
	int GetCurrentTurn() const;
	int GetPlayerRow(int player) const;
	int GetPlayerCol(int player) const;
	int GetRemainingWalls(int player) const;
private:
	Position pos;
};