package com.example.gomoku

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AiPlayerTest {

    @Test
    fun emptyBoardUsesCenter() {
        val state = GomokuState(
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = WHITE,
            currentPlayer = BLACK
        )

        assertEquals(BoardPoint(7, 7), AiPlayer.chooseMove(state, Random(0)))
    }

    @Test
    fun aiTakesImmediateWinningMove() {
        val state = aiState(
            aiPlayer = WHITE,
            moves = listOf(
                Move(7, 3, WHITE),
                Move(7, 4, WHITE),
                Move(7, 5, WHITE),
                Move(7, 6, WHITE),
                Move(6, 6, BLACK)
            )
        )

        val move = AiPlayer.chooseMove(state, Random(0))

        assertTrue(move == BoardPoint(7, 2) || move == BoardPoint(7, 7))
    }

    @Test
    fun aiBlocksHumanImmediateWin() {
        val state = aiState(
            aiPlayer = WHITE,
            moves = listOf(
                Move(7, 3, BLACK),
                Move(7, 4, BLACK),
                Move(7, 5, BLACK),
                Move(7, 6, BLACK),
                Move(6, 6, WHITE)
            )
        )

        val move = AiPlayer.chooseMove(state, Random(0))

        assertTrue(move == BoardPoint(7, 2) || move == BoardPoint(7, 7))
    }

    @Test
    fun aiExtendsOpenThreeInsteadOfPlayingFarAway() {
        val state = aiState(
            aiPlayer = WHITE,
            moves = listOf(
                Move(7, 5, WHITE),
                Move(7, 6, WHITE),
                Move(7, 7, WHITE),
                Move(3, 3, BLACK),
                Move(4, 4, BLACK)
            )
        )

        val move = AiPlayer.chooseMove(state, Random(0))

        assertTrue(move == BoardPoint(7, 4) || move == BoardPoint(7, 8))
    }

    private fun aiState(aiPlayer: Int, moves: List<Move>): GomokuState {
        val human = if (aiPlayer == BLACK) WHITE else BLACK
        val board = moves.fold(emptyBoard()) { current, move ->
            updateBoard(current, move.row, move.col, move.player)
        }
        return GomokuState(
            board = board,
            currentPlayer = aiPlayer,
            moves = moves,
            confirmBeforeMove = false,
            mode = GameMode.HUMAN_VS_AI,
            humanPlayer = human
        )
    }
}
