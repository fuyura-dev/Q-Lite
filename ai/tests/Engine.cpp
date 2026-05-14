#include "Engine.h"

#include <gtest/gtest.h>

class EngineTest : public testing::Test {
   protected:
    Engine engine;
};

TEST_F(EngineTest, CurrentTurn) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.GetCurrentTurn(), 2);
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kInvalid);
    EXPECT_EQ(engine.GetCurrentTurn(), 2);
    ASSERT_EQ(engine.PlaceWall(5, 5, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.GetCurrentTurn(), 1);
}

TEST_F(EngineTest, RemainingWalls) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.GetRemainingWalls(1)[kTwo], kInitialWalls[kTwo] - 1);

    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kInvalid);
    EXPECT_EQ(engine.GetRemainingWalls(2)[kTwo], kInitialWalls[kTwo]);

    ASSERT_EQ(engine.PlaceWall(5, 5, kRightSide, kTwo), kValid);

    ASSERT_EQ(engine.PlaceWall(3, 3, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.GetRemainingWalls(1)[kTwo], kInitialWalls[kTwo] - 2);
}

TEST_F(EngineTest, VerticalWalls) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kValid);
    ASSERT_EQ(engine.PlaceWall(2, 0, kRightSide, kTwo), kValid);
    auto walls = engine.GetWalls();

    ASSERT_EQ(walls.size(), 2);
    EXPECT_EQ(walls[0].pos, (GridPosition{0, 0}));
    EXPECT_EQ(walls[1].pos, (GridPosition{2, 0}));
}

TEST_F(EngineTest, IntersectingWall) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.PlaceWall(0, 0, kBottomSide, kTwo), kInvalid);
}

TEST_F(EngineTest, IntersectingWallModif) {
    ASSERT_EQ(engine.PlaceWall(0, 1, kRightSide, kThree), kValid);
    EXPECT_EQ(engine.PlaceWall(0, 1, kBottomSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 1, kBottomSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(2, 1, kBottomSide, kTwo), kValid);

    ASSERT_EQ(engine.MovePawn(kStartPositions[kWhite].row - 1,
                              kStartPositions[kWhite].col),
              kValid);

    ASSERT_EQ(engine.PlaceWall(1, 2, kBottomSide, kThree), kValid);
    EXPECT_EQ(engine.PlaceWall(1, 2, kRightSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 3, kRightSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 4, kRightSide, kTwo), kValid);
}

TEST_F(EngineTest, OverlapWall) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.PlaceWall(0, 0, kRightSide, kTwo), kInvalid);
}

TEST_F(EngineTest, OverlapWallModif) {
    ASSERT_EQ(engine.PlaceWall(2, 1, kRightSide, kThree), kValid);

    EXPECT_EQ(engine.PlaceWall(2, 1, kRightSide, kOne), kInvalid);
    EXPECT_EQ(engine.PlaceWall(3, 1, kRightSide, kOne), kInvalid);
    EXPECT_EQ(engine.PlaceWall(4, 1, kRightSide, kOne), kInvalid);

    EXPECT_EQ(engine.PlaceWall(1, 1, kRightSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(2, 1, kRightSide, kTwo), kInvalid);

    EXPECT_EQ(engine.PlaceWall(0, 1, kRightSide, kThree), kInvalid);

    ASSERT_EQ(engine.PlaceWall(1, 4, kBottomSide, kThree), kValid);

    EXPECT_EQ(engine.PlaceWall(1, 4, kBottomSide, kOne), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 5, kBottomSide, kOne), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 6, kBottomSide, kOne), kInvalid);

    EXPECT_EQ(engine.PlaceWall(1, 3, kBottomSide, kTwo), kInvalid);
    EXPECT_EQ(engine.PlaceWall(1, 4, kBottomSide, kTwo), kInvalid);

    EXPECT_EQ(engine.PlaceWall(1, 2, kBottomSide, kThree), kInvalid);
}

TEST_F(EngineTest, Blocked) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kBottomSide, kTwo), kValid);
    ASSERT_EQ(engine.PlaceWall(0, 2, kBottomSide, kTwo), kValid);
    ASSERT_EQ(engine.PlaceWall(0, 4, kBottomSide, kTwo), kValid);
    ASSERT_EQ(engine.PlaceWall(1, 5, kRightSide, kTwo), kValid);
    EXPECT_EQ(engine.PlaceWall(2, 5, kBottomSide, kTwo), kInvalid);
}

TEST_F(EngineTest, BlockedModif) {
    ASSERT_EQ(engine.PlaceWall(0, 0, kBottomSide, kThree), kValid);
    ASSERT_EQ(engine.PlaceWall(0, 3, kBottomSide, kThree), kValid);
    EXPECT_EQ(engine.PlaceWall(0, 6, kBottomSide, kOne), kInvalid);
}

TEST_F(EngineTest, BestMove) { engine.DoBestMove(); }