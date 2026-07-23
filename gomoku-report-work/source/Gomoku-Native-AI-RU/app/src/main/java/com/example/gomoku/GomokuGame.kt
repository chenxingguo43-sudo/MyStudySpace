package com.example.gomoku

object GomokuGame {

    fun newGame(
        confirmBeforeMove: Boolean = true,
        mode: GameMode = GameMode.LOCAL_TWO_PLAYER,
        humanPlayer: Int = BLACK
    ): GomokuState {
        require(humanPlayer == BLACK || humanPlayer == WHITE) {
            "humanPlayer must be BLACK or WHITE"
        }

        val initial = GomokuState(
            confirmBeforeMove = confirmBeforeMove,
            mode = mode,
            humanPlayer = humanPlayer
        )

        return if (mode == GameMode.HUMAN_VS_AI && humanPlayer == WHITE) {
            placeStone(initial, BOARD_SIZE / 2, BOARD_SIZE / 2)
        } else {
            initial
        }
    }

    fun tapCell(state: GomokuState, row: Int, col: Int): GomokuState {
        if (state.gameOver || !isInsideBoard(row, col) || state.board[row][col] != EMPTY) {
            return state
        }

        if (!state.confirmBeforeMove) {
            return placeStone(state, row, col)
        }

        val nextPoint = BoardPoint(row, col)
        return if (state.pendingMove == nextPoint) {
            placeStone(state, row, col)
        } else {
            state.copy(pendingMove = nextPoint)
        }
    }

    fun placeStone(state: GomokuState, row: Int, col: Int): GomokuState {
        if (state.gameOver || !isInsideBoard(row, col) || state.board[row][col] != EMPTY) {
            return state
        }

        val player = state.currentPlayer
        val board = updateBoard(state.board, row, col, player)
        val moves = state.moves + Move(row, col, player)
        val winningCells = findWinningCells(board, row, col)
        val winner = player.takeIf { winningCells.isNotEmpty() }
        val draw = winner == null && moves.size == BOARD_SIZE * BOARD_SIZE

        return state.copy(
            board = board,
            currentPlayer = if (winner == null && !draw) otherPlayer(player) else player,
            moves = moves,
            pendingMove = null,
            winner = winner,
            winningCells = winningCells,
            isDraw = draw
        )
    }

    fun undo(state: GomokuState): GomokuState {
        val lastMove = state.moves.lastOrNull()
            ?: return state.copy(pendingMove = null)

        return state.copy(
            board = updateBoard(state.board, lastMove.row, lastMove.col, EMPTY),
            currentPlayer = lastMove.player,
            moves = state.moves.dropLast(1),
            pendingMove = null,
            winner = null,
            winningCells = emptyList(),
            isDraw = false
        )
    }

    fun undoForMode(state: GomokuState): GomokuState {
        if (state.mode == GameMode.LOCAL_TWO_PLAYER) return undo(state)
        if (!canUndo(state)) return state.copy(pendingMove = null)

        val lastMove = state.moves.last()
        val removeCount = if (lastMove.player == state.humanPlayer) 1 else 2
        val remainingMoves = state.moves.dropLast(removeCount.coerceAtMost(state.moves.size))

        return state.copy(
            board = boardFromMoves(remainingMoves),
            currentPlayer = state.humanPlayer,
            moves = remainingMoves,
            pendingMove = null,
            winner = null,
            winningCells = emptyList(),
            isDraw = false
        )
    }

    fun canUndo(state: GomokuState): Boolean {
        if (state.mode == GameMode.LOCAL_TWO_PLAYER) return state.moves.isNotEmpty()
        if (state.moves.isEmpty()) return false

        val aiPlayer = state.aiPlayer ?: return false
        val isProtectedOpening = state.humanPlayer == WHITE &&
            state.moves.size == 1 &&
            state.moves.first().player == aiPlayer
        if (isProtectedOpening) return false

        val lastMove = state.moves.last()
        return lastMove.player == state.humanPlayer ||
            state.moves.dropLast(1).any { it.player == state.humanPlayer }
    }

    fun restart(state: GomokuState): GomokuState = newGame(
        confirmBeforeMove = state.confirmBeforeMove,
        mode = state.mode,
        humanPlayer = state.humanPlayer
    )

    fun setConfirmation(state: GomokuState, enabled: Boolean): GomokuState =
        state.copy(confirmBeforeMove = enabled, pendingMove = null)

    private fun boardFromMoves(moves: List<Move>): List<List<Int>> =
        moves.fold(emptyBoard()) { board, move ->
            updateBoard(board, move.row, move.col, move.player)
        }
}
