package com.example.gomoku

import kotlin.math.abs
import kotlin.random.Random

object AiPlayer {

    fun chooseMove(
        state: GomokuState,
        random: Random = Random.Default
    ): BoardPoint? {
        if (state.gameOver) return null

        val aiPlayer = state.aiPlayer ?: state.currentPlayer
        val opponent = otherPlayer(aiPlayer)
        val candidates = candidateMoves(state.board)
        if (candidates.isEmpty()) return null

        val winningMoves = candidates.filter { point ->
            AiEvaluator.isWinningMove(state.board, point, aiPlayer)
        }
        if (winningMoves.isNotEmpty()) return winningMoves.random(random)

        val forcedBlocks = candidates.filter { point ->
            AiEvaluator.isWinningMove(state.board, point, opponent)
        }
        if (forcedBlocks.isNotEmpty()) return forcedBlocks.random(random)

        val scored = candidates.map { point ->
            val attack = AiEvaluator.scoreMove(state.board, point, aiPlayer)
            val defense = AiEvaluator.scoreMove(state.board, point, opponent)
            val locality = localityScore(state.board, point)
            val center = centerScore(point)
            ScoredMove(
                point = point,
                score = attack.toLong() * ATTACK_WEIGHT +
                    defense.toLong() * DEFENSE_WEIGHT +
                    locality + center
            )
        }

        val bestScore = scored.maxOf { it.score }
        return scored.filter { it.score == bestScore }.map { it.point }.random(random)
    }

    private fun candidateMoves(board: List<List<Int>>): List<BoardPoint> {
        val occupied = buildList {
            for (row in 0 until BOARD_SIZE) {
                for (col in 0 until BOARD_SIZE) {
                    if (board[row][col] != EMPTY) add(BoardPoint(row, col))
                }
            }
        }

        if (occupied.isEmpty()) {
            return listOf(BoardPoint(BOARD_SIZE / 2, BOARD_SIZE / 2))
        }

        val candidates = linkedSetOf<BoardPoint>()
        occupied.forEach { stone ->
            for (row in (stone.row - SEARCH_RADIUS)..(stone.row + SEARCH_RADIUS)) {
                for (col in (stone.col - SEARCH_RADIUS)..(stone.col + SEARCH_RADIUS)) {
                    if (isInsideBoard(row, col) && board[row][col] == EMPTY) {
                        candidates += BoardPoint(row, col)
                    }
                }
            }
        }
        return candidates.toList()
    }

    private fun localityScore(board: List<List<Int>>, point: BoardPoint): Long {
        var score = 0L
        for (row in (point.row - 2)..(point.row + 2)) {
            for (col in (point.col - 2)..(point.col + 2)) {
                if (!isInsideBoard(row, col) || board[row][col] == EMPTY) continue
                val distance = maxOf(abs(point.row - row), abs(point.col - col))
                score += when (distance) {
                    1 -> 18L
                    2 -> 5L
                    else -> 0L
                }
            }
        }
        return score
    }

    private fun centerScore(point: BoardPoint): Long {
        val center = BOARD_SIZE / 2
        return (BOARD_SIZE - abs(point.row - center) - abs(point.col - center)).toLong()
    }

    private data class ScoredMove(
        val point: BoardPoint,
        val score: Long
    )

    private const val SEARCH_RADIUS = 2
    private const val ATTACK_WEIGHT = 100L
    private const val DEFENSE_WEIGHT = 112L
}
