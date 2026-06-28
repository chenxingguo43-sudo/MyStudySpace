# Immersion Study Space UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the learning workspace so AI analysis is readable in the center and note/Obsidian workflows are visible.

**Architecture:** Keep existing Pinia stores and Vue components, but change component composition. LeftPanel becomes sentence navigation plus compact import, CenterPanel becomes the current-sentence study surface, and RightPanel becomes notes/Obsidian management.

**Tech Stack:** Vue 3 Composition API, Pinia, Tailwind CSS v4, existing GlassCard/GlassButton components.

---

### Task 1: Sentence Navigation Left Panel

**Files:**
- Modify: `D:/MyStudySpace/immersion-study-space/src/components/layout/LeftPanel.vue`

- [ ] Replace course-first layout with compact import actions, loaded material summary, sentence search, scrollable sentence list, and recording history.
- [ ] On sentence click, set active sentence and seek to sentence start.
- [ ] Show badges for analyzed placeholder, note placeholder, sense-group count, and recording count.

### Task 2: Central Study Surface

**Files:**
- Modify: `D:/MyStudySpace/immersion-study-space/src/components/layout/CenterPanel.vue`
- Modify: `D:/MyStudySpace/immersion-study-space/src/components/transcript/CurrentSentenceDetail.vue`

- [ ] Always show waveform when audio exists, even before subtitles exist.
- [ ] Replace full transcript list in center with current sentence card, AIAnalysisPanel, and inline note editor.
- [ ] Keep onboarding only for missing audio/subtitle states.

### Task 3: Notes And Obsidian Right Panel

**Files:**
- Modify: `D:/MyStudySpace/immersion-study-space/src/components/layout/RightPanel.vue`

- [ ] Keep API status compact.
- [ ] Add Obsidian target section with `D:\MyStudySpace\俄语笔记库\沉浸精听\`.
- [ ] Add note history and cached AI history placeholders based on active sentence and transcript state.

### Task 4: Control Bar Follow-up

**Files:**
- Modify later: `D:/MyStudySpace/immersion-study-space/src/components/controls/FloatingControlBar.vue`

- [ ] Add `-5s` / `+5s`.
- [ ] Add repeat mode dropdown: no repeat, sentence infinite, 3 times, 5 times.
- [ ] Add A/B labels.

### Task 5: Verification

**Commands:**
- Run: `npm run build`
- Expected today: build may still fail on pre-existing unused-variable errors outside the touched files.
- Check that touched files do not introduce TypeScript errors.

