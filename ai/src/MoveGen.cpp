#include "MoveGen.h"

#include <algorithm>
#include <functional>

enum class CellSide : uint8_t { kRightSide, kBottomSide, kLeftSide, kTopSide };

using CellSideVector = std::pair<CellSide, GridPosition>;

inline constexpr CellSideVector kAdjacent[4] = {
    {CellSide::kRightSide, {.row = 0, .col = 1}},
    {CellSide::kBottomSide, {.row = 1, .col = 0}},
    {CellSide::kLeftSide, {.row = 0, .col = -1}},
    {CellSide::kTopSide, {.row = -1, .col = 0}}};

namespace {

WallSide ToWallSide(CellSide side) {
    if (side == CellSide::kLeftSide || side == CellSide::kRightSide) {
        return kRightSide;
    }
    return kBottomSide;
}

bool InBounds(GridPosition pos) {
    return 0 <= std::min(pos.row, pos.col) &&
           std::max(pos.row, pos.col) < kGridSize;
}

bool HasWall(const Position& pos, GridPosition wall_pos,
             const CellSideVector& cell_side_vector) {
    auto [side, vector] = cell_side_vector;
    WallSide wall_side = ToWallSide(side);
    auto has_wall = &Position::HasWallBoth;
    if (pos.GetSpecialState(pos.GetCurrentTurn()).can_pass_walls) {
        has_wall = &Position::HasWallBuiltByEnemy;
    }

    if (side == CellSide::kRightSide || side == CellSide::kBottomSide) {
        return std::invoke(has_wall, pos, wall_pos, wall_side);
    }
    return std::invoke(has_wall, pos, wall_pos + vector, wall_side);
}

}  // namespace

coro::generator<GridPosition> AdjacentMoveList(GridPosition grid_pos,
                                               const Position& pos) {
    for (auto current_vector : kAdjacent) {
        GridPosition new_grid_pos = grid_pos + current_vector.second;
        if (InBounds(new_grid_pos) && !HasWall(pos, grid_pos, current_vector)) {
            co_yield new_grid_pos;
        }
    }
}

coro::generator<GridPosition> PawnMoveList(const Position& pos) {
    GridPosition player = pos.GetPawnPosition(pos.GetCurrentTurn());
    GridPosition other =
        pos.GetPawnPosition(pos.GetCurrentTurn() == kWhite ? kBlack : kWhite);
    bool will_jump = false, straight_jump = false;

    for (auto current : AdjacentMoveList(player, pos)) {
        if (current != other) {
            co_yield current;
        } else {
            will_jump = true;
            GridPosition vector = other - player;
            GridPosition jump = other + vector;
            if (std::ranges::contains(AdjacentMoveList(other, pos), jump)) {
                straight_jump = true;
            }
        }
    }

    if (will_jump) {
        for (auto current : AdjacentMoveList(other, pos)) {
            GridPosition grid_pos = current;
            if (grid_pos == player) {
                continue;
            }
            bool same_row_or_col =
                grid_pos.row == player.row || grid_pos.col == player.col;
            if (same_row_or_col == straight_jump) {
                co_yield grid_pos;
            }
        }
    }
}

coro::generator<GridPosition> DoublePawnMoveList(const Position& pos) {
    GridPosition grid_pos = pos.GetPawnPosition(pos.GetCurrentTurn());
    GridPosition other =
        pos.GetPawnPosition(pos.GetCurrentTurn() == kWhite ? kBlack : kWhite);
    for (auto current_vector : kAdjacent) {
        GridPosition new_grid_pos = grid_pos + current_vector.second;
        if (InBounds(new_grid_pos) && !HasWall(pos, grid_pos, current_vector)) {
            new_grid_pos = new_grid_pos + current_vector.second;
            if (InBounds(new_grid_pos) &&
                !HasWall(pos, grid_pos, current_vector) &&
                new_grid_pos != other) {
                co_yield new_grid_pos;
            }
        }
    }
}

coro::generator<Move> AllPawnMoveList(const Position& pos) {
    uint64_t used = 0;

    for (auto grid_pos : PawnMoveList(pos)) {
        used |= 1LL << grid_pos.compress();
        co_yield Move{.kind = MoveKind::kMovePawn,
                      .pos = grid_pos,
                      .use_move_two_tiles = false};
    }

    if (!pos.GetSpecialState(pos.GetCurrentTurn()).move_two_tiles_available) {
        co_return;
    }

    for (auto grid_pos : DoublePawnMoveList(pos)) {
        if (!(used & (1LL << grid_pos.compress()))) {
            co_yield Move{.kind = MoveKind::kMovePawn,
                          .pos = grid_pos,
                          .use_move_two_tiles = true};
        }
    }
}

coro::generator<Move> AllMoveList(const Position& pos) {
    for (auto move : AllPawnMoveList(pos)) {
        co_yield move;
    }

    for (auto [grid_pos, side, length] : kAllWallMoves) {
        if (pos.CanPlaceWall(grid_pos, side, length)) {
            co_yield Move{.kind = MoveKind::kPlaceWall,
                          .pos = grid_pos,
                          .side = side,
                          .length = length};
        }
    }
}