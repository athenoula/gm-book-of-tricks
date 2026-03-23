# Guided Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chaptered, tooltip-based tutorial that walks GMs through the app's full workflow on first visit, with replay access via sidebar icon and Command Palette.

**Architecture:** Custom tutorial engine using Zustand for state, CSS box-shadow spotlight technique for element highlighting, and motion/react for tooltip transitions. Steps are defined as data (selector + content + placement), rendered by a single overlay component. No third-party tour library.

**Tech Stack:** React 19, Zustand, motion/react, Tailwind CSS 4, existing Button/GameIcon components.

**Spec:** `docs/superpowers/specs/2026-03-23-guided-tutorial-design.md`

---

## File Structure

```
src/
├── lib/
│   └── tutorial.ts                      # Zustand store (state + actions + localStorage persistence)
├── features/
│   └── tutorial/
│       ├── steps.ts                     # Chapter and step definitions (data only)
│       ├── TutorialOverlay.tsx          # Spotlight backdrop + positioned tooltip
│       ├── TutorialProvider.tsx         # Auto-trigger, route navigation, keyboard handling
│       └── ChapterPicker.tsx            # Chapter selection popover for replay
```

**Modified files:**
- `src/App.tsx` — Import and render `TutorialProvider`
- `src/components/layout/Sidebar.tsx` — Add help icon button at bottom
- `src/components/ui/CommandPalette.tsx` — Add "Take the Tour" action
- `src/components/ui/icons.ts` — Add help/book icon export

---

### Task 1: Tutorial Store

**Files:**
- Create: `app/src/lib/tutorial.ts`

- [ ] **Step 1: Create the Zustand store with types and localStorage persistence**

```ts
import { create } from 'zustand'

const STORAGE_KEY_SEEN = 'gm-bot-tutorial-seen'
const STORAGE_KEY_COMPLETED = 'gm-bot-tutorial-completed'

function loadSeen(): boolean {
  return localStorage.getItem(STORAGE_KEY_SEEN) === 'true'
}

function loadCompleted(): number[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLETED) || '[]')
  } catch {
    return []
  }
}

interface TutorialState {
  isActive: boolean
  currentChapter: number
  currentStep: number
  completedChapters: Set<number>
  hasSeenTutorial: boolean

  start: (chapter?: number) => void
  advanceStep: (chapterLength: number) => void
  back: () => void
  skipChapter: () => void
  dismiss: () => void
}

export const useTutorial = create<TutorialState>((set, get) => ({
  isActive: false,
  currentChapter: 0,
  currentStep: 0,
  completedChapters: new Set(loadCompleted()),
  hasSeenTutorial: loadSeen(),

  start: (chapter = 0) => set({
    isActive: true,
    currentChapter: chapter,
    currentStep: 0,
  }),

  advanceStep: (chapterLength: number) => {
    const { currentChapter, currentStep, completedChapters } = get()
    if (currentStep < chapterLength - 1) {
      set({ currentStep: currentStep + 1 })
    } else {
      // Chapter complete — advance or dismiss
      const newCompleted = new Set(completedChapters)
      newCompleted.add(currentChapter)
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...newCompleted]))

      if (currentChapter < 3) {
        set({
          currentChapter: currentChapter + 1,
          currentStep: 0,
          completedChapters: newCompleted,
        })
      } else {
        localStorage.setItem(STORAGE_KEY_SEEN, 'true')
        set({
          isActive: false,
          completedChapters: newCompleted,
          hasSeenTutorial: true,
        })
      }
    }
  },

  back: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  skipChapter: () => {
    const { currentChapter, completedChapters } = get()
    const newCompleted = new Set(completedChapters)
    newCompleted.add(currentChapter)
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...newCompleted]))

    if (currentChapter < 3) {
      set({
        currentChapter: currentChapter + 1,
        currentStep: 0,
        completedChapters: newCompleted,
      })
    } else {
      // Last chapter — dismiss
      localStorage.setItem(STORAGE_KEY_SEEN, 'true')
      set({
        isActive: false,
        completedChapters: newCompleted,
        hasSeenTutorial: true,
      })
    }
  },

  dismiss: () => {
    localStorage.setItem(STORAGE_KEY_SEEN, 'true')
    set({ isActive: false, hasSeenTutorial: true })
  },
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep tutorial`
Expected: No errors related to tutorial.ts

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/tutorial.ts
git commit -m "feat(tutorial): add Zustand store with localStorage persistence"
```

---

### Task 2: Step Definitions

**Files:**
- Create: `app/src/features/tutorial/steps.ts`

- [ ] **Step 1: Create the chapter and step data**

```ts
export interface TutorialStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  route?: string
}

export interface TutorialChapter {
  name: string
  steps: TutorialStep[]
}

export const chapters: TutorialChapter[] = [
  {
    name: 'Navigation',
    steps: [
      {
        target: '[data-tutorial="sidebar"]',
        title: 'The Sidebar',
        content: 'Your navigation hub. Each icon leads to a different section of your campaign.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="cmd-palette"]',
        title: 'Command Palette',
        content: 'Press Cmd+K to quickly search and jump to any entity — monsters, spells, NPCs, sessions.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="quick-ref"]',
        title: 'Quick Reference',
        content: 'Press Cmd+J to look up any entity without leaving your current page.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="all-campaigns"]',
        title: 'All Campaigns',
        content: 'Click here to switch between campaigns or create a new one.',
        placement: 'right',
      },
    ],
  },
  {
    name: 'Campaign Setup',
    steps: [
      {
        target: '[data-tutorial="campaign-overview"]',
        title: 'Campaign Overview',
        content: "Your campaign's home base. Sessions, plot threads, and party treasure all live here.",
        placement: 'top',
        route: '/campaign/$campaignId',
      },
      {
        target: '[data-tutorial="nav-characters"]',
        title: 'Characters',
        content: 'Manage your player characters and NPCs. Track stats, portraits, and backstories.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="nav-bestiary"]',
        title: 'Bestiary',
        content: 'Build your monster library. Create custom creatures or search the SRD for official stat blocks.',
        placement: 'right',
      },
      {
        target: '[data-tutorial="nav-locations"]',
        title: 'Locations',
        content: 'Map out your world. Each location can be referenced in session timelines later.',
        placement: 'right',
      },
    ],
  },
  {
    name: 'Session Prep',
    steps: [
      {
        target: '[data-tutorial="sessions-list"]',
        title: 'Sessions',
        content: 'Each session gets its own timeline. Create one for your next game.',
        placement: 'top',
        route: '/campaign/$campaignId/sessions',
      },
      {
        target: '[data-tutorial="session-timeline"]',
        title: 'Session Timeline',
        content: 'Your main prep workspace. Build a sequence of scenes for your session.',
        placement: 'top',
        route: '/campaign/$campaignId/session/$sessionId',
      },
      {
        target: '[data-tutorial="scene-block"]',
        title: 'Scene Blocks',
        content: 'Each block is a scene, encounter, or note. Drag to reorder, click to expand.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="content-drawer"]',
        title: 'Content Drawer',
        content: 'Pull in monsters, NPCs, spells, and locations from your campaign library directly into scenes.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="session-recap"]',
        title: 'Session Recap',
        content: 'After the session, write a recap to track what happened.',
        placement: 'bottom',
      },
    ],
  },
  {
    name: 'Running the Game',
    steps: [
      {
        target: '[data-tutorial="play-mode"]',
        title: 'Play Mode',
        content: 'Switch to Play mode when it\'s game time. Your prep becomes a read-through runner.',
        placement: 'bottom',
      },
      {
        target: '[data-tutorial="initiative-tracker"]',
        title: 'Initiative Tracker',
        content: 'Run combat encounters with turn order, HP tracking, and conditions.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="dice-roller"]',
        title: 'Dice Roller',
        content: 'Roll any dice expression right here — no need to leave the app.',
        placement: 'left',
      },
      {
        target: '[data-tutorial="nav-scratchpad"]',
        title: 'Inspiration Board',
        content: 'Capture ideas on the fly. Use the Web Clipper extension to save content from the web.',
        placement: 'right',
      },
    ],
  },
]
```

Note: We use `data-tutorial` attributes as selectors instead of fragile CSS class selectors. These will be added to target elements in Task 6.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep tutorial`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/tutorial/steps.ts
git commit -m "feat(tutorial): add chapter and step definitions"
```

---

### Task 3: Tutorial Overlay Component

**Files:**
- Create: `app/src/features/tutorial/TutorialOverlay.tsx`

This is the core visual component: backdrop with spotlight cutout + positioned tooltip with navigation.

- [ ] **Step 1: Create TutorialOverlay component**

Build the component with these responsibilities:
- Accept `step` (current TutorialStep), `chapterName`, `stepIndex`, `totalSteps` as props
- Find the target element via `document.querySelector(step.target)`
- If target not found, log `console.warn(\`[Tutorial] Target not found: ${step.target}\`)` and call `onSkipStep()` prop
- Calculate target's `getBoundingClientRect()` and position:
  - A spotlight `div` matching the target rect with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` and gold border + glow
  - Read the target's computed `border-radius` via `getComputedStyle(target).borderRadius` and apply it to the spotlight element to match
  - The spotlight element must have `pointer-events: none` (tour is watch-only, user cannot interact with highlighted elements)
  - A tooltip `div` offset ~12px from the target in the specified `placement` direction
- Tooltip contains:
  - Chapter name + step counter in `font-label text-primary-light` (e.g., "Navigation · Step 1 of 4")
  - Title in `font-heading text-text-heading`
  - Content in `font-body text-text-body`
  - Button row: ghost "Back" button (disabled on step 0), primary "Next" button (or "Finish" on last step of last chapter), "Skip tour" text link
- Wrap tooltip in `motion.div` with fade+slide entrance from the placement direction
- **Repositioning:** Use `ResizeObserver` on document body to recalculate position on resize. Also find the target's nearest scrollable ancestor (walk up `parentElement` checking `overflow` style) and attach a `scroll` event listener to reposition. Clean up both on unmount / step change.
- If tooltip would overflow viewport, flip placement to opposite side
- **Mobile:** If `window.innerWidth < 768` (matches `max-md` breakpoint), force placement to `'top'` or `'bottom'` only (never `'left'` or `'right'`)

Key styling tokens:
- Tooltip: `bg-bg-base border border-primary-light rounded-[--radius-lg] shadow-lg`
- Spotlight: `border-2 border-primary-light` with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px rgba(212,165,116,0.3)`, `pointer-events: none`
- All at `z-[65]`

Props interface:
```ts
interface TutorialOverlayProps {
  step: TutorialStep
  chapterName: string
  stepIndex: number
  totalSteps: number
  chapterIndex: number
  onNext: () => void
  onBack: () => void
  onDismiss: () => void
  onSkipStep: () => void
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep tutorial`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/tutorial/TutorialOverlay.tsx
git commit -m "feat(tutorial): add overlay component with spotlight and tooltip"
```

---

### Task 4: Chapter Picker Component

**Files:**
- Create: `app/src/features/tutorial/ChapterPicker.tsx`

- [ ] **Step 1: Create ChapterPicker component**

A popover/modal that lists the 4 chapters with completion state. Design:
- Trigger: receives `isOpen` and `onClose` props
- Renders inside `AnimatePresence` with `ScaleIn` wrapper (same pattern as CommandPalette)
- Backdrop click closes
- Lists chapters from the `chapters` array with:
  - Checkmark icon if chapter index is in `completedChapters`
  - Chapter name
  - Step count (e.g., "4 steps")
- Clicking a chapter calls `useTutorial.getState().start(chapterIndex)` and closes the picker
- Styled like other modals: `bg-bg-base border border-border rounded-xl shadow-lg` at `z-50`
- "Start from Beginning" button at bottom

```ts
interface ChapterPickerProps {
  isOpen: boolean
  onClose: () => void
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep tutorial`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/tutorial/ChapterPicker.tsx
git commit -m "feat(tutorial): add chapter picker component"
```

---

### Task 5: Tutorial Provider

**Files:**
- Create: `app/src/features/tutorial/TutorialProvider.tsx`

- [ ] **Step 1: Create TutorialProvider component**

This component orchestrates the tutorial. Responsibilities:

1. **Auto-trigger** — On mount, if `!hasSeenTutorial` and user is authenticated (check `useAuth().user`), call `start()` after a short delay (500ms) to let the app settle.

2. **Step resolution** — Read `currentChapter` and `currentStep` from the store, look up the step in `chapters[currentChapter].steps[currentStep]`.

3. **Mobile step filtering** — If `window.innerWidth < 768`, skip steps that target sidebar-only elements (selectors starting with `[data-tutorial="sidebar"]`, `[data-tutorial="all-campaigns"]`, `[data-tutorial="nav-`). Use a helper like:
   ```ts
   const isMobile = () => window.innerWidth < 768
   const isSidebarStep = (target: string) =>
     ['sidebar', 'all-campaigns', 'nav-'].some(id => target.includes(id))
   ```
   When advancing to a step that should be skipped on mobile, auto-advance past it.

4. **Route navigation** — If the current step has a `route`:
   - Replace `$campaignId` with the first campaign's ID (fetch from URL or a query)
   - Replace `$sessionId` with the first session's ID for that campaign
   - If IDs can't be resolved (no campaigns/sessions), skip the step
   - Use `useNavigate()` from TanStack Router to navigate
   - After navigation, poll for the target selector (every 100ms, max 3s timeout) before showing the overlay. Use a ref to track the polling interval and clean up on unmount.

5. **Step advancement logic** — `handleNext()` calls `useTutorial.getState().advanceStep(chapter.steps.length)`. The store handles chapter completion, advancement, and dismissal logic.

6. **`handleSkipStep()`** — Called when target element not found. Log `console.warn` (the overlay also logs, but this is the provider-level handler). Call `advanceStep(chapter.steps.length)` to advance. If all steps in chapter exhausted, the store moves to next chapter.

7. **Keyboard handling** — Add `keydown` listener (only when `isActive`):
   - `ArrowRight` or `Enter` → handleNext
   - `ArrowLeft` → back
   - `Escape` → dismiss

8. **Route change detection** — Use TanStack Router's `useMatches()` or `useLocation()` to detect when the user manually navigates away during the tour. If the current route no longer matches the expected route context for the active step, call `dismiss()` gracefully.

9. **Render** — When `isActive` and current step is resolved (target found after polling), render `<TutorialOverlay />` with all props. Use a `readyToShow` state that becomes true once the target element is confirmed to exist in the DOM.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep tutorial`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/src/features/tutorial/TutorialProvider.tsx
git commit -m "feat(tutorial): add provider with auto-trigger, routing, and keyboard support"
```

---

### Task 6: Add data-tutorial Attributes to Target Elements

**Files:**
- Modify: `app/src/components/layout/Sidebar.tsx`
- Modify: `app/src/features/campaigns/CampaignOverview.tsx`
- Modify: `app/src/features/sessions/SessionsPage.tsx`
- Modify: `app/src/features/sessions/SessionPage.tsx`
- Modify: `app/src/features/timeline/SessionTimeline.tsx`
- Modify: `app/src/features/timeline/SceneBlock.tsx`
- Modify: `app/src/features/timeline/ContentDrawer.tsx`
- Modify: `app/src/features/initiative/InitiativeTracker.tsx`
- Modify: `app/src/features/dice/DiceRoller.tsx`

- [ ] **Step 1: Add data-tutorial attributes to Sidebar**

In `Sidebar.tsx`:
- Add `data-tutorial="sidebar"` to the `<aside>` element
- Add `data-tutorial="all-campaigns"` to the "All Campaigns" `<Link>`
- Add `data-tutorial="nav-characters"` to the Characters nav link
- Add `data-tutorial="nav-bestiary"` to the Bestiary nav link
- Add `data-tutorial="nav-locations"` to the Locations nav link
- Add `data-tutorial="nav-scratchpad"` to the Scratchpad nav link

To add per-item attributes, add an optional `tutorialId` to the `NavItem` interface and set it on the relevant items:
```ts
interface NavItem {
  icon: IconComponent
  label: string
  to: string
  tutorialId?: string
}
```

Then in the map: `data-tutorial={item.tutorialId}` on each `<Link>`.

- [ ] **Step 2: Add data-tutorial attributes to campaign/session pages**

Add the following `data-tutorial` attributes to the outermost container or key element:
- `CampaignOverview.tsx` → `data-tutorial="campaign-overview"` on the main content wrapper
- `SessionsPage.tsx` → `data-tutorial="sessions-list"` on the sessions list container
- `SessionPage.tsx` → `data-tutorial="session-recap"` on the recap section, `data-tutorial="play-mode"` on the play mode toggle button
- `SessionTimeline.tsx` → `data-tutorial="session-timeline"` on the timeline container
- First `SceneBlock` → `data-tutorial="scene-block"` on the first scene block only (use index prop)
- `ContentDrawer.tsx` → `data-tutorial="content-drawer"` on the drawer trigger button
- `InitiativeTracker.tsx` → `data-tutorial="initiative-tracker"` on the tracker panel
- `DiceRoller.tsx` → `data-tutorial="dice-roller"` on the dice roller panel

Read each file first to find the exact elements to annotate. The attribute is a single prop addition — no structural changes.

- [ ] **Step 3: Add keyboard shortcut hint attributes for Cmd+K and Cmd+J steps**

For the Command Palette and Quick Reference steps, the tooltip points at a hint element rather than the actual overlay. Add two small invisible anchor elements in `CampaignLayout.tsx`:
```tsx
<div data-tutorial="cmd-palette" className="fixed top-4 right-1/2 w-0 h-0" />
<div data-tutorial="quick-ref" className="fixed top-4 right-1/3 w-0 h-0" />
```

These are zero-size positioning anchors. The tooltip will render near them. The actual Command Palette/Quick Reference are NOT opened during the tour.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit 2>&1 | grep -E "error|tutorial"`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/src/components/layout/Sidebar.tsx app/src/features/campaigns/CampaignOverview.tsx \
  app/src/features/sessions/SessionsPage.tsx app/src/features/sessions/SessionPage.tsx \
  app/src/features/timeline/SessionTimeline.tsx app/src/features/timeline/SceneBlock.tsx \
  app/src/features/timeline/ContentDrawer.tsx app/src/features/initiative/InitiativeTracker.tsx \
  app/src/features/dice/DiceRoller.tsx app/src/components/layout/CampaignLayout.tsx
git commit -m "feat(tutorial): add data-tutorial attributes to target elements"
```

---

### Task 7: Wire Up — App.tsx, Sidebar, Command Palette

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/layout/Sidebar.tsx`
- Modify: `app/src/components/ui/CommandPalette.tsx`
- Modify: `app/src/components/ui/icons.ts`

- [ ] **Step 1: Add icon export**

In `app/src/components/ui/icons.ts`, add:
```ts
export { GiHelpBook } from 'react-icons/gi'          // ❓ tutorial/help
```

Note: If `GiHelpBook` doesn't exist in react-icons, check for alternatives like `GiBookmarklet`, `GiOpenBook`, or `GiHelp`. Use the game-icons.net naming convention.

- [ ] **Step 2: Add TutorialProvider to App.tsx**

In `app/src/App.tsx`:
- Import `TutorialProvider` from `@/features/tutorial/TutorialProvider`
- Render it inside `QueryClientProvider`, wrapping or alongside `RouterProvider`:

```tsx
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
  <TutorialProvider />
  <Toaster />
  {/* ... rest unchanged */}
</QueryClientProvider>
```

- [ ] **Step 3: Add help button to Sidebar**

In `app/src/components/layout/Sidebar.tsx`:
- Import `GiHelpBook` (or chosen icon) from `@/components/ui/icons`
- Import `ChapterPicker` from `@/features/tutorial/ChapterPicker`
- Add state: `const [showChapterPicker, setShowChapterPicker] = useState(false)`
- Add a help button in the bottom section, above the "All Campaigns" link:

```tsx
<button
  onClick={() => setShowChapterPicker(true)}
  className={`
    flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
    text-text-muted hover:text-text-body hover:bg-bg-raised
    transition-colors duration-[--duration-fast] cursor-pointer
    ${expanded ? 'px-3' : 'justify-center'}
  `}
  title={expanded ? undefined : 'Take the tour'}
>
  <GameIcon icon={GiHelpBook} size="base" />
  {expanded && <span className="text-sm font-medium">Take the Tour</span>}
</button>
{showChapterPicker && (
  <ChapterPicker isOpen={showChapterPicker} onClose={() => setShowChapterPicker(false)} />
)}
```

- [ ] **Step 4: Add "Take the Tour" to Command Palette**

In `app/src/components/ui/CommandPalette.tsx`:
- When query matches "tour" or "tutorial" (case-insensitive), show a special action item at the top of results
- Import `useTutorial` from `@/lib/tutorial`
- When clicked, call `useTutorial.getState().start()` and `close()`
- This is a static action, not a search result — render it above the query-based results when the query matches

Add before the results section:
```tsx
const queryLower = query.toLowerCase()
const showTourAction = query.length >= 2 &&
  ['tour', 'tutorial', 'help', 'guide'].some(k => k.startsWith(queryLower))
```

This matches when the user types "to", "tou", "tour", "tu", "tut", "tutorial", "he", "help", "gu", "guide" etc. — but NOT on a single character. Then render a clickable row when `showTourAction` is true:

```tsx
{showTourAction && (
  <button
    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-bg-raised cursor-pointer"
    onClick={() => {
      useTutorial.getState().start()
      close()
    }}
  >
    <GameIcon icon={GiScrollUnfurled} size="sm" />
    <span className="text-text-heading text-sm font-medium">Take the Tour</span>
    <span className="text-text-muted text-xs">Guided walkthrough</span>
  </button>
)}
```

- [ ] **Step 5: Verify TypeScript compiles and dev server runs**

Run: `cd app && npx tsc --noEmit`
Expected: No errors

Run: `cd app && npx vite build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add app/src/App.tsx app/src/components/layout/Sidebar.tsx \
  app/src/components/ui/CommandPalette.tsx app/src/components/ui/icons.ts
git commit -m "feat(tutorial): wire up provider, sidebar help button, and command palette action"
```

---

### Task 8: Manual QA and Polish

**Files:**
- Possibly modify any of the above files for fixes

- [ ] **Step 1: Run dev server and test the full tutorial flow**

Run: `cd app && npm run dev`

Test manually:
1. Clear localStorage (`localStorage.removeItem('gm-bot-tutorial-seen')`) and reload — tutorial should auto-start
2. Walk through all 4 chapters with Next/Back buttons
3. Verify spotlight highlights the correct element at each step
4. Verify tooltip positions correctly (not clipped by viewport)
5. Test keyboard navigation (arrow keys, Escape)
6. Test "Skip tour" dismisses and persists
7. Test sidebar help icon opens ChapterPicker
8. Test Command Palette "tour" search shows the action
9. Test chapter picker shows checkmarks for completed chapters
10. Test on narrow viewport (mobile) — sidebar steps should be skipped

- [ ] **Step 2: Fix any positioning, styling, or routing issues found during QA**

Common things to fix:
- Tooltip clipping on small screens
- Spotlight misaligned after route transition (polling timing)
- Missing `data-tutorial` attributes on elements that don't render on empty state
- Motion transitions feeling janky

- [ ] **Step 3: Final build check**

Run: `cd app && npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix(tutorial): polish positioning, transitions, and edge cases"
```
