#pragma once

#include <iterator>
#include "Position.h"
#include "Quoridor.h"

enum class CellSide : uint8_t {
	kRightSide,
	kBottomSide,
	kLeftSide,
	kTopSide
};

using CellSideVector = std::pair<CellSide, GridPosition>;

inline constexpr CellSideVector kAdjacent[4] = {
	{CellSide::kRightSide, {.row = 0, .col = 1}},
	{CellSide::kBottomSide, {.row = 1, .col = 0}},
	{CellSide::kLeftSide, {.row = 0, .col = -1}},
	{CellSide::kTopSide, {.row = -1, .col = 0}}
};

template <typename Derived>
class MoveListCommon {
public:
	MoveListCommon(const Position& pos) : pos(pos) {}
	auto begin() const {
		typename Derived::Iterator it{ static_cast<const Derived&>(*this) };
		++it;
		return it;
	}
	std::default_sentinel_t end() const {
		return std::default_sentinel;
	}
protected:
	Position pos;
};


template <typename ValueType, typename Iterator>
class IteratorCommon {
public:
    using value_type = ValueType;
    using difference_type = ptrdiff_t;

   	value_type operator*() const {
		return ret;
	}
	Iterator& operator++() {
		Iterator& it = static_cast<Iterator&>(*this);
		it.Advance();
		return it;
   	}
	void operator++(int) {
		this->operator++();
	}
	bool operator==(std::default_sentinel_t) const {
		return done;
	}

protected:
    ValueType ret{};
    bool done = false;
};

class AdjacentMoveList : public MoveListCommon<AdjacentMoveList> {
public:
	AdjacentMoveList(GridPosition grid_pos, const Position& pos) :
		MoveListCommon(pos), grid_pos(grid_pos) {}

	class Iterator;

private:
	GridPosition grid_pos;
};


class AdjacentMoveList::Iterator : public IteratorCommon<GridPosition, Iterator> {
public:
	void Advance();
	Iterator(const AdjacentMoveList& move_list) : move_list(&move_list) {}

private:
	const AdjacentMoveList* move_list;
	const CellSideVector* current_vector = kAdjacent;
};

class PawnMoveList : public MoveListCommon<PawnMoveList> {
public:
	PawnMoveList(const Position& pos);

	class Iterator;

private:
	GridPosition player, other;
	AdjacentMoveList adjacent, jump_moves;
};

class PawnMoveList::Iterator : public IteratorCommon<GridPosition, Iterator> {
public:
	void Advance();
	Iterator(const PawnMoveList& move_list) : move_list(&move_list), current(move_list.adjacent.begin()) {}

private:
	void NextAdjacent();
	void NextJumping();

	bool straight_jump = false, jumping = false;
	const PawnMoveList* move_list;
	AdjacentMoveList::Iterator current;
};
