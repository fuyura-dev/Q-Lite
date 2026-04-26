#include "MoveGen.h"
#include <algorithm>
#include <ranges>

namespace {

WallSide ToWallSide(CellSide side) {
	if (side == CellSide::kLeftSide || side == CellSide::kRightSide) {
		return kRightSide;
	}
	return kBottomSide;
}

bool InBounds(GridPosition pos) {
	return 0 <= std::min(pos.row, pos.col) && std::max(pos.row, pos.col) < kGridSize;
}

bool HasWall(const Position& pos, GridPosition wall_pos, const CellSideVector& cell_side_vector) {
	auto [side, vector] = cell_side_vector;
	WallSide wall_side = ToWallSide(side);
	if (side == CellSide::kRightSide || side == CellSide::kBottomSide) {
		return pos.HasWall(wall_pos, wall_side);
	}
	return pos.HasWall(wall_pos + vector, wall_side);
}

}

void AdjacentMoveList::Iterator::Advance() {
	while (current_vector != std::end(kAdjacent)) {
		auto cell_side_vector = *current_vector++;
		GridPosition new_grid_pos = move_list->grid_pos + cell_side_vector.second;
		if (InBounds(new_grid_pos) && !HasWall(move_list->pos, move_list->grid_pos, cell_side_vector)) {
			ret = new_grid_pos;
			return;
		}
	}
	done = true;
}

PawnMoveList::PawnMoveList(const Position& pos) : MoveListCommon(pos),
	player(pos.GetPawnPosition(pos.GetCurrentTurn())),
	other(pos.GetPawnPosition(pos.GetCurrentTurn() == kWhite ? kBlack : kWhite)),
	adjacent(player, pos),
	jump_moves(other, pos) {
}

void PawnMoveList::Iterator::Advance() {
	if (!jumping) {
		NextAdjacent();
	} else {
		NextJumping();
	}
}

void PawnMoveList::Iterator::NextAdjacent() {
	while (current != move_list->adjacent.end()) {
		GridPosition grid_pos = *current;
		++current;
		if (grid_pos != move_list->other) {
			ret = grid_pos;
			return;
		}
		will_jump = true;
		GridPosition vector = move_list->other - move_list->player;
		GridPosition jump = move_list->other + vector;
		if (std::ranges::find(move_list->jump_moves, jump) != move_list->jump_moves.end()) {
			straight_jump = true;
		}
	}
	if (!will_jump) {
		done = true;
	} else if (will_jump && current == move_list->adjacent.end()) {
		jumping = true;
		current = move_list->jump_moves.begin();
		NextJumping();
	}
}

void PawnMoveList::Iterator::NextJumping() {
	while (current != move_list->jump_moves.end()) {
		GridPosition grid_pos = *current;
		++current;
		if (grid_pos == move_list->player) {
			continue;
		}
		bool same_row_or_col = grid_pos.row == move_list->player.row || 
								grid_pos.col == move_list->player.col;
		if (same_row_or_col == straight_jump) {
			ret = grid_pos;
			return;
		}
	}
	done = true;
}

void AllMoveList::Iterator::Advance() {
	while (pawn_current != move_list->pawn_moves.end()) {
		GridPosition grid_pos = *pawn_current;
		++pawn_current;
		ret = {
			.kind = MoveKind::kMovePawn,
			.pos = grid_pos,
			.side = std::nullopt
		};
		return;
	}
	if (move_list->pos.GetRemainingWalls(move_list->pos.GetCurrentTurn()) == 0) {
		done = true;
		return;
	}

	while (wall_current != kTotalCells) {
		GridPosition grid_pos = GridPosition::from_compressed(wall_current);
		WallSide side = current_side;
		current_side = static_cast<WallSide>(!current_side);
		if (current_side == kRightSide) {
			wall_current++;
		}

		if (move_list->pos.CanPlaceWall(grid_pos, side)) {
			ret = {
				.kind = MoveKind::kPlaceWall,
				.pos = grid_pos,
				.side = side
			};
			return;
		}
	}
	done = true;
}
