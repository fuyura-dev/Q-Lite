#pragma once

#include <vector>

#include "Position.h"

enum MoveResult : uint8_t { kInvalid, kValid, kWin };

enum class Class { kRandom, kGhost, kBuilder, kRunner, kNone };

class Engine {
   public:
    Engine();
    int GetCurrentTurn() const;
    int GetPlayerRow(int player) const;
    int GetPlayerCol(int player) const;
    std::vector<int> GetRemainingWalls(int player) const;
    std::vector<Wall> GetWalls() const;
    std::vector<GridPosition> GetLegalPawnMoves() const;
    int Evaluate() const;

    void SetPlayerClass(int player, Class c);
    std::vector<Class> StartMatch();
    void RestartMatch();
    void Reset();

    // move for the current player, if the mode is valid the turn changes.
    MoveResult PlaceWall(int8_t row, int8_t col, WallSide side,
                         WallLength length);
    MoveResult MovePawn(int8_t row, int8_t col);

    MoveResult DoBestMove();  // ai turn for current player

   private:
    Position pos;
    std::vector<Class> classes = {Class::kRandom, Class::kRandom};
};