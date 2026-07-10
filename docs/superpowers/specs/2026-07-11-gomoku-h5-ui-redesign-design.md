# Gomoku H5 UI Redesign Design

Date: 2026-07-11

## Goal

Build a new isolated high-fidelity mobile Gomoku H5 module inside `D:\MyStudySpace\gomoku-h5\`, using the supplied visual assets as the art direction for a portrait-first Chinese landscape themed game.

This work must not modify the existing study-space pages (`index.html`, `pomodoro.html`, `study-stats.html`, and the Russian knowledge-base HTML page) in the first phase.

## Scope

Phase 1 creates the standalone game shell and core visual upgrade:

- A portrait mobile H5 entry at `D:\MyStudySpace\gomoku-h5\index.html`.
- Source assets kept under `D:\MyStudySpace\gomoku-h5\assets\source\`.
- Derived web assets kept under `D:\MyStudySpace\gomoku-h5\assets\processed\`.
- Home screen using the light mountain and lotus background.
- Gameplay screen using the dark teal landscape board background.
- Player header with black and white player plates, avatars, current-turn state, and VS center.
- 15x15 interactive Gomoku board aligned over the board art.
- Bottom action bar for leave, undo, replay, and settings.
- Basic dialogs for settings, leave confirmation, and win result.

Out of scope for Phase 1:

- Integrating Gomoku into the study-space dispatch center.
- AI opponent implementation.
- Online multiplayer.
- Persistent match history.
- Replacing the existing legacy `code_artifact.html` copy in the Windows Downloads folder.

## Asset Strategy

The supplied JPG files are treated as source references and are copied unchanged into `assets\source\`.

Because several assets include baked checkerboard backgrounds, the implementation should prefer one of two tactics per asset:

- Use whole-background assets directly when the checkerboard is not present or not visible in the intended composition.
- Generate cropped or transparent processed assets only where the checkerboard would be visible in UI, such as buttons, dialog frames, player plates, and victory art.

Processed assets should be deterministic and inspectable. If automatic background removal produces visible artifacts, the first fallback is CSS recreation using the source image as a visual reference; the second fallback is asking for transparent PNG originals.

## Architecture

The module is intentionally isolated:

```text
D:\MyStudySpace\gomoku-h5\
  index.html
  assets\
    source\
    processed\
  tools\
```

`index.html` remains a single-file app for now, matching the user's current H5 delivery style. The JavaScript should still be structured into clear internal sections:

- Constants and asset manifest.
- Pure game helpers: board creation, move validation, winner detection.
- State object: current screen, board matrix, current player, move history, winner, settings.
- Render helpers: screen switching, board rendering, piece rendering, dialogs.
- Event binding: one-time setup with event delegation for board and controls.

This keeps Phase 1 compatible with the user's single-file workflow while preserving a later migration path to Vue, React, or Web Components.

## UI Design

The app is portrait-first and should use a phone-like full-viewport layout.

Home screen:

- Uses the light landscape background as a full-screen image.
- Places the game title and primary actions in the center/lower half.
- Keeps bottom music, sound, and settings controls visually light.

Gameplay screen:

- Uses the dark landscape board background as the main full-screen background.
- Places the player status bar at the top, with black player on the left and white player on the right.
- Keeps the board visually dominant in the center.
- Places action buttons at the bottom with stable touch targets.

Dialogs:

- Use the parchment/teal/gold dialog frame as the visual language.
- Settings supports placement mode, game sound, and confirmation.
- Leave confirmation warns that current progress is not saved.
- Win dialog shows the victory art and winner text.

## Board Interaction

The gameplay board uses a single event listener on the board layer. Pointer coordinates are converted into row/column coordinates based on the rendered board rectangle.

This avoids 225 separate listeners and makes the board suitable for both DOM piece rendering and a future canvas renderer.

Pieces can remain DOM elements in Phase 1 because 225 maximum pieces is small. The important constraint is that piece placement uses transform-positioned elements over a stable board coordinate system, avoiding layout recalculation from grid cell insertion.

## Responsive Rules

- Use `100dvh` with `min-height` fallbacks for mobile browser chrome.
- Respect safe areas with `env(safe-area-inset-*)`.
- Keep primary controls at least 44 CSS pixels high.
- Support narrow phone widths first, then center the experience with a max width on wider screens.
- On landscape orientation, keep the game usable by scaling the stage rather than reflowing into a desktop layout.

## Future Extension Points

AI opponent:

- The board state remains a simple 15x15 matrix with numeric values: `0` empty, `1` black, `2` white.
- `getAvailableMoves`, `applyMove`, `undoMove`, and `checkWinner` stay pure or near-pure so Minimax with Alpha-Beta pruning can call them without DOM dependencies.

Audio:

- Add an audio facade with methods such as `playMove`, `playWin`, `playUndo`, and `setEnabled`.
- Inject calls at move commit, undo, reset, button tap, dialog open, and game-over transitions.
- Tone.js or Web Audio API can be added behind the facade later without changing game logic.

## Testing And Verification

Phase 1 verification:

- Run static HTML parsing checks where practical.
- Add or reuse a lightweight Node test for game rules if logic is extracted into a testable script.
- Verify in browser at mobile viewport sizes.
- Check that the board aligns with taps by placing test pieces in corners, center, and star points.
- Check that no UI text overlaps on narrow phones.
- Check that win, undo, reset, leave, and settings flows remain reachable by touch.

## Risks

- JPG assets with baked checkerboard backgrounds may need manual cleanup or replacement with transparent PNGs.
- The dark board background already contains grid art, so coordinate alignment must be measured rather than guessed.
- A single-file app can grow quickly; Phase 1 should keep internal boundaries explicit even before introducing modules.

## Acceptance Criteria

- `D:\MyStudySpace\gomoku-h5\index.html` opens as a standalone H5 Gomoku app.
- The first visible screen matches the supplied Chinese landscape home art direction.
- The gameplay screen uses the supplied board background, player plates, avatars, bottom controls, and victory/dialog visual style.
- Existing study-space files are unchanged.
- Core two-player Gomoku interactions still work: place, turn switch, undo, reset, win detection.
- The design remains ready for later AI and audio work without rewriting game rules.
