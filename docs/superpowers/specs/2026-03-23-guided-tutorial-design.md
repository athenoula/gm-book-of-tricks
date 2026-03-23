# Guided Tutorial — Design Spec

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

A guided, chaptered tutorial that walks new GMs through the full workflow of the app — from navigation to running a session. Uses tooltip popovers that highlight UI elements one at a time with "Back" and "Next" buttons.

**Key decisions:**
- Auto-triggers on first visit, skippable, re-accessible anytime
- Watch-only (highlights and explains, user doesn't create anything during the tour)
- 4 named chapters users can replay individually
- Accessible via sidebar help icon + Command Palette ("tour"/"tutorial")
- Custom-built (no third-party tour library) using Zustand + motion/react

---

## Architecture

### Tutorial Store (`src/lib/tutorial.ts`)

Zustand store managing tutorial state:

```ts
interface TutorialState {
  isActive: boolean
  currentChapter: number        // 0–3
  currentStep: number           // index within chapter
  completedChapters: Set<number>
  hasSeenTutorial: boolean      // persisted to localStorage

  start: (chapter?: number) => void
  next: () => void
  back: () => void
  skipChapter: () => void
  dismiss: () => void
}
```

- `hasSeenTutorial` persisted to `localStorage` — no Supabase migration needed
- `completedChapters` also persisted to `localStorage` for chapter picker checkmarks
- `start(chapter?)` — starts from a specific chapter or chapter 0

### Step Definitions (`src/features/tutorial/steps.ts`)

Each chapter is an array of step objects:

```ts
interface TutorialStep {
  target: string       // CSS selector for element to highlight
  title: string        // heading text (rendered in Cinzel)
  content: string      // explanation (rendered in Crimson Pro)
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string       // navigate here before showing this step
}

interface TutorialChapter {
  name: string         // "Navigation", "Campaign Setup", etc.
  steps: TutorialStep[]
}
```

---

## Components

### `TutorialOverlay` (`src/features/tutorial/TutorialOverlay.tsx`)

Renders when `isActive` is true. Three layers:

1. **Backdrop** — Full-screen fixed overlay, semi-transparent dark
2. **Spotlight** — Positioned element matching target's bounding rect with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` to create the cutout. Gold border + subtle glow around the target.
3. **Tooltip** — Positioned relative to target element:
   - Chapter name + step counter ("Session Prep · Step 3 of 5")
   - Title (Cinzel heading)
   - Description (Crimson Pro body)
   - Back / Next buttons (existing Button component)
   - "Skip tour" link
   - Enter/exit transitions via `motion.div`

**Z-index:** `z-[65]` — above vignette/paper grain (59/60), below toasts (70).

### `TutorialProvider` (`src/features/tutorial/TutorialProvider.tsx`)

Wraps the app in `App.tsx`. Responsibilities:

- **Auto-trigger** — On mount, checks `localStorage` for `hasSeenTutorial`. If false and user is authenticated, starts the tutorial.
- **Route navigation** — When a step has a `route` property, navigates programmatically then waits one `requestAnimationFrame` for DOM to settle before positioning.
- **Keyboard support** — Right arrow / Enter for next, Left arrow for back, Escape to dismiss.
- **Renders** `TutorialOverlay` when active.

### `ChapterPicker` (`src/features/tutorial/ChapterPicker.tsx`)

Small popover/modal listing the 4 chapters with completion checkmarks. Shown when user clicks the sidebar help icon or selects "Take the Tour" from Command Palette.

### Sidebar Addition

A `?` (or book) icon added to the bottom section of `Sidebar.tsx`, above "All Campaigns." Opens the `ChapterPicker`.

### Command Palette Addition

Register a "Take the Tour" action in the command palette search results, matching on "tour" and "tutorial" queries.

---

## Chapter Content

### Chapter 1: Navigation (4 steps)

| # | Target | Title | Content | Placement |
|---|--------|-------|---------|-----------|
| 1 | Sidebar `<aside>` | The Sidebar | Your navigation hub. Each icon leads to a different section of your campaign. | right |
| 2 | — (fires Cmd+K) | Command Palette | Press Cmd+K to quickly search and jump to any entity — monsters, spells, NPCs, sessions. | bottom |
| 3 | — (fires Cmd+J) | Quick Reference | Press Cmd+J to look up any entity without leaving your current page. | bottom |
| 4 | "All Campaigns" link | All Campaigns | Click here to switch between campaigns or create a new one. | right |

### Chapter 2: Campaign Setup (4 steps)

| # | Target | Title | Content | Route | Placement |
|---|--------|-------|---------|-------|-----------|
| 1 | Campaign overview content area | Campaign Overview | Your campaign's home base. Sessions, plot threads, and party treasure all live here. | `/campaign/$campaignId` | top |
| 2 | Characters nav item | Characters | Manage your player characters and NPCs. Track stats, portraits, and backstories. | — | right |
| 3 | Bestiary nav item | Bestiary | Build your monster library. Create custom creatures or search the SRD for official stat blocks. | — | right |
| 4 | Locations nav item | Locations | Map out your world. Each location can be referenced in session timelines later. | — | right |

### Chapter 3: Session Prep (5 steps)

| # | Target | Title | Content | Route | Placement |
|---|--------|-------|---------|-------|-----------|
| 1 | Sessions list / page | Sessions | Each session gets its own timeline. Create one for your next game. | `/campaign/$campaignId/sessions` | top |
| 2 | Session timeline container | Session Timeline | Your main prep workspace. Build a sequence of scenes for your session. | `/campaign/$campaignId/session/$sessionId` | top |
| 3 | First scene block (or empty state) | Scene Blocks | Each block is a scene, encounter, or note. Drag to reorder, click to expand. | — | bottom |
| 4 | Content Drawer trigger | Content Drawer | Pull in monsters, NPCs, spells, and locations from your campaign library directly into scenes. | — | left |
| 5 | Session recap area | Session Recap | After the session, write a recap to track what happened. | — | bottom |

### Chapter 4: Running the Game (4 steps)

| # | Target | Title | Content | Route | Placement |
|---|--------|-------|---------|-------|-----------|
| 1 | Play mode toggle | Play Mode | Switch to Play mode when it's game time. Your prep becomes a read-through runner. | — | bottom |
| 2 | Initiative tracker panel | Initiative Tracker | Run combat encounters with turn order, HP tracking, and conditions. | — | left |
| 3 | Dice roller | Dice Roller | Roll any dice expression right here — no need to leave the app. | — | left |
| 4 | Scratchpad nav item | Inspiration Board | Capture ideas on the fly. Use the Web Clipper extension to save content from the web. | — | right |

---

## Positioning & Edge Cases

### Tooltip Positioning
- Use `getBoundingClientRect()` on the target element each step
- Offset tooltip ~12px from target in the specified direction
- If tooltip overflows viewport, flip to opposite side
- Recalculate on `resize` via `ResizeObserver`

### Spotlight Cutout
- Positioned element matching target's bounding rect
- `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` creates the darkened-everything-else effect
- Gold border (`border-primary-light`) + glow (`box-shadow`) on the spotlight element
- `border-radius` matches target element
- `pointer-events: none` on spotlight — tour is watch-only

### Missing Targets
- If a CSS selector doesn't match any element, skip the step and advance
- Console warning for debugging

### Route Transitions
- Provider navigates first when a step has a `route` property
- Waits one `requestAnimationFrame` for DOM to settle
- If user manually navigates away during the tour, dismiss gracefully

### Mobile
- Target `MobileNav` elements instead of sidebar
- Tooltip renders above/below only (never left/right) on narrow screens
- Skip sidebar-specific steps that don't exist on mobile

---

## File Structure

```
src/
├── features/
│   └── tutorial/
│       ├── TutorialOverlay.tsx    # Backdrop + spotlight + tooltip
│       ├── TutorialProvider.tsx   # Auto-trigger, routing, keyboard, renders overlay
│       ├── ChapterPicker.tsx      # Chapter selection popover
│       └── steps.ts              # Chapter and step definitions
├── lib/
│   └── tutorial.ts               # Zustand store
```

**Modified files:**
- `App.tsx` — Wrap with `TutorialProvider`
- `Sidebar.tsx` — Add help icon at bottom
- `CommandPalette.tsx` — Add "Take the Tour" action

---

## Visual Style

- Tooltip background: `bg-bg-base` with `border border-primary-light`
- Heading font: Cinzel (`font-heading`)
- Body font: Crimson Pro (`font-body`)
- Step counter: `text-primary-light` with `font-label` (Spectral SC)
- Next button: Primary styled (gold/amber)
- Back button: Ghost/muted styled
- Spotlight glow: `box-shadow: 0 0 20px rgba(212,165,116,0.3)`
- Transitions: `motion.div` fade + slide (duration-fast)
