# Mobile Navigation & Utilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the limited 4-tab mobile bottom nav with a swipeable horizontal bar containing all nav pages and utility actions, add full-screen mobile sheets for search/reference, and add mobile-specific tutorial steps.

**Architecture:** Rewrite MobileNav as a scrollable tab bar with nav links + utility buttons, add a shared `useIsMobile` hook for responsive rendering, conditionally render CommandPalette and QuickReference as bottom sheets on mobile, and extend tutorial steps with `mobileAlternative` fields.

**Tech Stack:** React 19, TanStack Router, Zustand, motion/react, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-03-24-mobile-nav-design.md`

---

## File Structure

```
New files:
├── src/hooks/useIsMobile.ts                    # Shared matchMedia hook for mobile detection

Modified files:
├── src/components/layout/MobileNav.tsx          # Full rewrite: swipeable bar + utilities
├── src/components/ui/CommandPalette.tsx          # Mobile full-screen sheet layout
├── src/features/quick-reference/QuickReference.tsx  # Mobile full-screen sheet layout
├── src/features/tutorial/steps.ts               # mobileAlternative field + Navigation mobile steps
├── src/features/tutorial/TutorialProvider.tsx    # Swap steps based on viewport
```

---

### Task 1: Create useIsMobile Hook

**Files:**
- Create: `app/src/hooks/useIsMobile.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/hooks/useIsMobile.ts && git commit -m "feat(mobile): add useIsMobile hook with matchMedia listener"
```

---

### Task 2: Rewrite MobileNav as Swipeable Bar

**Files:**
- Modify: `app/src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Read the current MobileNav**

Read `app/src/components/layout/MobileNav.tsx` to understand the current structure.

- [ ] **Step 2: Rewrite the component**

Replace the entire file. The new MobileNav should:

**Data:** Define a combined items array with nav items and utility items:

```ts
type MobileNavItemType = 'nav' | 'utility'

interface MobileNavItem {
  icon: IconComponent
  label: string
  type: MobileNavItemType
  to?: string          // for nav items
  action?: string      // for utility items: 'search' | 'reference' | 'tour'
}
```

Item order (matching spec):
1. Overview (nav, GiCrossedSwords, `/campaign/$campaignId`)
2. Sessions (nav, GiScrollUnfurled, `/campaign/$campaignId/sessions`)
3. Characters (nav, GiThreeFriends, `/campaign/$campaignId/characters`)
4. Search (utility, GiMagnifyingGlass, action: 'search')
5. Reference (utility, GiBoltShield, action: 'reference')
6. Bestiary (nav, GiSpikedDragonHead, `/campaign/$campaignId/bestiary`)
7. Spellbook (nav, GiSparkles, `/campaign/$campaignId/spellbook`)
8. Locations (nav, GiPositionMarker, `/campaign/$campaignId/locations`)
9. Generators (nav, GiRollingDices, `/campaign/$campaignId/generators`)
10. Scratchpad (nav, GiNotebook, `/campaign/$campaignId/scratchpad`)
11. Tour (utility, GiOpenBook, action: 'tour')

**Imports needed:**
```ts
import { useState, useRef, useEffect } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import { motion } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiCrossedSwords, GiScrollUnfurled, GiThreeFriends, GiMagnifyingGlass,
  GiBoltShield, GiSpikedDragonHead, GiSparkles, GiPositionMarker,
  GiRollingDices, GiNotebook, GiOpenBook,
} from '@/components/ui/icons'
import { useCommandPalette } from '@/lib/command-palette'
import { useQuickReference } from '@/lib/quick-reference'
import { ChapterPicker } from '@/features/tutorial/ChapterPicker'
```

**Component structure:**
```tsx
export function MobileNav({ campaignId }: { campaignId: string }) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(true)

  // Track scroll to show/hide fade
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
      setShowFade(!atEnd)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial check
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const handleUtilityAction = (action: string) => {
    switch (action) {
      case 'search': useCommandPalette.getState().open(); break
      case 'reference': useQuickReference.getState().open(); break
      case 'tour': setShowChapterPicker(true); break
    }
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-bg-base/95 backdrop-blur-sm border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]"
        role="tablist"
      >
        <div className="relative">
          {/* Scrollable items */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide"
            data-tutorial="mobile-nav"
          >
            {items.map((item) => {
              if (item.type === 'nav' && item.to) {
                const resolvedTo = item.to.replace('$campaignId', campaignId)
                const isActive = currentPath === item.to
                return (
                  <Link key={item.label} to={resolvedTo} className={...nav item classes...}>
                    <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-0.5">
                      <GameIcon icon={item.icon} size="lg" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </motion.div>
                    {isActive && (
                      <motion.div className="absolute bottom-1 h-0.5 w-6 bg-primary-light rounded-full" />
                    )}
                  </Link>
                )
              }
              // Utility item
              return (
                <button
                  key={item.label}
                  onClick={() => handleUtilityAction(item.action!)}
                  className={...utility item classes...}
                  aria-label={item.label}
                  data-tutorial={
                    item.action === 'search' ? 'mobile-search' :
                    item.action === 'reference' ? 'mobile-ref' : undefined
                  }
                >
                  <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-0.5">
                    <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                      <GameIcon icon={item.icon} size="sm" />
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </motion.div>
                </button>
              )
            })}
          </div>

          {/* Right fade gradient */}
          {showFade && (
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-bg-base to-transparent" />
          )}
        </div>
      </nav>

      <ChapterPicker isOpen={showChapterPicker} onClose={() => setShowChapterPicker(false)} />
    </>
  )
}
```

Key styling details:
- Nav items: `flex-shrink-0 flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center w-[64px] relative transition-colors duration-[--duration-fast]`
- Active nav item: `text-primary-light`, inactive: `text-text-muted`
- Utility items: same base classes but icon wrapped in a circular border div
- Scrollbar hide: add `style={{ scrollbarWidth: 'none' }}` and `-webkit-scrollbar: display: none` via a Tailwind utility or inline style
- Active indicator: `motion.div` WITHOUT `layoutId` (drop it per spec to avoid off-screen animation glitches)
- Safe area: `pb-[env(safe-area-inset-bottom)]` on the nav container

- [ ] **Step 3: Add scrollbar-hide utility if not already in CSS**

Check if `scrollbar-hide` class exists in `app/src/index.css`. If not, add to `@layer utilities`:
```css
@layer utilities {
  .scrollbar-hide {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 5: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/components/layout/MobileNav.tsx app/src/index.css && git commit -m "feat(mobile): rewrite MobileNav as swipeable bar with all pages and utilities"
```

---

### Task 3: Mobile Full-Screen Sheet for Command Palette

**Files:**
- Modify: `app/src/components/ui/CommandPalette.tsx`

- [ ] **Step 1: Read the current CommandPalette**

Read `app/src/components/ui/CommandPalette.tsx` to understand the full structure.

- [ ] **Step 2: Add useIsMobile and conditional rendering**

Import the hook:
```ts
import { useIsMobile } from '@/hooks/useIsMobile'
```

Inside the component, call:
```ts
const isMobile = useIsMobile()
```

Change the overlay container classes based on `isMobile`:

**Desktop (existing):**
```tsx
<div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
```

**Mobile:**
```tsx
<div className="fixed inset-0 z-50">
```

Change the content wrapper:

**Desktop (existing):** Uses `ScaleIn` with `max-w-[540px]`

**Mobile:** Replace with `motion.div` that slides up. No `rounded-t-xl` since the sheet is full-screen (`inset-0`) — rounding top corners on a full-screen element looks wrong.
```tsx
{isMobile ? (
  <motion.div
    className="absolute inset-0 bg-bg-base flex flex-col"
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
  >
    {/* Same search input + results content */}
  </motion.div>
) : (
  <ScaleIn className="relative max-w-[540px] w-full">
    {/* Existing desktop content */}
  </ScaleIn>
)}
```

Extract the shared content (search input + results + footer) into a section that both layouts use, to avoid duplication. The simplest approach: keep the inner JSX the same, just wrap it differently.

The mobile layout should also have the keyboard shortcut hint changed from `⌘K` to just `ESC` since there's no Cmd key on mobile.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/components/ui/CommandPalette.tsx && git commit -m "feat(mobile): add full-screen sheet layout for Command Palette on mobile"
```

---

### Task 4: Mobile Full-Screen Sheet for Quick Reference

**Files:**
- Modify: `app/src/features/quick-reference/QuickReference.tsx`

- [ ] **Step 1: Read the current QuickReference**

Read `app/src/features/quick-reference/QuickReference.tsx` to understand the full structure.

- [ ] **Step 2: Add useIsMobile and conditional rendering**

Same pattern as Task 3:

Import:
```ts
import { useIsMobile } from '@/hooks/useIsMobile'
```

Call `const isMobile = useIsMobile()` in the component.

Change the overlay:

**Desktop (existing):**
```tsx
<div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
  ...
  <ScaleIn className="relative max-w-[800px] w-full mx-4 max-md:mx-2">
```

**Mobile:**
```tsx
<div className="fixed inset-0 z-50">
  ...
  <motion.div
    className="absolute inset-0 bg-bg-base flex flex-col"
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
  >
```

The Quick Reference has a split pane layout (results left, detail right). On mobile it already has `max-md:flex-col` classes, so the content should reflow fine inside the full-screen sheet. Just ensure the heights work: replace `h-[60vh]` with `flex-1` on mobile so it fills the sheet.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/quick-reference/QuickReference.tsx && git commit -m "feat(mobile): add full-screen sheet layout for Quick Reference on mobile"
```

---

### Task 5: Add Mobile Tutorial Step Alternatives

**Files:**
- Modify: `app/src/features/tutorial/steps.ts`
- Modify: `app/src/features/tutorial/TutorialProvider.tsx`

- [ ] **Step 1: Extend TutorialStep with mobileAlternative**

In `steps.ts`, add to the `TutorialStep` interface:

```ts
mobileAlternative?: {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}
```

- [ ] **Step 2: Add mobile alternatives to Navigation chapter steps**

In the Navigation chapter (now at index 1 after the Getting Started chapter was added), update these steps:

Step 1 (The Sidebar):
```ts
mobileAlternative: {
  target: '[data-tutorial="mobile-nav"]',
  title: 'Navigation Bar',
  content: 'Swipe this bar to access all sections of your campaign. Your most-used pages are right here.',
  placement: 'top',
},
```

Step 2 (Command Palette):
```ts
mobileAlternative: {
  target: '[data-tutorial="mobile-search"]',
  title: 'Search',
  content: 'Tap here to quickly search and jump to any entity — monsters, spells, NPCs, sessions.',
  placement: 'top',
},
```

Step 3 (Quick Reference):
```ts
mobileAlternative: {
  target: '[data-tutorial="mobile-ref"]',
  title: 'Quick Reference',
  content: 'Tap here to look up any entity without leaving your current page.',
  placement: 'top',
},
```

Step 4 (All Campaigns) — no mobile alternative needed since it would be skipped anyway (sidebar-only step).

- [ ] **Step 3: Update TutorialProvider to swap steps on mobile**

In `TutorialProvider.tsx`, in the step resolution section (where `step` is derived from `chapter?.steps[currentStep]`), add logic to use the mobile alternative when available:

```ts
// 2. Resolve current step
const chapter = isActive ? chapters[currentChapter] : null
const rawStep = chapter?.steps[currentStep] ?? null

// Use mobile alternative if available and on mobile
// Note: use the existing local isMobile() function already in TutorialProvider (line ~13-15),
// NOT the useIsMobile hook (hooks can't be called conditionally)
const step = rawStep && isMobile() && rawStep.mobileAlternative
  ? { ...rawStep, ...rawStep.mobileAlternative }
  : rawStep
```

This merges the mobile alternative fields (target, title, content, placement) over the base step, preserving other fields like `route`, `type`, etc.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 5: Commit**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add app/src/features/tutorial/steps.ts app/src/features/tutorial/TutorialProvider.tsx && git commit -m "feat(mobile): add mobile alternative tutorial steps for Navigation chapter"
```

---

### Task 6: Build Check and QA

**Files:**
- Possibly modify any of the above files for fixes

- [ ] **Step 1: Run production build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx vite build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 2: Test on dev server**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npm run dev`

Test (use browser DevTools mobile viewport or actual phone):
1. Bottom nav shows all 11 items in a scrollable bar
2. Swipe right to reveal more items — fade gradient visible on right edge
3. Fade gradient disappears when scrolled to end
4. Tapping nav items navigates correctly with gold active indicator
5. Tapping Search opens Command Palette as full-screen sheet (slide up)
6. Tapping Reference opens Quick Reference as full-screen sheet (slide up)
7. Tapping Tour opens Chapter Picker
8. Utility items have circular icon styling
9. Safe area padding works on notched devices (test with iPhone simulator or DevTools)
10. Tutorial on mobile: Navigation chapter shows "Navigation Bar", "Search", "Quick Reference" targeting the mobile nav items

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Commit fixes**

```bash
cd "/Users/athenoula/claude things/V2 book of tricks" && git add -A && git commit -m "fix(mobile): polish swipeable nav and mobile sheets"
```
