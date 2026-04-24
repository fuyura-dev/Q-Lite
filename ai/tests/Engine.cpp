#include <gtest/gtest.h>
#include "Engine.h"

class EngineTest : public testing::Test {
protected:
	Engine engine;
};

TEST_F(EngineTest, CurrentTurn) {
	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kValid);
	EXPECT_EQ(engine.GetCurrentTurn(), 2);
	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kInvalid);
	EXPECT_EQ(engine.GetCurrentTurn(), 2);
	ASSERT_EQ(engine.PlaceWall(5, 5, kRightSide), kValid);
	EXPECT_EQ(engine.GetCurrentTurn(), 1);
}

TEST_F(EngineTest, RemainingWalls) {
	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kValid);
	EXPECT_EQ(engine.GetRemainingWalls(1), kWallsPerPlayer - 1);

	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kInvalid);
	EXPECT_EQ(engine.GetRemainingWalls(2), kWallsPerPlayer);

	ASSERT_EQ(engine.PlaceWall(5, 5, kRightSide), kValid);

	ASSERT_EQ(engine.PlaceWall(3, 3, kRightSide), kValid);
	EXPECT_EQ(engine.GetRemainingWalls(1), kWallsPerPlayer - 2);
}

TEST_F(EngineTest, VerticalWalls) {
	engine.PlaceWall(0, 0, kRightSide);
	engine.PlaceWall(2, 0, kRightSide);
	auto walls = engine.GetVerticalWalls();

	ASSERT_EQ(walls.size(), 4);
	EXPECT_EQ(walls[0].row, 0);
	EXPECT_EQ(walls[0].col, 0);
	EXPECT_EQ(walls[1].row, 1);
	EXPECT_EQ(walls[1].col, 0);
	EXPECT_EQ(walls[2].row, 2);
	EXPECT_EQ(walls[2].col, 0);
	EXPECT_EQ(walls[3].row, 3);
	EXPECT_EQ(walls[3].col, 0);
}

TEST_F(EngineTest, IntersectingWall) {
	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kValid);
	EXPECT_EQ(engine.PlaceWall(0, 0, kBottomSide), kInvalid);
}

TEST_F(EngineTest, OverlapWall) {
	ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide), kValid);
	EXPECT_EQ(engine.PlaceWall(0, 0, kRightSide), kInvalid);
}

TEST_F(EngineTest, Blocked) {
	ASSERT_EQ(engine.PlaceWall(0, 0, kBottomSide), kValid);
	ASSERT_EQ(engine.PlaceWall(0, 2, kBottomSide), kValid);
	ASSERT_EQ(engine.PlaceWall(0, 4, kBottomSide), kValid);
	ASSERT_EQ(engine.PlaceWall(1, 5, kRightSide), kValid);
	EXPECT_EQ(engine.PlaceWall(2, 5, kBottomSide), kInvalid);
}