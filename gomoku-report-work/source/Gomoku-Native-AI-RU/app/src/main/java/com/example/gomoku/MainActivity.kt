package com.example.gomoku

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.rgb(7, 61, 55))
        )
        setContent {
            MaterialTheme {
                GomokuRoot()
            }
        }
    }
}

@Composable
private fun GomokuRoot() {
    var activeModeName by rememberSaveable { mutableStateOf<String?>(null) }
    var humanPlayer by rememberSaveable { mutableStateOf(BLACK) }
    var confirmBeforeMove by rememberSaveable { mutableStateOf(true) }
    var soundEnabled by rememberSaveable { mutableStateOf(true) }
    var vibrationEnabled by rememberSaveable { mutableStateOf(true) }
    var showRules by rememberSaveable { mutableStateOf(false) }
    var showColorChoice by rememberSaveable { mutableStateOf(false) }

    val activeMode = activeModeName?.let { GameMode.valueOf(it) }

    if (activeMode != null) {
        GameScreen(
            mode = activeMode,
            humanPlayer = humanPlayer,
            confirmBeforeMove = confirmBeforeMove,
            soundEnabled = soundEnabled,
            vibrationEnabled = vibrationEnabled,
            onConfirmBeforeMoveChange = { confirmBeforeMove = it },
            onSoundEnabledChange = { soundEnabled = it },
            onVibrationEnabledChange = { vibrationEnabled = it },
            onLeaveGame = { activeModeName = null }
        )
    } else {
        StartScreen(
            soundEnabled = soundEnabled,
            onSoundEnabledChange = { soundEnabled = it },
            onStartLocalGame = {
                humanPlayer = BLACK
                activeModeName = GameMode.LOCAL_TWO_PLAYER.name
            },
            onStartAiGame = { showColorChoice = true },
            onOpenRules = { showRules = true }
        )
    }

    if (showColorChoice) {
        ChooseColorDialog(
            onChooseBlack = {
                humanPlayer = BLACK
                activeModeName = GameMode.HUMAN_VS_AI.name
                showColorChoice = false
            },
            onChooseWhite = {
                humanPlayer = WHITE
                activeModeName = GameMode.HUMAN_VS_AI.name
                showColorChoice = false
            },
            onDismiss = { showColorChoice = false }
        )
    }

    if (showRules) {
        RulesDialog(onDismiss = { showRules = false })
    }
}

@Composable
private fun StartScreen(
    soundEnabled: Boolean,
    onSoundEnabledChange: (Boolean) -> Unit,
    onStartLocalGame: () -> Unit,
    onStartAiGame: () -> Unit,
    onOpenRules: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.game_scene),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.White.copy(alpha = 0.08f),
                            Color.Transparent,
                            DeepJade.copy(alpha = 0.22f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 28.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(74.dp))

            Text(
                text = stringResource(R.string.home_title),
                color = DeepJade,
                fontFamily = FontFamily.Serif,
                fontSize = 60.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = stringResource(R.string.home_subtitle),
                color = DeepJade.copy(alpha = 0.78f),
                fontFamily = FontFamily.Serif,
                fontSize = 17.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.weight(1f))

            HomeButton(
                text = stringResource(R.string.home_local_game),
                style = HomeButtonStyle.PRIMARY,
                onClick = onStartLocalGame
            )

            Spacer(modifier = Modifier.height(14.dp))

            HomeButton(
                text = stringResource(R.string.home_ai_game),
                style = HomeButtonStyle.AI,
                onClick = onStartAiGame
            )

            Spacer(modifier = Modifier.height(14.dp))

            HomeButton(
                text = stringResource(R.string.home_rules),
                style = HomeButtonStyle.SECONDARY,
                onClick = onOpenRules
            )

            Spacer(modifier = Modifier.height(30.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(if (soundEnabled) Jade else Color(0xFF45645F))
                        .clickable { onSoundEnabledChange(!soundEnabled) }
                        .padding(15.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (soundEnabled) "♪" else "×",
                        color = GoldLight,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.width(10.dp))

                Text(
                    text = stringResource(if (soundEnabled) R.string.sound_on else R.string.sound_off),
                    color = DeepJade,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(18.dp))
        }
    }
}

private enum class HomeButtonStyle {
    PRIMARY,
    AI,
    SECONDARY
}

@Composable
private fun HomeButton(
    text: String,
    style: HomeButtonStyle,
    onClick: () -> Unit
) {
    val background = when (style) {
        HomeButtonStyle.PRIMARY -> Brush.verticalGradient(
            listOf(Color(0xFF218B75), Color(0xFF0F6658))
        )
        HomeButtonStyle.AI -> Brush.verticalGradient(
            listOf(Color(0xFFB88B37), Color(0xFF825B1F))
        )
        HomeButtonStyle.SECONDARY -> Brush.verticalGradient(
            listOf(Color(0xFFFFF8E7), Color(0xFFEAD9B7))
        )
    }
    val textColor = if (style == HomeButtonStyle.SECONDARY) {
        Color(0xFF5D4B32)
    } else {
        GoldLight
    }

    Box(
        modifier = Modifier
            .fillMaxWidth(0.84f)
            .height(58.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(background)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = textColor,
            fontFamily = FontFamily.Serif,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            textAlign = TextAlign.Center
        )
    }
}
