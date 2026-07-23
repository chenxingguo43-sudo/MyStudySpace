package com.example.gomoku

import android.view.SoundEffectConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun GameScreen(
    mode: GameMode,
    humanPlayer: Int,
    confirmBeforeMove: Boolean,
    soundEnabled: Boolean,
    vibrationEnabled: Boolean,
    onConfirmBeforeMoveChange: (Boolean) -> Unit,
    onSoundEnabledChange: (Boolean) -> Unit,
    onVibrationEnabledChange: (Boolean) -> Unit,
    onLeaveGame: () -> Unit
) {
    var state by remember(mode, humanPlayer) {
        mutableStateOf(
            GomokuGame.newGame(
                confirmBeforeMove = confirmBeforeMove,
                mode = mode,
                humanPlayer = humanPlayer
            )
        )
    }
    var showSettings by remember { mutableStateOf(false) }
    var showLeave by remember { mutableStateOf(false) }
    var showRestart by remember { mutableStateOf(false) }
    var showResult by remember { mutableStateOf(false) }
    var isAiThinking by remember { mutableStateOf(false) }
    var animationVersion by remember { mutableIntStateOf(0) }
    var animatedMove by remember { mutableStateOf<BoardPoint?>(null) }

    val haptic = LocalHapticFeedback.current
    val view = LocalView.current
    val stoneScale = remember { Animatable(1f) }
    val winningProgress by animateFloatAsState(
        targetValue = if (state.winningCells.isEmpty()) 0f else 1f,
        animationSpec = tween(480, easing = FastOutSlowInEasing),
        label = "winning-line-progress"
    )

    fun commitState(next: GomokuState, committedPoint: BoardPoint? = null) {
        val moveCommitted = next.moves.size > state.moves.size
        state = next

        if (moveCommitted) {
            animatedMove = committedPoint
            animationVersion += 1
            if (vibrationEnabled) {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            }
            if (soundEnabled) {
                view.playSoundEffect(SoundEffectConstants.CLICK)
            }
            if (next.gameOver) {
                showResult = true
            }
        }
    }

    fun restartGame() {
        isAiThinking = false
        state = GomokuGame.restart(state)
        animatedMove = null
        showResult = false
        showRestart = false
    }

    LaunchedEffect(confirmBeforeMove) {
        state = GomokuGame.setConfirmation(state, confirmBeforeMove)
    }

    LaunchedEffect(animationVersion) {
        if (animationVersion == 0) return@LaunchedEffect
        stoneScale.snapTo(0.72f)
        stoneScale.animateTo(
            targetValue = 1f,
            animationSpec = tween(170, easing = FastOutSlowInEasing)
        )
    }

    LaunchedEffect(state) {
        val aiPlayer = state.aiPlayer
        val shouldAiMove = state.mode == GameMode.HUMAN_VS_AI &&
            !state.gameOver &&
            aiPlayer != null &&
            state.currentPlayer == aiPlayer

        if (!shouldAiMove) {
            isAiThinking = false
            return@LaunchedEffect
        }

        val requestedMoveCount = state.moves.size
        val requestedPlayer = state.currentPlayer
        isAiThinking = true
        try {
            delay(AI_THINK_DELAY_MS)
            val requestIsStillCurrent = !state.gameOver &&
                state.moves.size == requestedMoveCount &&
                state.currentPlayer == requestedPlayer &&
                state.currentPlayer == state.aiPlayer
            if (!requestIsStillCurrent) return@LaunchedEffect

            val move = AiPlayer.chooseMove(state)
            if (move != null) {
                commitState(
                    next = GomokuGame.placeStone(state, move.row, move.col),
                    committedPoint = move
                )
            }
        } finally {
            isAiThinking = false
        }
    }

    val boardInputEnabled = !state.gameOver && !isAiThinking && state.isHumanTurn

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.game_scene),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFF032F2B).copy(alpha = 0.56f),
                            Color(0xFF0A554C).copy(alpha = 0.25f),
                            Color(0xFF032F2B).copy(alpha = 0.58f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            PlayerHeader(
                currentPlayer = state.currentPlayer,
                winner = state.winner,
                aiPlayer = state.aiPlayer
            )

            Spacer(modifier = Modifier.size(10.dp))

            Text(
                text = turnText(state, isAiThinking),
                color = GoldLight,
                fontFamily = FontFamily.Serif,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.size(8.dp))

            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                val boardSize = if (maxWidth < maxHeight) maxWidth else maxHeight
                GomokuBoard(
                    state = state,
                    animatedMove = animatedMove,
                    animatedMoveScale = stoneScale.value,
                    winningProgress = winningProgress,
                    inputEnabled = boardInputEnabled,
                    onCellTap = cellTap@ { row, col ->
                        if (!boardInputEnabled) return@cellTap
                        val point = BoardPoint(row, col)
                        commitState(
                            next = GomokuGame.tapCell(state, row, col),
                            committedPoint = point
                        )
                    },
                    modifier = Modifier.size(boardSize)
                )
            }

            Text(
                text = pendingHint(state, isAiThinking),
                color = Color.White.copy(alpha = 0.82f),
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                lineHeight = 16.sp,

                // 始终占两行高度，避免棋盘上下晃动
                minLines = 2,
                maxLines = 2,

                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp)
            )

            BottomActionBar(
                canUndo = GomokuGame.canUndo(state),
                onLeave = { showLeave = true },
                onUndo = {
                    isAiThinking = false
                    state = GomokuGame.undoForMode(state)
                    animatedMove = null
                    showResult = false
                    if (soundEnabled) {
                        view.playSoundEffect(SoundEffectConstants.CLICK)
                    }
                },
                onRestart = {
                    if (state.moves.isEmpty() && state.pendingMove == null) {
                        restartGame()
                    } else {
                        showRestart = true
                    }
                },
                onSettings = { showSettings = true }
            )
        }
    }

    if (showSettings) {
        SettingsDialog(
            confirmBeforeMove = state.confirmBeforeMove,
            soundEnabled = soundEnabled,
            vibrationEnabled = vibrationEnabled,
            onConfirmBeforeMoveChange = { enabled ->
                state = GomokuGame.setConfirmation(state, enabled)
                onConfirmBeforeMoveChange(enabled)
            },
            onSoundEnabledChange = onSoundEnabledChange,
            onVibrationEnabledChange = onVibrationEnabledChange,
            onDismiss = { showSettings = false }
        )
    }

    if (showLeave) {
        ConfirmActionDialog(
            title = stringResource(R.string.leave_title),
            message = stringResource(R.string.leave_message),
            dismissText = stringResource(R.string.stay),
            confirmText = stringResource(R.string.leave_confirm),
            confirmColor = Color(0xFFB84435),
            onConfirm = {
                isAiThinking = false
                showLeave = false
                onLeaveGame()
            },
            onDismiss = { showLeave = false }
        )
    }

    if (showRestart) {
        ConfirmActionDialog(
            title = stringResource(R.string.restart_title),
            message = stringResource(R.string.restart_message),
            dismissText = stringResource(R.string.cancel),
            confirmText = stringResource(R.string.restart_confirm),
            confirmColor = Color(0xFF7A429B),
            onConfirm = ::restartGame,
            onDismiss = { showRestart = false }
        )
    }

    if (showResult) {
        ResultDialog(
            winner = state.winner,
            isDraw = state.isDraw,
            onRestart = ::restartGame,
            onViewBoard = { showResult = false },
            onLeave = {
                isAiThinking = false
                showResult = false
                onLeaveGame()
            }
        )
    }
}

@Composable
private fun turnText(state: GomokuState, isAiThinking: Boolean): String = when {
    state.winner == BLACK -> stringResource(R.string.turn_black_won)
    state.winner == WHITE -> stringResource(R.string.turn_white_won)
    state.isDraw -> stringResource(R.string.turn_draw)
    isAiThinking -> stringResource(R.string.turn_ai_thinking)
    state.mode == GameMode.HUMAN_VS_AI && state.isHumanTurn -> stringResource(R.string.turn_human)
    state.mode == GameMode.HUMAN_VS_AI -> stringResource(R.string.turn_ai)
    state.currentPlayer == BLACK -> stringResource(R.string.turn_black)
    else -> stringResource(R.string.turn_white)
}

@Composable
private fun pendingHint(state: GomokuState, isAiThinking: Boolean): String = when {
    state.gameOver -> stringResource(R.string.hint_game_over)
    isAiThinking -> stringResource(R.string.hint_ai_thinking)
    !state.isHumanTurn -> stringResource(R.string.hint_wait_ai)
    !state.confirmBeforeMove -> stringResource(R.string.hint_direct_move)
    state.pendingMove != null -> stringResource(R.string.hint_confirm_move)
    else -> stringResource(R.string.hint_preview_move)
}

private const val AI_THINK_DELAY_MS = 500L
