package com.example.gomoku

internal object AiEvaluator {

    private val directions = listOf(
        0 to 1,
        1 to 0,
        1 to 1,
        1 to -1
    )

    fun isWinningMove(
        board: List<List<Int>>,
        point: BoardPoint,
        player: Int
    ): Boolean {
        if (board[point.row][point.col] != EMPTY) return false
        val nextBoard = updateBoard(board, point.row, point.col, player)
        return findWinningCells(nextBoard, point.row, point.col).isNotEmpty()
    }

    fun scoreMove(
        board: List<List<Int>>,
        point: BoardPoint,
        player: Int
    ): Int {
        if (board[point.row][point.col] != EMPTY) return Int.MIN_VALUE

        var score = 0
        var strongDirections = 0

        directions.forEach { (deltaRow, deltaCol) ->
            val backward = countStones(board, point, -deltaRow, -deltaCol, player)
            val forward = countStones(board, point, deltaRow, deltaCol, player)
            val total = backward.count + 1 + forward.count
            val openEnds = (if (backward.open) 1 else 0) + (if (forward.open) 1 else 0)
            val directionScore = patternScore(total, openEnds)
            score += directionScore
            if (directionScore >= OPEN_THREE_SCORE) strongDirections += 1
        }

        if (strongDirections >= 2) {
            score += DOUBLE_THREAT_BONUS
        }
        return score
    }

    private fun countStones(
        board: List<List<Int>>,
        point: BoardPoint,
        deltaRow: Int,
        deltaCol: Int,
        player: Int
    ): SideCount {
        var row = point.row + deltaRow
        var col = point.col + deltaCol
        var count = 0

        while (isInsideBoard(row, col) && board[row][col] == player) {
            count += 1
            row += deltaRow
            col += deltaCol
        }

        return SideCount(
            count = count,
            open = isInsideBoard(row, col) && board[row][col] == EMPTY
        )
    }

    private fun patternScore(total: Int, openEnds: Int): Int = when {
        total >= 5 -> FIVE_SCORE
        total == 4 && openEnds == 2 -> OPEN_FOUR_SCORE
        total == 4 && openEnds == 1 -> CLOSED_FOUR_SCORE
        total == 3 && openEnds == 2 -> OPEN_THREE_SCORE
        total == 3 && openEnds == 1 -> CLOSED_THREE_SCORE
        total == 2 && openEnds == 2 -> OPEN_TWO_SCORE
        total == 2 && openEnds == 1 -> CLOSED_TWO_SCORE
        total == 1 && openEnds == 2 -> SINGLE_SCORE
        else -> 0
    }

    private data class SideCount(
        val count: Int,
        val open: Boolean
    )

    private const val FIVE_SCORE = 1_000_000
    private const val OPEN_FOUR_SCORE = 120_000
    private const val CLOSED_FOUR_SCORE = 25_000
    private const val OPEN_THREE_SCORE = 8_000
    private const val CLOSED_THREE_SCORE = 1_200
    private const val OPEN_TWO_SCORE = 450
    private const val CLOSED_TWO_SCORE = 100
    private const val SINGLE_SCORE = 20
    private const val DOUBLE_THREAT_BONUS = 18_000
}
