#include <gtest/gtest.h>
#include "Position.h"

class PositionTest : public testing::Test {
protected:
	Position pos;
};

TEST_F(PositionTest, IntersectingWall) {
	ASSERT_EQ(pos.PlaceWall({ 0, 0 }, kRightSide), kValid);
	EXPECT_EQ(pos.PlaceWall({ 0, 0 }, kBottomSide), kInvalid);
}

TEST_F(PositionTest, OverlapWall) {
	ASSERT_EQ(pos.PlaceWall({ 0, 0 }, kRightSide), kValid);
	EXPECT_EQ(pos.PlaceWall({ 1, 0 }, kRightSide), kInvalid);
}