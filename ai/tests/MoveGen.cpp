#include <gtest/gtest.h>
#include "MoveGen.h"

class MoveGenTest : public testing::Test {
protected:
	void Move(GridPosition player, GridPosition other) {
		pos.MovePawn(player);
		pos.MovePawn(other);
	}
	Position pos;
};

TEST_F(MoveGenTest, AdjacentInitial) {
	auto at = kStartPositions[0];
	std::vector expect = {
		at + GridPosition{0, 1},
		at + GridPosition{0, -1},
		at + GridPosition{-1, 0}
	};
	auto moves = AdjacentMoveList(at, pos);
	auto it = moves.begin();

	for (int i = 0; i < expect.size(); i++) {
		EXPECT_EQ(expect[i], *it);
		++it;
	}
}

TEST_F(MoveGenTest, StraightJump) {
	auto at = kStartPositions[0];
	Move(at, at + GridPosition{ -1, 0 });
	std::vector expect = {
		at + GridPosition{0, 1},
		at + GridPosition{0, -1},
		at + GridPosition{-2, 0}
	};

	auto moves = PawnMoveList(pos);
	auto it = moves.begin();
	for (int i = 0; i < expect.size(); i++) {
		EXPECT_EQ(expect[i], *it);
		++it;
	}
	EXPECT_TRUE(it == moves.end());
}

TEST_F(MoveGenTest, StraightJumpBlack) {
	auto at = kStartPositions[1];
	Move(at + GridPosition{ 1, 0 }, at);
	pos.PlaceWall(GridPosition{ 0, 0 }, kBottomSide);

	std::vector expect = {
		at + GridPosition{0, 1},
		at + GridPosition{0, -1},
		at + GridPosition{2, 0},
	};

	auto moves = PawnMoveList(pos);
	auto it = moves.begin();
	for (int i = 0; i < expect.size(); i++) {
		EXPECT_EQ(expect[i], *it);
		++it;
	}
	EXPECT_TRUE(it == moves.end());
}
TEST_F(MoveGenTest, SideJump) {
	auto at = kStartPositions[0];
	Move(at, at + GridPosition{ -1, 0 });
	pos.PlaceWall(at + GridPosition{ -2, 0 }, kBottomSide);
	pos.PlaceWall(at + GridPosition{ -2, 0 }, kBottomSide);

	std::vector expect = {
		at + GridPosition{0, 1},
		at + GridPosition{0, -1},
		at + GridPosition{-1, 1},
		at + GridPosition{-1, -1}
	};

	auto moves = PawnMoveList(pos);
	auto it = moves.begin();
	for (int i = 0; i < expect.size(); i++) {
		EXPECT_EQ(expect[i], *it);
		++it;
	}
	EXPECT_TRUE(it == moves.end());
}

TEST_F(MoveGenTest, All) {
	auto moves = AllMoveList(pos);
	auto size = std::ranges::distance(moves);
	EXPECT_EQ(size, 3 + (kGridSize - 1) * (kGridSize - 1) * 2);
}