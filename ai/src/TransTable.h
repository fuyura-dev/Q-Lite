#pragma once

//https://mediocrechess.blogspot.com/2007/01/guide-transposition-tables.html

#include "Position.h"
#include <vector>

constexpr auto kNumEntries = 1 << 22;

enum EntryKind : uint8_t {
	kExact,
	kLowerBound,
	kUpperBound
};

struct TTEntry {
	bool exist = false;
	Move move;
	EntryKind kind;
	Score score;
	int depth;
};

class TranspositionTable {
public:
	TranspositionTable() : entries(kNumEntries) {}

private:
	std::vector<TTEntry> entries;
};