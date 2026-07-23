package com.example.gomoku

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

internal val DeepJade = Color(0xFF073D37)
internal val Jade = Color(0xFF0F6658)
internal val Gold = Color(0xFFD7B35A)
internal val GoldLight = Color(0xFFFFF2BD)
private val Paper = Color(0xFFFFF8E7)
private val PaperDark = Color(0xFFEAD9B7)
private val BlackSide = Color(0xFF155B9A)
private val WhiteSide = Color(0xFFCF3429)
private val Danger = Color(0xFFB84435)
private val BlueAction = Color(0xFF2E79AD)
private val PurpleAction = Color(0xFF7A429B)
private val GreenAction = Color(0xFF197864)
private val NeutralAction = Color(0xFF727A77)

@Composable
fun PlayerHeader(
    currentPlayer: Int,
    winner: Int?,
    aiPlayer: Int? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        PlayerCard(
            modifier = Modifier.weight(1f),
            player = BLACK,
            name = stringResource(R.string.player_black),
            avatarRes = R.drawable.avatar_black,
            active = winner == BLACK || (winner == null && currentPlayer == BLACK),
            isAi = aiPlayer == BLACK,
            backgroundColors = listOf(Color(0xFF2091D2), BlackSide, Color(0xFF123F73)),
            avatarOnLeft = true
        )

        Text(
            text = "VS",
            color = Color(0xFFFFE7A5),
            fontSize = 24.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(44.dp)
        )

        PlayerCard(
            modifier = Modifier.weight(1f),
            player = WHITE,
            name = stringResource(R.string.player_white),
            avatarRes = R.drawable.avatar_white,
            active = winner == WHITE || (winner == null && currentPlayer == WHITE),
            isAi = aiPlayer == WHITE,
            backgroundColors = listOf(Color(0xFF8F1A19), Color(0xFFDF402F), Color(0xFFB52321)),
            avatarOnLeft = false
        )
    }
}

@Composable
private fun PlayerCard(
    player: Int,
    name: String,
    avatarRes: Int,
    active: Boolean,
    isAi: Boolean,
    backgroundColors: List<Color>,
    avatarOnLeft: Boolean,
    modifier: Modifier = Modifier
) {
    val transition = rememberInfiniteTransition(label = "current-player-glow")
    val glow by transition.animateFloat(
        initialValue = 0.36f,
        targetValue = 0.92f,
        animationSpec = infiniteRepeatable(
            animation = tween(850),
            repeatMode = RepeatMode.Reverse
        ),
        label = "current-player-glow-alpha"
    )
    val shape = RoundedCornerShape(30.dp)

    Row(
        modifier = modifier
            .height(66.dp)
            .shadow(8.dp, shape)
            .clip(shape)
            .background(Brush.horizontalGradient(backgroundColors))
            .border(
                width = if (active) 3.dp else 2.dp,
                color = if (active) Gold.copy(alpha = glow) else Gold.copy(alpha = 0.72f),
                shape = shape
            )
            .padding(horizontal = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        if (avatarOnLeft) {
            Avatar(avatarRes)
            PlayerIdentity(name, isAi)
            TurnStone(player, active, glow)
        } else {
            TurnStone(player, active, glow)
            PlayerIdentity(name, isAi)
            Avatar(avatarRes)
        }
    }
}

@Composable
private fun PlayerIdentity(name: String, isAi: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = name,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1
        )
        if (isAi) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(5.dp))
                    .background(Color(0xFFFFE7A5).copy(alpha = 0.96f))
                    .padding(horizontal = 5.dp, vertical = 1.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "AI",
                    color = DeepJade,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
    }
}

@Composable
private fun Avatar(avatarRes: Int) {
    Image(
        painter = painterResource(avatarRes),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .border(3.dp, Gold, CircleShape)
            .padding(2.dp)
            .clip(CircleShape)
    )
}

@Composable
private fun TurnStone(player: Int, active: Boolean, glow: Float) {
    Canvas(modifier = Modifier.size(28.dp)) {
        if (active) {
            drawCircle(
                color = Color(0xFFFFE156).copy(alpha = glow * 0.58f),
                radius = size.minDimension * 0.50f
            )
        }
        val stoneCenter = center
        val radius = size.minDimension * 0.36f
        val colors = if (player == BLACK) {
            listOf(Color(0xFF8B8B8B), Color(0xFF171717), Color.Black)
        } else {
            listOf(Color.White, Color(0xFFF0E8DD), Color(0xFFBEAD99))
        }
        drawCircle(
            brush = Brush.radialGradient(
                colors = colors,
                center = stoneCenter - androidx.compose.ui.geometry.Offset(radius * 0.30f, radius * 0.35f),
                radius = radius * 1.4f
            ),
            radius = radius,
            center = stoneCenter
        )
    }
}

@Composable
fun BottomActionBar(
    canUndo: Boolean,
    onLeave: () -> Unit,
    onUndo: () -> Unit,
    onRestart: () -> Unit,
    onSettings: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        GameActionButton(stringResource(R.string.action_leave), Danger, onLeave, Modifier.weight(1f))
        GameActionButton(
            stringResource(R.string.action_undo),
            BlueAction,
            onUndo,
            Modifier.weight(1f),
            enabled = canUndo
        )
        GameActionButton(stringResource(R.string.action_restart), PurpleAction, onRestart, Modifier.weight(1f))
        GameActionButton(stringResource(R.string.action_settings), GreenAction, onSettings, Modifier.weight(1f))
    }
}

@Composable
private fun GameActionButton(
    text: String,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val shape = RoundedCornerShape(15.dp)
    Box(
        modifier = modifier
            .height(56.dp)
            .shadow(5.dp, shape)
            .clip(shape)
            .background(
                Brush.verticalGradient(
                    listOf(
                        if (enabled) color.copy(alpha = 1f) else color.copy(alpha = 0.45f),
                        if (enabled) color.copy(alpha = 0.72f) else color.copy(alpha = 0.30f)
                    )
                )
            )
            .border(1.dp, Gold.copy(alpha = if (enabled) 0.45f else 0.20f), shape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = Color(0xFFFFF8EA).copy(alpha = if (enabled) 1f else 0.55f),
            fontFamily = FontFamily.Serif,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 3.dp)
        )
    }
}

@Composable
fun SettingsDialog(
    confirmBeforeMove: Boolean,
    soundEnabled: Boolean,
    vibrationEnabled: Boolean,
    onConfirmBeforeMoveChange: (Boolean) -> Unit,
    onSoundEnabledChange: (Boolean) -> Unit,
    onVibrationEnabledChange: (Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    JadeDialog(onDismiss = onDismiss) {
        DialogTitle(stringResource(R.string.settings_title))
        Spacer(modifier = Modifier.height(18.dp))
        SettingRow(
            title = stringResource(R.string.setting_confirm_title),
            subtitle = stringResource(R.string.setting_confirm_subtitle),
            checked = confirmBeforeMove,
            onCheckedChange = onConfirmBeforeMoveChange
        )
        Spacer(modifier = Modifier.height(12.dp))
        SettingRow(
            title = stringResource(R.string.setting_sound_title),
            subtitle = stringResource(R.string.setting_sound_subtitle),
            checked = soundEnabled,
            onCheckedChange = onSoundEnabledChange
        )
        Spacer(modifier = Modifier.height(12.dp))
        SettingRow(
            title = stringResource(R.string.setting_vibration_title),
            subtitle = stringResource(R.string.setting_vibration_subtitle),
            checked = vibrationEnabled,
            onCheckedChange = onVibrationEnabledChange
        )
        Spacer(modifier = Modifier.height(22.dp))
        DialogButton(
            text = stringResource(R.string.close),
            color = Jade,
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth(0.72f)
        )
    }
}

@Composable
private fun SettingRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = DeepJade, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                color = DeepJade.copy(alpha = 0.65f),
                fontSize = 11.sp,
                lineHeight = 15.sp
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = GoldLight,
                checkedTrackColor = Jade
            )
        )
    }
}

@Composable
fun ChooseColorDialog(
    onChooseBlack: () -> Unit,
    onChooseWhite: () -> Unit,
    onDismiss: () -> Unit
) {
    JadeDialog(onDismiss = onDismiss) {
        DialogTitle(stringResource(R.string.choose_color_title))
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = stringResource(R.string.choose_color_message),
            color = DeepJade.copy(alpha = 0.76f),
            textAlign = TextAlign.Center,
            fontSize = 14.sp,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(20.dp))
        DialogButton(
            text = stringResource(R.string.play_black),
            color = DeepJade,
            onClick = onChooseBlack
        )
        Spacer(modifier = Modifier.height(10.dp))
        DialogButton(
            text = stringResource(R.string.play_white),
            color = Danger,
            onClick = onChooseWhite
        )
        Spacer(modifier = Modifier.height(10.dp))
        DialogButton(
            text = stringResource(R.string.cancel),
            color = NeutralAction,
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth(0.72f)
        )
    }
}

@Composable
fun ConfirmActionDialog(
    title: String,
    message: String,
    dismissText: String,
    confirmText: String,
    confirmColor: Color,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    JadeDialog(onDismiss = onDismiss) {
        DialogTitle(title)
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = message,
            color = DeepJade.copy(alpha = 0.82f),
            textAlign = TextAlign.Center,
            fontSize = 15.sp,
            lineHeight = 21.sp
        )
        Spacer(modifier = Modifier.height(22.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            DialogButton(
                text = dismissText,
                color = NeutralAction,
                onClick = onDismiss,
                modifier = Modifier.weight(1f)
            )
            DialogButton(
                text = confirmText,
                color = confirmColor,
                onClick = onConfirm,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun ResultDialog(
    winner: Int?,
    isDraw: Boolean,
    onRestart: () -> Unit,
    onViewBoard: () -> Unit,
    onLeave: () -> Unit
) {
    val title = when {
        isDraw -> stringResource(R.string.result_draw)
        winner == BLACK -> stringResource(R.string.result_black_wins)
        winner == WHITE -> stringResource(R.string.result_white_wins)
        else -> stringResource(R.string.result_game_over)
    }
    val subtitle = stringResource(
        if (isDraw) R.string.result_draw_subtitle else R.string.result_win_subtitle
    )

    JadeDialog(onDismiss = onViewBoard) {
        Text(
            text = stringResource(R.string.result_heading),
            color = Color(0xFFB43B31),
            fontFamily = FontFamily.Serif,
            fontSize = 38.sp,
            fontWeight = FontWeight.Black
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = title,
            color = Jade,
            fontSize = 25.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = subtitle,
            color = DeepJade.copy(alpha = 0.72f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(22.dp))
        DialogButton(
            text = stringResource(R.string.play_again),
            color = Jade,
            onClick = onRestart,
            modifier = Modifier.fillMaxWidth(0.84f),
            minHeight = 54.dp,
            fontSize = 16.sp
        )
        Spacer(modifier = Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            DialogButton(
                text = stringResource(R.string.view_board),
                color = BlueAction,
                onClick = onViewBoard,
                modifier = Modifier.weight(1f),
                minHeight = 60.dp,
                fontSize = 13.sp
            )
            DialogButton(
                text = stringResource(R.string.go_home),
                color = Danger,
                onClick = onLeave,
                modifier = Modifier.weight(1f),
                minHeight = 60.dp,
                fontSize = 13.sp
            )
        }
    }
}

@Composable
fun RulesDialog(onDismiss: () -> Unit) {
    JadeDialog(onDismiss = onDismiss) {
        DialogTitle(stringResource(R.string.rules_title))
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = stringResource(R.string.rules_text),
            color = DeepJade.copy(alpha = 0.84f),
            fontSize = 14.sp,
            lineHeight = 21.sp
        )
        Spacer(modifier = Modifier.height(20.dp))
        DialogButton(
            text = stringResource(R.string.understood),
            color = Jade,
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth(0.72f)
        )
    }
}

@Composable
private fun DialogTitle(text: String) {
    Text(
        text = text,
        color = Jade,
        fontFamily = FontFamily.Serif,
        fontSize = 25.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center
    )
}

@Composable
private fun JadeDialog(
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 390.dp)
                .shadow(20.dp, RoundedCornerShape(28.dp))
                .clip(RoundedCornerShape(28.dp))
                .background(Brush.verticalGradient(listOf(Paper, PaperDark)))
                .border(2.dp, Gold, RoundedCornerShape(28.dp))
                .padding(horizontal = 22.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            content = content
        )
    }
}

@Composable
private fun DialogButton(
    text: String,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier.fillMaxWidth(),
    minHeight: Dp = 50.dp,
    fontSize: TextUnit = 15.sp
) {
    val shape = RoundedCornerShape(18.dp)
    Box(
        modifier = modifier
            .heightIn(min = minHeight)
            .shadow(5.dp, shape)
            .clip(shape)
            .background(color)
            .border(1.dp, Gold.copy(alpha = 0.55f), shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = Color.White,
            fontSize = fontSize,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            lineHeight = 18.sp,
            maxLines = 2
        )
    }
}
