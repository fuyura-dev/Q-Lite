#include <gtest/gtest.h>
#include "BFS.h"

class BFSTest : public testing::Test {
protected:
	Position pos;
};

TEST_F(BFSTest, OppositeEnds) {
	EXPECT_EQ(BFS(kStartPositions[0], kStartPositions[1], pos), kGridSize - 1);
}

TEST_F(BFSTest, SameCell) {
	EXPECT_EQ(BFS(kStartPositions[0], kStartPositions[0], pos), 0);
}

TEST_F(BFSTest, CornerToCorner) {
	EXPECT_EQ(BFS({ 0, 0 }, { kGridSize - 1, kGridSize - 1 }, pos), kGridSize * 2 - 2);
}