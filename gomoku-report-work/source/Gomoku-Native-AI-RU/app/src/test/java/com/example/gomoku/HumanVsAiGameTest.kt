package com.example.gomoku

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HumanVsAiGameTest {

    @Test
    fun choosingWhiteStartsWithAiCenterMoveAndHumanTurn() {
        val state = GomokuGame.newGame(
            confirmBeforeMove = true,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = WHITE
        )

        assertEquals(BLACK, state.board[7][7])
        assertEquals(listOf(Move(7, 7, BLACK)), state.moves)
        assertEquals(WHITE, state.currentPlayer)
        assertTrue(state.isHumanTurn)
    }

    @Test
    fun undoWhileAiHasNotRepliedRemovesOnlyHumanMove() {
        val initial = GomokuGame.newGame(
            confirmBeforeMove = false,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = BLACK
        )
        val afterHuman = GomokuGame.placeStone(initial, 7, 7)

        val undone = GomokuGame.undoForMode(afterHuman)

        assertTrue(undone.moves.isEmpty())
        assertEquals(BLACK, undone.currentPlayer)
        assertTrue(undone.isHumanTurn)
    }

    @Test
    fun undoAfterAiReplyRemovesAFullRound() {
        val initial = GomokuGame.newGame(
            confirmBeforeMove = false,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = BLACK
        )
        val afterHuman = GomokuGame.placeStone(initial, 7, 7)
        val afterAi = GomokuGame.placeStone(afterHuman, 7, 8)

        val undone = GomokuGame.undoForMode(afterAi)

        assertTrue(undone.moves.isEmpty())
        assertEquals(BLACK, undone.currentPlayer)
        assertEquals(EMPTY, undone.board[7][7])
        assertEquals(EMPTY, undone.board[7][8])
    }

    @Test
    fun openingCenterMoveCannotBeUndoneByWhitePlayer() {
        val initial = GomokuGame.newGame(
            confirmBeforeMove = true,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = WHITE
        )

        val undone = GomokuGame.undoForMode(initial)

        assertEquals(initial, undone)
        assertFalse(GomokuGame.canUndo(initial))
    }

    @Test
    fun restartPreservesModeAndColorAndRestoresCenterOpening() {
        val initial = GomokuGame.newGame(
            confirmBeforeMove = false,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = WHITE
        )
        val afterHuman = GomokuGame.placeStone(initial, 7, 8)
        val restarted = GomokuGame.restart(afterHuman)

        assertEquals(GameMode.HUMAN_VS_AI, restarted.mode)
        assertEquals(WHITE, restarted.humanPlayer)
        assertEquals(BLACK, restarted.board[7][7])
        assertEquals(WHITE, restarted.currentPlayer)
        assertFalse(restarted.confirmBeforeMove)
    }
}
