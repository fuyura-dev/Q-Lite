#include <gtest/gtest.h>
#include "BFS.h"

class BFSTest : public testing::Test {
protected:
	int8_t BFS(GridPosition start_pos, GridPosition end_pos) const {
		return ::BFS(start_pos, [&](GridPosition current_pos) {
			return current_pos == end_pos;
		}, pos);
	}
	Position pos;
};

TEST_F(BFSTest, OppositeEnds) {
	EXPECT_EQ(BFS(kStartPositions[0], kStartPositions[1]), kGridSize - 1);
}

TEST_F(BFSTest, SameCell) {
	EXPECT_EQ(BFS(kStartPositions[0], kStartPositions[0]), 0);
}

TEST_F(BFSTest, CornerToCorner) {
	EXPECT_EQ(BFS({ 0, 0 }, { kGridSize - 1, kGridSize - 1 }), kGridSize * 2 - 2);
}

TEST_F(BFSTest, Blocked) {
	pos.PlaceWall({ 0, 0 }, kBottomSide);
	pos.PlaceWall({ 0, 2 }, kBottomSide);
	pos.PlaceWall({ 0, 4 }, kBottomSide);
	pos.PlaceWall({ 0, 6 }, kBottomSide);
	pos.PlaceWall({ 1, 5 }, kRightSide);
	pos.PlaceWall({ 2, 5 }, kBottomSide);
	EXPECT_EQ(BFS(kStartPositions[0], kStartPositions[1]), kUnreachable);
}