#pragma once

#include <cstdint>

constexpr auto kGridSize = 7;
constexpr auto kTotalCells = kGridSize * kGridSize;
constexpr auto kWallsPerPlayer = 8;

struct GridPosition {
	int8_t row, col;
	bool operator==(const GridPosition&) const = default;
	GridPosition operator+(GridPosition that) const {
		return { static_cast<int8_t>(row + that.row), static_cast<int8_t>(col + that.col) };
	}
	uint8_t compress() const {
		return row * kGridSize + col;
	}
};



enum Color : bool {
	kWhite,
	kBlack
};

enum WallSide : bool {
	kRightSide,
	kBottomSide
};

constexpr GridPosition kStartPositions[2] = {
	{.row = kGridSize - 1, .col = kGridSize / 2 },
	{.row = 0, .col = kGridSize / 2}
};

constexpr int8_t kTargetRow[2] = {
	0,
	kGridSize - 1
};