#pragma once

#include <coro/generator.hpp>
#include <range/v3/view/cartesian_product.hpp>
#include <range/v3/view/iota.hpp>
#include <range/v3/view/transform.hpp>

#include "Position.h"
#include "Quoridor.h"

inline const auto kAllWallMoves =
    ranges::cartesian_product_view(
        ranges::views::transform(ranges::views::iota(0, kTotalCells),
                                 &GridPosition::from_compressed),
        kWallSides, kWallLengths) |
    ranges::views::transform([](const auto w) {
        auto [grid_pos, side, length] = w;
        return Wall{grid_pos, side, length};
    });

coro::generator<GridPosition> AdjacentMoveList(GridPosition grid_pos,
                                               const Position& pos);
coro::generator<GridPosition> PawnMoveList(const Position& pos);
coro::generator<Move> AllPawnMoveList(const Position& pos);
coro::generator<Move> AllMoveList(const Position& pos);