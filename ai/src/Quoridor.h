#pragma once

#include <array>
#include <cstdint>

constexpr auto kGridSize = 7;
constexpr auto kTotalCells = kGridSize * kGridSize;
constexpr std::array<uint8_t, 3> kInitialWalls = {4, 3, 1};

struct GridPosition {
    int8_t row, col;
    bool operator==(const GridPosition&) const = default;
    GridPosition operator+(GridPosition that) const {
        return {static_cast<int8_t>(row + that.row),
                static_cast<int8_t>(col + that.col)};
    }
    GridPosition operator-(GridPosition that) const {
        return {static_cast<int8_t>(row - that.row),
                static_cast<int8_t>(col - that.col)};
    }
    GridPosition operator*(int8_t that) const {
        return {static_cast<int8_t>(row * that),
                static_cast<int8_t>(col * that)};
    }
    uint8_t compress() const { return row * kGridSize + col; }
    static GridPosition from_compressed(uint8_t v) {
        return {static_cast<int8_t>(v / kGridSize),
                static_cast<int8_t>(v % kGridSize)};
    }
};

enum Color : bool { kWhite, kBlack };

enum WallSide : bool { kRightSide, kBottomSide };

enum WallLength : uint8_t { kOne, kTwo, kThree };

struct Wall {
    GridPosition pos;
    WallSide side;
    WallLength length;
};

inline constexpr std::array kWallSides = {kRightSide, kBottomSide};
inline constexpr std::array kWallLengths = {kOne, kTwo, kThree};
constexpr GridPosition kStartPositions[2] = {
    {.row = kGridSize - 1, .col = kGridSize / 2},
    {.row = 0, .col = kGridSize / 2}};

constexpr int8_t kTargetRow[2] = {0, kGridSize - 1};