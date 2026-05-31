#pragma once

#include <cstdint>

#include "Quoridor.h"

enum class MoveKind : uint8_t { kMovePawn, kPlaceWall };

struct Move {
    MoveKind kind;
    GridPosition pos;
    WallSide side;
    WallLength length;
};

using Score = int;

struct SpecialState {
    bool can_pass_walls = false;
    uint8_t extra_walls = 0;
    bool can_move_two_tiles = false;
    bool move_two_tiles_available = false;
};

class Position {
   public:
    bool DoMove(const Move& move);
    void UndoMove(const Move& move);

    bool MovePawn(GridPosition pos);
    void PlaceWall(GridPosition pos, WallSide side, WallLength length);

    Color GetCurrentTurn() const;
    GridPosition GetPawnPosition(Color player) const;
    uint8_t GetRemainingWalls(Color player, WallLength length) const;

    bool HasWallBoth(GridPosition pos, WallSide side) const;
    bool HasWallBuiltByEnemy(GridPosition pos, WallSide side) const;
    bool HasWall(GridPosition pos, WallSide side, WallLength length) const;
    bool CanPlaceWall(GridPosition pos, WallSide side, WallLength length) const;

    Score Evaluate() const;
    bool IsFinished() const;

    SpecialState& GetSpecialState(Color player);
    const SpecialState& GetSpecialState(Color player) const;

   private:
    bool HasIntersectingWall(GridPosition pos, WallSide side,
                             WallLength length) const;
    void ChangeTurn();
    static bool IsReachable(GridPosition start_pos, uint8_t target_row,
                            uint64_t right_walls, uint64_t bot_walls);

    Color current_turn = kWhite;
    std::array<uint8_t, 3> remaining_walls[2] = {kInitialWalls, kInitialWalls};
    GridPosition pawn_positions[2] = {kStartPositions[kWhite],
                                      kStartPositions[kBlack]};
    uint64_t walls[2][3] = {0};
    uint64_t combined_walls[2][2] = {0};
    SpecialState special_states[2];
};

// each bit in the walls array represents whether a wall exists for a cell.
// walls[kRightSide] corresponds to walls on the right side, etc.
//
//
// 7 * 7 = 49 bits are used minus 7 since you can't / useless to place a wall at
// the edge of the last row / column
//
//    ----|-------
//    | 0 | 1 | 2 | ...   bit 1 in walls[kBottomSide] indicates a wall
//    ----|-------        on the bottom side of cell 1.
//    | 7 | ...