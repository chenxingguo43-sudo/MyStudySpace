package com.example.gomoku

private val WIN_DIRECTIONS = listOf(
    0 to 1,
    1 to 0,
    1 to 1,
    1 to -1
)

fun isInsideBoard(row: Int, col: Int): Boolean =
    row in 0 until BOARD_SIZE && col in 0 until BOARD_SIZE

fun updateBoard(
    board: List<List<Int>>,
    row: Int,
    col: Int,
    value: Int
): List<List<Int>> = board.mapIndexed { rowIndex, cells ->
    if (rowIndex == row) {
        cells.mapIndexed { colIndex, oldValue ->
            if (colIndex == col) value else oldValue
        }
    } else {
        cells
    }
}

fun findWinningCells(
    board: List<List<Int>>,
    row: Int,
    col: Int
): List<BoardPoint> {
    if (!isInsideBoard(row, col)) return emptyList()
    val player = board[row][col]
    if (player == EMPTY) return emptyList()

    WIN_DIRECTIONS.forEach { (deltaRow, deltaCol) ->
        val line = collectLine(board, row, col, deltaRow, deltaCol, player)
        if (line.size >= 5) {
            return selectFiveContainingMove(line, BoardPoint(row, col))
        }
    }

    return emptyList()
}

private fun collectLine(
    board: List<List<Int>>,
    row: Int,
    col: Int,
    deltaRow: Int,
    deltaCol: Int,
    player: Int
): List<BoardPoint> {
    val result = mutableListOf(BoardPoint(row, col))

    var nextRow = row - deltaRow
    var nextCol = col - deltaCol
    while (isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] == player) {
        result.add(0, BoardPoint(nextRow, nextCol))
        nextRow -= deltaRow
        nextCol -= deltaCol
    }

    nextRow = row + deltaRow
    nextCol = col + deltaCol
    while (isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] == player) {
        result.add(BoardPoint(nextRow, nextCol))
        nextRow += deltaRow
        nextCol += deltaCol
    }

    return result
}

private fun selectFiveContainingMove(
    line: List<BoardPoint>,
    move: BoardPoint
): List<BoardPoint> {
    if (line.size == 5) return line

    val moveIndex = line.indexOf(move)
    val latestStart = (line.size - 5).coerceAtLeast(0)
    val preferredStart = (moveIndex - 2).coerceIn(0, latestStart)
    return line.subList(preferredStart, preferredStart + 5)
}
