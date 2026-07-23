package com.example.gomoku

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GomokuGameTest {

    @Test
    fun firstTapCreatesPreviewWithoutPlacingStone() {
        val next = GomokuGame.tapCell(GomokuState(), 7, 7)

        assertEquals(BoardPoint(7, 7), next.pendingMove)
        assertEquals(EMPTY, next.board[7][7])
        assertTrue(next.moves.isEmpty())
        assertEquals(BLACK, next.currentPlayer)
    }

    @Test
    fun tappingDifferentEmptyCellMovesPreview() {
        val preview = GomokuGame.tapCell(GomokuState(), 7, 7)
        val moved = GomokuGame.tapCell(preview, 8, 9)

        assertEquals(BoardPoint(8, 9), moved.pendingMove)
        assertEquals(EMPTY, moved.board[7][7])
        assertEquals(EMPTY, moved.board[8][9])
    }

    @Test
    fun tappingSamePreviewCellCommitsMoveAndChangesPlayer() {
        val preview = GomokuGame.tapCell(GomokuState(), 7, 7)
        val committed = GomokuGame.tapCell(preview, 7, 7)

        assertNull(committed.pendingMove)
        assertEquals(BLACK, committed.board[7][7])
        assertEquals(WHITE, committed.currentPlayer)
        assertEquals(listOf(Move(7, 7, BLACK)), committed.moves)
    }

    @Test
    fun tappingOccupiedCellDoesNotMoveExistingPreview() {
        val blackPreview = GomokuGame.tapCell(GomokuState(), 7, 7)
        val afterBlack = GomokuGame.tapCell(blackPreview, 7, 7)
        val whitePreview = GomokuGame.tapCell(afterBlack, 8, 8)
        val afterOccupiedTap = GomokuGame.tapCell(whitePreview, 7, 7)

        assertEquals(whitePreview, afterOccupiedTap)
    }

    @Test
    fun disablingConfirmationClearsExistingPreview() {
        val preview = GomokuGame.tapCell(GomokuState(), 7, 7)
        val direct = GomokuGame.setConfirmation(preview, false)

        assertFalse(direct.confirmBeforeMove)
        assertNull(direct.pendingMove)
    }

    @Test
    fun directPlacementCommitsOnFirstTap() {
        val state = GomokuState(confirmBeforeMove = false)
        val next = GomokuGame.tapCell(state, 3, 4)

        assertEquals(BLACK, next.board[3][4])
        assertEquals(WHITE, next.currentPlayer)
        assertNull(next.pendingMove)
    }

    @Test
    fun undoRemovesLastMoveAndReturnsTurnToItsPlayer() {
        val first = GomokuGame.placeStone(GomokuState(), 7, 7)
        val second = GomokuGame.placeStone(first, 7, 8)
        val undone = GomokuGame.undo(second)

        assertEquals(EMPTY, undone.board[7][8])
        assertEquals(BLACK, undone.board[7][7])
        assertEquals(WHITE, undone.currentPlayer)
        assertEquals(1, undone.moves.size)
        assertNull(undone.winner)
        assertFalse(undone.isDraw)
    }

    @Test
    fun restartKeepsConfirmationSettingButClearsGame() {
        val played = GomokuGame.placeStone(GomokuState(confirmBeforeMove = false), 7, 7)
        val restarted = GomokuGame.restart(played)

        assertFalse(restarted.confirmBeforeMove)
        assertEquals(BLACK, restarted.currentPlayer)
        assertTrue(restarted.moves.isEmpty())
        assertTrue(restarted.board.flatten().all { it == EMPTY })
    }

    @Test
    fun detectsHorizontalWin() {
        assertWin(listOf(7 to 3, 7 to 4, 7 to 5, 7 to 6, 7 to 7))
    }

    @Test
    fun detectsVerticalWin() {
        assertWin(listOf(3 to 7, 4 to 7, 5 to 7, 6 to 7, 7 to 7))
    }

    @Test
    fun detectsDescendingDiagonalWin() {
        assertWin(listOf(3 to 3, 4 to 4, 5 to 5, 6 to 6, 7 to 7))
    }

    @Test
    fun detectsAscendingDiagonalWin() {
        assertWin(listOf(7 to 3, 6 to 4, 5 to 5, 4 to 6, 3 to 7))
    }

    private fun assertWin(points: List<Pair<Int, Int>>) {
        var state = GomokuState(confirmBeforeMove = false)
        points.forEachIndexed { index, (row, col) ->
            state = if (index == points.lastIndex) {
                GomokuGame.placeStone(state.copy(currentPlayer = BLACK), row, col)
            } else {
                GomokuGame.placeStone(state.copy(currentPlayer = BLACK), row, col)
            }
        }

        assertEquals(BLACK, state.winner)
        assertEquals(5, state.winningCells.size)
    }
}

// Human-vs-AI regression tests are kept in this file so the game-state rules stay documented
// next to the existing move and win tests.
