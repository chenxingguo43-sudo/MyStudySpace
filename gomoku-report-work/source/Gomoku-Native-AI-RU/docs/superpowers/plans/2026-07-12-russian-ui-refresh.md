# Russian UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a fully Russian Gomoku UI with a clean home title, improved dialog/button layout, and independent vibration control.

**Architecture:** Move all visible copy into Android string resources, keep game and AI logic unchanged, and update Compose components to consume localized resources. Dialog geometry is adjusted for long Russian text without introducing new dependencies.

**Tech Stack:** Kotlin, Jetpack Compose Material 3, Android string resources, JUnit 4.

## Global Constraints

- No Chinese text may remain in user-visible production UI.
- Remove the red home-title badge.
- Preserve two-player, AI, undo, confirmation, sound, and game logic.
- Add independent vibration control.
- Keep Russian labels untruncated on typical phone widths.

---

### Task 1: Centralize Russian copy

**Files:**
- Modify: `app/src/main/res/values/strings.xml`
- Modify: `app/src/main/java/com/example/gomoku/MainActivity.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameComponents.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameScreen.kt`

- [ ] Add all approved Russian strings to `strings.xml`.
- [ ] Replace visible literals with `stringResource(...)`.
- [ ] Remove the red badge from the home title.
- [ ] Search production source for remaining CJK characters.

### Task 2: Refresh dialogs and long-label buttons

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/GameComponents.kt`

- [ ] Add consistent dialog width, padding, rounded corners, shadow, and borders.
- [ ] Stack color-choice buttons vertically.
- [ ] Create a visually dominant replay button and balanced secondary result actions.
- [ ] Reduce and constrain bottom-action text so Russian labels fit.

### Task 3: Add independent vibration setting

**Files:**
- Modify: `app/src/main/java/com/example/gomoku/MainActivity.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameScreen.kt`
- Modify: `app/src/main/java/com/example/gomoku/GameComponents.kt`

- [ ] Persist `vibrationEnabled` at root level.
- [ ] Show a vibration switch in settings.
- [ ] Gate haptic feedback independently from sound.

### Task 4: Version, verify, and package

**Files:**
- Modify: `app/build.gradle.kts`
- Modify: `README.md`

- [ ] Set `versionCode = 2` and `versionName = "1.1"`.
- [ ] Run all unit tests.
- [ ] Build the debug APK if the local Android toolchain permits.
- [ ] Package a clean ZIP without machine-specific files and build caches.
