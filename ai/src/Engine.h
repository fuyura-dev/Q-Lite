#pragma once

#include <vector>

#include "Position.h"

enum MoveResult : uint8_t { kInvalid, kValid, kWin };

struct Wall {
    GridPosition pos;
    WallSide side;
    WallLength length;
};

class Engine {
   public:
    int GetCurrentTurn() const;
    int GetPlayerRow(int player) const;
    int GetPlayerCol(int player) const;
    std::vector<int> GetRemainingWalls(int player) const;
    std::vector<Wall> GetWalls() const;
    std::vector<GridPosition> GetLegalPawnMoves() const;
    int Evaluate() const;

    void Reset();

    // move for the current player, if the mode is valid the turn changes.
    MoveResult PlaceWall(int8_t row, int8_t col, WallSide side,
                         WallLength length);
    MoveResult MovePawn(int8_t row, int8_t col);

    MoveResult DoBestMove();  // ai turn for current player

   private:
    Position pos;
};