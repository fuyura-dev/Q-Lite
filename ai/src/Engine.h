#pragma once

#include <vector>
#include "Position.h"

enum MoveResult : uint8_t {
	kInvalid,
	kValid,
	kWin
};

class Engine {
public:
	int GetCurrentTurn() const;
	int GetPlayerRow(int player) const;
	int GetPlayerCol(int player) const;
	int GetRemainingWalls(int player) const;
	std::vector<GridPosition> GetHorizontalWalls() const;
	std::vector<GridPosition> GetVerticalWalls() const;
	std::vector<GridPosition> GetLegalPawnMoves() const;
	int Evaluate() const;

	void Reset();

	// move for the current player, if the mode is valid the turn changes.
	MoveResult PlaceWall(int8_t row, int8_t col, WallSide side);
	MoveResult MovePawn(int8_t row, int8_t col);

	MoveResult DoBestMove(); // ai turn for current player

private:
	Position pos;
};