#include <gtest/gtest.h>

#define private public
#include "BFS.h"

class BFSTest : public testing::Test {
protected:
	Position pos;
};

TEST_F(BFSTest, OppositeEnds) {
	EXPECT_EQ(BFS(kStartPositions[0], kTargetRow[0], 0, 0), kGridSize - 1);
}


TEST_F(BFSTest, Blocked) {
	pos.PlaceWall({ 0, 0 }, kBottomSide);
	pos.PlaceWall({ 0, 2 }, kBottomSide);
	pos.PlaceWall({ 0, 4 }, kBottomSide);
	pos.PlaceWall({ 1, 5 }, kRightSide);
	pos.PlaceWall({ 2, 5 }, kBottomSide);
	EXPECT_EQ(BFS(kStartPositions[0], kTargetRow[0], pos.walls[kRightSide], pos.walls[kBottomSide]), kUnreachable);
}