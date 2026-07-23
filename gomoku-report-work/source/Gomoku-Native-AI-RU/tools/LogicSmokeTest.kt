import com.example.gomoku.*
import kotlin.random.Random

private fun checkThat(condition: Boolean, message: String) {
    if (!condition) error(message)
}

private fun stateFromMoves(aiPlayer: Int, moves: List<Move>): GomokuState {
    val board = moves.fold(emptyBoard()) { current, move ->
        updateBoard(current, move.row, move.col, move.player)
    }
    return GomokuState(
        board = board,
        currentPlayer = aiPlayer,
        moves = moves,
        confirmBeforeMove = false,
        mode = GameMode.HUMAN_VS_AI,
        humanPlayer = otherPlayer(aiPlayer)
    )
}

fun main() {
    val whiteGame = GomokuGame.newGame(false, GameMode.HUMAN_VS_AI, WHITE)
    checkThat(whiteGame.board[7][7] == BLACK, "AI black opening must use center")
    checkThat(whiteGame.currentPlayer == WHITE, "Human white must move after center opening")
    checkThat(!GomokuGame.canUndo(whiteGame), "Protected center opening must not be undoable")

    val blackGame = GomokuGame.newGame(false, GameMode.HUMAN_VS_AI, BLACK)
    val afterHuman = GomokuGame.placeStone(blackGame, 7, 7)
    checkThat(GomokuGame.undoForMode(afterHuman).moves.isEmpty(), "Undo must cancel pending AI reply")

    val afterAi = GomokuGame.placeStone(afterHuman, 7, 8)
    val fullRoundUndo = GomokuGame.undoForMode(afterAi)
    checkThat(fullRoundUndo.moves.isEmpty(), "Undo must remove human and AI stones")
    checkThat(fullRoundUndo.currentPlayer == BLACK, "Undo must return turn to human")

    val whiteAfterHuman = GomokuGame.placeStone(whiteGame, 7, 8)
    val whiteAfterAi = GomokuGame.placeStone(whiteAfterHuman, 6, 7)
    val whiteUndo = GomokuGame.undoForMode(whiteAfterAi)
    checkThat(whiteUndo.moves == listOf(Move(7, 7, BLACK)), "White undo must preserve AI center opening")
    checkThat(whiteUndo.currentPlayer == WHITE, "White undo must return turn to human")

    val emptyAi = GomokuState(
        mode = GameMode.HUMAN_VS_AI,
        humanPlayer = WHITE,
        currentPlayer = BLACK
    )
    checkThat(AiPlayer.chooseMove(emptyAi, Random(0)) == BoardPoint(7, 7), "Empty AI board must use center")

    val winningState = stateFromMoves(
        WHITE,
        listOf(
            Move(7, 3, WHITE), Move(7, 4, WHITE),
            Move(7, 5, WHITE), Move(7, 6, WHITE),
            Move(6, 6, BLACK)
        )
    )
    val winningMove = AiPlayer.chooseMove(winningState, Random(0))
    checkThat(winningMove == BoardPoint(7, 2) || winningMove == BoardPoint(7, 7), "AI must win immediately")

    val blockingState = stateFromMoves(
        WHITE,
        listOf(
            Move(7, 3, BLACK), Move(7, 4, BLACK),
            Move(7, 5, BLACK), Move(7, 6, BLACK),
            Move(6, 6, WHITE)
        )
    )
    val blockingMove = AiPlayer.chooseMove(blockingState, Random(0))
    checkThat(blockingMove == BoardPoint(7, 2) || blockingMove == BoardPoint(7, 7), "AI must block immediate loss")

    val openThreeState = stateFromMoves(
        WHITE,
        listOf(
            Move(7, 5, WHITE), Move(7, 6, WHITE), Move(7, 7, WHITE),
            Move(3, 3, BLACK), Move(4, 4, BLACK)
        )
    )
    val openThreeMove = AiPlayer.chooseMove(openThreeState, Random(0))
    checkThat(openThreeMove == BoardPoint(7, 4) || openThreeMove == BoardPoint(7, 8), "AI must extend its open three")

    println("Logic smoke tests passed: 9 scenarios")
}
