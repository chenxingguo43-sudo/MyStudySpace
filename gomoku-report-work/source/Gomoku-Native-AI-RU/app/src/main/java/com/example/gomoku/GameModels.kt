package com.example.gomoku

const val BOARD_SIZE = 15
const val EMPTY = 0
const val BLACK = 1
const val WHITE = 2

enum class GameMode {
    LOCAL_TWO_PLAYER,
    HUMAN_VS_AI
}

data class BoardPoint(
    val row: Int,
    val col: Int
)

data class Move(
    val row: Int,
    val col: Int,
    val player: Int
)

data class GomokuState(
    val board: List<List<Int>> = emptyBoard(),
    val currentPlayer: Int = BLACK,
    val moves: List<Move> = emptyList(),
    val pendingMove: BoardPoint? = null,
    val winner: Int? = null,
    val winningCells: List<BoardPoint> = emptyList(),
    val isDraw: Boolean = false,
    val confirmBeforeMove: Boolean = true,
    val mode: GameMode = GameMode.LOCAL_TWO_PLAYER,
    val humanPlayer: Int = BLACK
) {
    val gameOver: Boolean
        get() = winner != null || isDraw

    val lastMove: Move?
        get() = moves.lastOrNull()

    val aiPlayer: Int?
        get() = if (mode == GameMode.HUMAN_VS_AI) otherPlayer(humanPlayer) else null

    val isHumanTurn: Boolean
        get() = mode == GameMode.LOCAL_TWO_PLAYER || currentPlayer == humanPlayer
}

fun emptyBoard(): List<List<Int>> =
    List(BOARD_SIZE) { List(BOARD_SIZE) { EMPTY } }

fun otherPlayer(player: Int): Int = if (player == BLACK) WHITE else BLACK
