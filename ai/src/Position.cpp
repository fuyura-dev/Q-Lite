#include "Position.h"

#include <algorithm>
#include <limits>
#include <utility>

#include "BFS.h"

Color Position::GetCurrentTurn() const { return current_turn; }

GridPosition Position::GetPawnPosition(Color player) const {
    return pawn_positions[player];
}

uint8_t Position::GetRemainingWalls(Color player, WallLength length) const {
    return remaining_walls[player][length];
}

bool Position::DoMove(const Move& move) {
    if (move.kind == MoveKind::kMovePawn) {
        return MovePawn(move.pos);
    }
    PlaceWall(move.pos, move.side, move.length);
    return false;
}

constexpr std::array kPlacedWallMask = {
    std::array{1LL, 1LL | (1LL << kGridSize),
               1LL | (1LL << kGridSize) | (1LL << (2 * kGridSize))},
    std::array{0b1LL, 0b11LL, 0b111LL}};

void Position::UndoMove(const Move& move) {
    ChangeTurn();
    if (move.kind == MoveKind::kMovePawn) {
        pawn_positions[current_turn] = move.pos;
    } else {
        remaining_walls[current_turn][move.length]++;
        walls[move.side][move.length] &= ~(1LL << move.pos.compress());
        combined_walls[move.side] &=
            ~(kPlacedWallMask[move.side][move.length] << move.pos.compress());
    }
}

bool Position::MovePawn(GridPosition pos) {
    pawn_positions[current_turn] = pos;
    if (pos.row == kTargetRow[current_turn]) {
        ChangeTurn();
        return true;
    }
    ChangeTurn();
    return false;
}

void Position::PlaceWall(GridPosition pos, WallSide side, WallLength length) {
    walls[side][length] |= 1LL << pos.compress();
    combined_walls[side] |= kPlacedWallMask[side][length] << pos.compress();
    remaining_walls[current_turn][length]--;
    ChangeTurn();
}

bool Position::HasWall(GridPosition pos, WallSide side) const {
    return combined_walls[side] & (1LL << pos.compress());
}

bool Position::HasWall(GridPosition pos, WallSide side,
                       WallLength length) const {
    return walls[side][length] & (1LL << pos.compress());
}

bool Position::CanPlaceWall(GridPosition pos, WallSide side,
                            WallLength length) const {
    if (remaining_walls[current_turn][length] == 0) {
        return false;
    }
    if (side == kRightSide &&
        (pos.row + length >= kGridSize || pos.col == kGridSize - 1)) {
        return false;
    }
    if (side == kBottomSide &&
        (pos.col + length >= kGridSize || pos.row == kGridSize - 1)) {
        return false;
    }

    GridPosition vector =
        side == kRightSide ? GridPosition{1, 0} : GridPosition{0, 1};

    for (int8_t len = 0; len <= length; len++) {
        if (HasWall(pos + vector * len, side)) {
            return false;
        }
    }

    if (HasIntersectingWall(pos, side, length)) {
        return false;
    }

    uint64_t right_walls = combined_walls[kRightSide];
    uint64_t bot_walls = combined_walls[kBottomSide];

    if (side == kRightSide) {
        right_walls |= kPlacedWallMask[kRightSide][length] << pos.compress();
    } else {
        bot_walls |= kPlacedWallMask[kBottomSide][length] << pos.compress();
    }

    auto reachable_for = [&](Color color) {
        return IsReachable(pawn_positions[color], kTargetRow[color],
                           right_walls, bot_walls);
    };

    return reachable_for(kWhite) && reachable_for(kBlack);
}

constexpr auto kWinningScore = std::numeric_limits<Score>::max() / 3;

Score Position::Evaluate() const {  // positive  if white is winning
    if (pawn_positions[kWhite].row == kTargetRow[kWhite]) {
        return kWinningScore;
    }

    if (pawn_positions[kBlack].row == kTargetRow[kBlack]) {
        return -kWinningScore;
    }

    auto evaluate_for = [&](Color color) -> Score {
        auto distance =
            BFS(pawn_positions[color], kTargetRow[color],
                combined_walls[kRightSide], combined_walls[kBottomSide]);

        return (kTotalCells - distance) +
               static_cast<Score>(remaining_walls[color][kOne] +
                                  remaining_walls[color][kTwo] +
                                  remaining_walls[color][kThree]);
    };

    return evaluate_for(kWhite) - evaluate_for(kBlack);
}

bool Position::IsFinished() const {
    return pawn_positions[kWhite].row == kTargetRow[kWhite] ||
           pawn_positions[kBlack].row == kTargetRow[kBlack];
}

consteval auto Transpose(auto Checks) {
    for (auto& [_, vector] : Checks) {
        std::swap(vector.row, vector.col);
    }
    return Checks;
}

constexpr std::array kChecksForTwoBottom = {
    std::pair{kTwo, GridPosition{0, 0}}, std::pair{kThree, GridPosition{0, 0}},
    std::pair{kThree, GridPosition{-1, 0}}};

constexpr std::array kChecksForThreeBottom = {
    std::pair{kTwo, GridPosition{0, 0}},
    std::pair{kTwo, GridPosition{0, 1}},
    std::pair{kThree, GridPosition{0, 0}},
    std::pair{kThree, GridPosition{0, 1}},
    std::pair{kThree, GridPosition{-1, 0}},
    std::pair{kThree, GridPosition{-1, 1}}};

constexpr std::array kChecksForTwoRight = Transpose(kChecksForTwoBottom);
constexpr std::array kChecksForThreeRight = Transpose(kChecksForThreeBottom);

constexpr std::array kChecksForTwo = {kChecksForTwoRight, kChecksForTwoBottom};

constexpr std::array kChecksForThree = {kChecksForThreeRight,
                                        kChecksForThreeBottom};

bool Position::HasIntersectingWall(GridPosition pos, WallSide side,
                                   WallLength length) const {
    if (length == kOne) {
        return false;
    }

    WallSide other_side = side == kRightSide ? kBottomSide : kRightSide;

    auto try_for = [&](auto checks) {
        return std::ranges::any_of(checks, [&](const auto& e) {
            const auto& [other_length, vector] = e;
            GridPosition wall_pos = pos + vector;
            if (0 <= wall_pos.row && 0 <= wall_pos.col &&
                HasWall(wall_pos, other_side, other_length)) {
                return true;
            }
            return false;
        });
    };

    if (length == kTwo) {
        return try_for(kChecksForTwo[side]);
    }

    return try_for(kChecksForThree[side]);
}

void Position::ChangeTurn() {
    current_turn = current_turn == kWhite ? kBlack : kWhite;
}

bool Position::IsReachable(GridPosition start_pos, uint8_t target_row,
                           uint64_t right_walls, uint64_t bot_walls) {
    return BFS(start_pos, target_row, right_walls, bot_walls) != kUnreachable;
}