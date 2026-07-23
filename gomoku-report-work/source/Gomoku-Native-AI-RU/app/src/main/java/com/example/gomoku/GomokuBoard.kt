package com.example.gomoku

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import kotlin.math.min
import kotlin.math.roundToInt

private data class BoardGeometry(
    val gridStart: Float,
    val gridLength: Float,
    val cellSize: Float
) {
    fun point(row: Int, col: Int): Offset = Offset(
        x = gridStart + col * cellSize,
        y = gridStart + row * cellSize
    )
}

@Composable
fun GomokuBoard(
    state: GomokuState,
    animatedMove: BoardPoint?,
    animatedMoveScale: Float,
    winningProgress: Float,
    inputEnabled: Boolean = true,
    onCellTap: (row: Int, col: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Canvas(
        modifier = modifier
            .aspectRatio(1f)
            .pointerInput(state.gameOver, inputEnabled, onCellTap) {
                detectTapGestures { tap ->
                    if (state.gameOver || !inputEnabled) return@detectTapGestures
                    val geometry = boardGeometry(size.width.toFloat(), size.height.toFloat())
                    val point = nearestBoardPoint(tap, geometry) ?: return@detectTapGestures
                    onCellTap(point.row, point.col)
                }
            }
    ) {
        val geometry = boardGeometry(size.width, size.height)
        drawBoardFrame(geometry)
        drawGrid(geometry)
        drawWinningLine(state, geometry, winningProgress)
        drawStones(state, geometry, animatedMove, animatedMoveScale)
        drawPendingStone(state, geometry)
    }
}

private fun boardGeometry(width: Float, height: Float): BoardGeometry {
    val side = min(width, height)
    val gridStart = side * 0.105f
    val gridLength = side * 0.79f
    return BoardGeometry(
        gridStart = gridStart,
        gridLength = gridLength,
        cellSize = gridLength / (BOARD_SIZE - 1)
    )
}

private fun nearestBoardPoint(
    tap: Offset,
    geometry: BoardGeometry
): BoardPoint? {
    val col = ((tap.x - geometry.gridStart) / geometry.cellSize).roundToInt()
    val row = ((tap.y - geometry.gridStart) / geometry.cellSize).roundToInt()
    if (!isInsideBoard(row, col)) return null

    val point = geometry.point(row, col)
    val tolerance = geometry.cellSize * 0.55f
    return if (
        kotlin.math.abs(tap.x - point.x) <= tolerance &&
        kotlin.math.abs(tap.y - point.y) <= tolerance
    ) {
        BoardPoint(row, col)
    } else {
        null
    }
}

private fun DrawScope.drawBoardFrame(geometry: BoardGeometry) {
    val side = size.minDimension
    val outerInset = side * 0.018f
    val innerInset = side * 0.067f

    drawRoundRect(
        brush = Brush.verticalGradient(
            listOf(Color(0xFF17675F), Color(0xFF073E3A))
        ),
        topLeft = Offset(outerInset, outerInset),
        size = Size(side - outerInset * 2f, side - outerInset * 2f),
        cornerRadius = CornerRadius(side * 0.055f)
    )

    drawRoundRect(
        color = Color.Black.copy(alpha = 0.30f),
        topLeft = Offset(outerInset, outerInset + side * 0.012f),
        size = Size(side - outerInset * 2f, side - outerInset * 2f),
        cornerRadius = CornerRadius(side * 0.055f),
        style = Stroke(width = side * 0.018f)
    )

    drawRoundRect(
        color = Color(0xFFD8B85E),
        topLeft = Offset(innerInset, innerInset),
        size = Size(side - innerInset * 2f, side - innerInset * 2f),
        cornerRadius = CornerRadius(side * 0.032f),
        style = Stroke(width = side * 0.008f)
    )

    drawRoundRect(
        brush = Brush.verticalGradient(
            listOf(Color(0xFF3F746E), Color(0xFF285A55))
        ),
        topLeft = Offset(side * 0.083f, side * 0.083f),
        size = Size(side * 0.834f, side * 0.834f),
        cornerRadius = CornerRadius(side * 0.018f)
    )

    drawRoundRect(
        color = Color(0xFFBFE2D4).copy(alpha = 0.35f),
        topLeft = Offset(side * 0.086f, side * 0.086f),
        size = Size(side * 0.828f, side * 0.828f),
        cornerRadius = CornerRadius(side * 0.016f),
        style = Stroke(width = side * 0.004f)
    )

    drawCornerOrnaments(side)
}

private fun DrawScope.drawCornerOrnaments(side: Float) {
    val color = Color(0xFFE0C477)
    val stroke = side * 0.008f
    val inset = side * 0.043f
    val arm = side * 0.075f

    listOf(
        Pair(Offset(inset, inset), 1f to 1f),
        Pair(Offset(side - inset, inset), -1f to 1f),
        Pair(Offset(inset, side - inset), 1f to -1f),
        Pair(Offset(side - inset, side - inset), -1f to -1f)
    ).forEach { (origin, direction) ->
        val path = Path().apply {
            moveTo(origin.x, origin.y + direction.second * arm)
            quadraticTo(
                origin.x,
                origin.y,
                origin.x + direction.first * arm,
                origin.y
            )
        }
        drawPath(path, color = color, style = Stroke(width = stroke, cap = StrokeCap.Round))
        drawCircle(color = color, radius = stroke * 0.65f, center = origin)
    }
}

private fun DrawScope.drawGrid(geometry: BoardGeometry) {
    val gridColor = Color(0xFFCCE8DC).copy(alpha = 0.54f)
    val end = geometry.gridStart + geometry.gridLength

    repeat(BOARD_SIZE) { index ->
        val position = geometry.gridStart + index * geometry.cellSize
        drawLine(
            color = gridColor,
            start = Offset(geometry.gridStart, position),
            end = Offset(end, position),
            strokeWidth = size.minDimension * 0.0022f
        )
        drawLine(
            color = gridColor,
            start = Offset(position, geometry.gridStart),
            end = Offset(position, end),
            strokeWidth = size.minDimension * 0.0022f
        )
    }

    listOf(3, 7, 11).forEach { row ->
        listOf(3, 7, 11).forEach { col ->
            drawCircle(
                color = Color(0xFFE0C477),
                radius = geometry.cellSize * 0.105f,
                center = geometry.point(row, col)
            )
        }
    }
}

private fun DrawScope.drawStones(
    state: GomokuState,
    geometry: BoardGeometry,
    animatedMove: BoardPoint?,
    animatedMoveScale: Float
) {
    val winningSet = state.winningCells.toSet()
    state.board.forEachIndexed { row, cells ->
        cells.forEachIndexed { col, player ->
            if (player != EMPTY) {
                val point = BoardPoint(row, col)
                val scale = if (point == animatedMove) animatedMoveScale else 1f
                drawStone(
                    center = geometry.point(row, col),
                    player = player,
                    radius = geometry.cellSize * 0.43f * scale,
                    alpha = 1f,
                    isLast = state.lastMove?.let { it.row == row && it.col == col } == true,
                    isWinning = point in winningSet
                )
            }
        }
    }
}

private fun DrawScope.drawPendingStone(
    state: GomokuState,
    geometry: BoardGeometry
) {
    val pending = state.pendingMove ?: return
    val center = geometry.point(pending.row, pending.col)
    val radius = geometry.cellSize * 0.43f

    drawStone(
        center = center,
        player = state.currentPlayer,
        radius = radius,
        alpha = 0.56f,
        isLast = false,
        isWinning = false
    )

    drawCircle(
        color = Color(0xFFFFED9B).copy(alpha = 0.94f),
        radius = radius * 1.27f,
        center = center,
        style = Stroke(
            width = geometry.cellSize * 0.07f,
            pathEffect = PathEffect.dashPathEffect(
                floatArrayOf(geometry.cellSize * 0.22f, geometry.cellSize * 0.14f)
            )
        )
    )
}

private fun DrawScope.drawStone(
    center: Offset,
    player: Int,
    radius: Float,
    alpha: Float,
    isLast: Boolean,
    isWinning: Boolean
) {
    drawCircle(
        color = Color.Black.copy(alpha = 0.34f * alpha),
        radius = radius * 1.03f,
        center = center + Offset(0f, radius * 0.20f)
    )

    val colors = if (player == BLACK) {
        listOf(Color(0xFF9A9A9A), Color(0xFF171717), Color.Black)
    } else {
        listOf(Color.White, Color(0xFFF1E9DE), Color(0xFFBBA993))
    }

    drawCircle(
        brush = Brush.radialGradient(
            colors = colors,
            center = center - Offset(radius * 0.30f, radius * 0.35f),
            radius = radius * 1.35f
        ),
        radius = radius,
        center = center,
        alpha = alpha
    )

    drawCircle(
        color = Color.White.copy(alpha = 0.20f * alpha),
        radius = radius * 0.19f,
        center = center - Offset(radius * 0.29f, radius * 0.34f)
    )

    if (isWinning) {
        drawCircle(
            color = Color(0xFFFFDA5B),
            radius = radius * 1.18f,
            center = center,
            style = Stroke(width = radius * 0.18f)
        )
    }

    if (isLast) {
        drawCircle(
            color = Color(0xFFE2463A),
            radius = radius * 0.23f,
            center = center
        )
        drawCircle(
            color = Color(0xFFFFF5CE).copy(alpha = 0.86f),
            radius = radius * 0.25f,
            center = center,
            style = Stroke(width = radius * 0.08f)
        )
    }
}

private fun DrawScope.drawWinningLine(
    state: GomokuState,
    geometry: BoardGeometry,
    progress: Float
) {
    if (state.winningCells.size < 5 || progress <= 0f) return

    val start = geometry.point(
        state.winningCells.first().row,
        state.winningCells.first().col
    )
    val target = geometry.point(
        state.winningCells.last().row,
        state.winningCells.last().col
    )
    val end = Offset(
        x = start.x + (target.x - start.x) * progress,
        y = start.y + (target.y - start.y) * progress
    )

    drawLine(
        color = Color(0xFFFFDA5B).copy(alpha = 0.38f),
        start = start,
        end = end,
        strokeWidth = geometry.cellSize * 0.34f,
        cap = StrokeCap.Round
    )
    drawLine(
        color = Color(0xFFFFE99B),
        start = start,
        end = end,
        strokeWidth = geometry.cellSize * 0.11f,
        cap = StrokeCap.Round
    )
}
