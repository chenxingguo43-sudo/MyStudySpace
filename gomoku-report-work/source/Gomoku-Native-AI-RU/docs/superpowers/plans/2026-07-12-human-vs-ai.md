# Human vs AI Gomoku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable local human-vs-AI mode with a standard heuristic opponent, AI thinking feedback, color choice, and full-round undo while preserving local two-player play.

**Architecture:** Keep core game operations pure in `GomokuGame`, implement heuristic evaluation in isolated pure Kotlin files, and let `GameScreen` coordinate Compose state plus a cancellable 500 ms AI delay. Navigation and color selection remain in the root composable.

**Tech Stack:** Kotlin 2.2, Jetpack Compose Material 3, Kotlin coroutines through Compose `LaunchedEffect`, JUnit 4.

## Global Constraints

- No WebView, JavaScript, network service, or machine-learning dependency.
- AI first move is the center when AI plays black.
- Human-vs-AI undo returns control to the human by undoing one round.
- Board input is disabled while AI is thinking.
- Existing two-tap confirmation, sound, haptics, visuals, and two-player mode remain available.

---

### Task 1: Add game-mode state and round-aware game operations

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/GameModels.kt`
- Modify: `app/src/main/java/com/example/gomoku/GomokuGame.kt`
- Modify: `app/src/test/java/com/example/gomoku/GomokuGameTest.kt`

**Interfaces:**
- Produces: `enum class GameMode`, `GomokuGame.newGame(...)`, `GomokuGame.undoForMode(...)`, `isHumanTurn(state)`.

- [ ] Write failing tests for human-vs-AI initialization, center opening, full-round undo, and pending-AI undo.
- [ ] Run `./gradlew testDebugUnitTest` and confirm the new tests fail for missing APIs.
- [ ] Add the minimal model fields and pure game operations.
- [ ] Re-run unit tests and confirm they pass.

### Task 2: Implement the standard heuristic AI

**Files:**
- Create: `app/src/main/java/com/example/gomoku/AiEvaluator.kt`
- Create: `app/src/main/java/com/example/gomoku/AiPlayer.kt`
- Create: `app/src/test/java/com/example/gomoku/AiPlayerTest.kt`

**Interfaces:**
- Produces: `AiPlayer.chooseMove(state: GomokuState): BoardPoint?`.

- [ ] Write failing tests for center choice, immediate win, immediate block, and offensive preference.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Implement bounded candidate generation and four-direction attack/defense scoring.
- [ ] Re-run all unit tests and confirm they pass.

### Task 3: Add mode selection and color selection to the home screen

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/MainActivity.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameComponents.kt`

**Interfaces:**
- Consumes: `GameMode`, `BLACK`, `WHITE`.
- Produces: `GameScreen(mode, humanPlayer, ...)` invocation and `ChooseColorDialog`.

- [ ] Replace the single start button with “双人对战” and “人机对战”.
- [ ] Show a color-selection dialog for human-vs-AI and launch the selected configuration.
- [ ] Preserve rules and sound controls.

### Task 4: Coordinate AI turns in the Compose game screen

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/GameScreen.kt`
- Modify: `app/src/main/java/com/example/gomoku/GomokuBoard.kt`

**Interfaces:**
- Consumes: `GomokuGame.newGame`, `GomokuGame.undoForMode`, `AiPlayer.chooseMove`.

- [ ] Initialize the board from mode and selected human color.
- [ ] Use a keyed `LaunchedEffect` to display thinking state, wait 500 ms, and commit exactly one AI move.
- [ ] Disable board taps during AI turns and prevent duplicate jobs.
- [ ] Cancel a pending AI move naturally when undo, restart, leave, or state identity changes.
- [ ] Keep existing move animation, haptics, sound, and result handling for both human and AI moves.

### Task 5: Add AI identity and mode-aware copy

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/GameComponents.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameScreen.kt`

**Interfaces:**
- Consumes: `aiPlayer`, `isAiThinking`.

- [ ] Add an `AI` badge to the computer's player card.
- [ ] Show “电脑思考中…” during the delay and human-specific turn copy otherwise.
- [ ] Make undo availability and hint text mode-aware.

### Task 6: Verify and package

**Files:**
- Modify: `README.md`

- [ ] Run `./gradlew testDebugUnitTest`.
- [ ] Run `./gradlew assembleDebug` when Android SDK and cached dependencies are available.
- [ ] Inspect source for forbidden WebView/JavaScript usage and stale imports.
- [ ] Update README with mode rules and AI explanation.
- [ ] Create a clean ZIP excluding `.gradle`, `build`, and machine-specific `local.properties`.
