# Phase 8: Polish & Power Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animation primitives, toast notifications, a command palette, colour token warmth, and mobile refinement to complete the v2 polish layer.

**Architecture:** Motion-first approach using the `motion` library (v12, already installed) for all animations. Zustand stores for toast and command palette state. No new database tables — only new Supabase queries for command palette search.

**Tech Stack:** motion/react, Zustand, TanStack Router + Query, Tailwind 4, Supabase

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/motion/index.tsx` | Reusable motion primitives (FadeIn, SlideUp, StaggerList, ScaleIn, PageTransition) |
| `src/lib/toast.ts` | Zustand toast store |
| `src/components/ui/Toast.tsx` | Toaster component (renders toast stack) |
| `src/lib/command-palette.ts` | Zustand command palette store |
| `src/components/ui/CommandPalette.tsx` | Command palette UI |
| `src/hooks/useCommandPaletteSearch.ts` | Debounced search hook |
| `public/manifest.json` | PWA manifest |
| `public/icon-192.png` | PWA app icon 192x192 |
| `public/icon-512.png` | PWA app icon 512x512 |

### Modified Files
| File | Changes |
|------|---------|
| `src/index.css` | Colour token update (success/danger) |
| `src/App.tsx` | Add Toaster, CommandPalette, Cmd+K listener |
| `src/routes/router.tsx` | PageTransition wrapper |
| `src/components/ui/Button.tsx` | motion.button + mobile touch targets |
| `src/components/layout/MobileNav.tsx` | Animated active indicator, tap feedback |
| `index.html` | PWA manifest link, theme-color meta |
| All mutation hooks (12 files) | Toast calls in onSuccess/onError |
| All list pages (6 files) | StaggerList wrappers |
| Both dialog components | ScaleIn + AnimatePresence |

---

## Task 1: Motion Primitives

**Files:**
- Create: `src/components/motion/index.tsx`

- [ ] **Step 1: Create motion primitives file**

```tsx
// src/components/motion/index.tsx
import { type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

const EASE_OUT = [0.16, 1, 0.3, 1]

interface MotionProps {
  children: ReactNode
  className?: string
  duration?: number
  delay?: number
}

export function FadeIn({ children, className, duration = 0.2, delay = 0 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

export function SlideUp({ children, className, duration = 0.2, delay = 0 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

export function ScaleIn({ children, className, duration = 0.2 }: MotionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
}

export function StaggerList({ children, className, staggerDelay }: MotionProps & { staggerDelay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  const container = staggerDelay
    ? { ...staggerContainer, visible: { transition: { staggerChildren: staggerDelay } } }
    : staggerContainer

  return (
    <motion.div className={className} variants={container} initial="hidden" animate="visible">
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  const reduced = useReducedMotion()
  if (reduced) return <div>{children}</div>
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export { AnimatePresence, motion }
```

- [ ] **Step 2: Wire PageTransition into router**

In `src/routes/router.tsx`, update the root route component to wrap `<Outlet />` in `<PageTransition>` keyed by the current pathname. Use `useRouterState` from TanStack Router to get the location.

- [ ] **Step 3: Verify build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No errors

---

## Task 2: Colour Token Update

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update colour tokens**

In `src/index.css`, inside the `@theme` block, change:
```css
--color-success: #52b788;        /* was #4ade80 — forest green */
--color-success-dim: #2d6a4f;    /* was #166534 */
--color-danger: #e07a5f;         /* was #f87171 — rust red */
--color-danger-dim: #9b2226;     /* was #991b1b */
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npx vite build`

---

## Task 3: Toast System

**Files:**
- Create: `src/lib/toast.ts`
- Create: `src/components/ui/Toast.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create toast store**

```typescript
// src/lib/toast.ts
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, type, message, createdAt: Date.now() }],
    }))
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
```

- [ ] **Step 2: Create Toaster component**

Create `src/components/ui/Toast.tsx` with:
- Fixed position bottom-right container
- AnimatePresence wrapping toast list
- Each toast: motion.div with slide-in from right, fade-out exit
- Auto-dismiss after 3 seconds via useEffect + setTimeout
- Visual: success (forest green bg/text), error (rust red bg/text), info (blue bg/text)
- Max width 360px, rounded-md, shadow-md
- Click to dismiss

- [ ] **Step 3: Add Toaster to App.tsx**

Import `<Toaster />` and render alongside RouterProvider.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

---

## Task 4: Apply Animations Across Pages

**Files to modify:** HomePage, CampaignCard, CreateCampaignDialog, CreateSessionDialog, Button, SpellbookPage, BestiaryPage, CharactersPage, LocationsPage, InspirationBoard

- [ ] **Step 1: Wrap list pages in StaggerList**

Add `<StaggerList>` + `<StaggerItem>` wrappers to:
- HomePage campaign grid
- SpellbookPage spell lists
- BestiaryPage monster list
- CharactersPage PC/NPC lists
- LocationsPage location tree
- InspirationBoard items

- [ ] **Step 2: Add ScaleIn + AnimatePresence to dialogs**

Update CreateCampaignDialog and CreateSessionDialog:
- Remove early `if (!open) return null`
- Wrap in `<AnimatePresence>` with conditional `{open && <ScaleIn>...</ScaleIn>}`
- Add backdrop fade animation

- [ ] **Step 3: Add micro-interactions to Button**

Convert `<button>` to `<motion.button>` in Button.tsx:
- `whileTap={{ scale: 0.97 }}`
- Keep all existing className and prop logic

- [ ] **Step 4: Add hover animation to CampaignCard**

Wrap card content in `motion.div` with `whileHover={{ y: -2 }}`

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npx vite build`

---

## Task 5: Wire Toasts into Mutations

**Files to modify:** All 13 mutation hook files

- [ ] **Step 1: Add toast calls to campaign/session hooks**

In `useCampaigns.ts` and `useSessions.ts`: add `useToastStore.getState().addToast(...)` in `onSuccess` and `onError` callbacks.

- [ ] **Step 2: Add toast calls to content hooks**

In `useSpells.ts`, `useMonsters.ts`, `useCharacters.ts`, `useCharacterSpells.ts`: add toasts.

- [ ] **Step 3: Add toast calls to generator/creative hooks**

In `useEncounterTables.ts`, `useLootTables.ts`, `useInspiration.ts`, `useLocations.ts`, `useScenes.ts`, `useCombatants.ts` (selective — no HP tick toasts).

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

---

## Task 6: Command Palette

**Files:**
- Create: `src/lib/command-palette.ts`
- Create: `src/hooks/useCommandPaletteSearch.ts`
- Create: `src/components/ui/CommandPalette.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create command palette store**

Zustand store with `isOpen`, `query`, `open()`, `close()`, `setQuery()`.

- [ ] **Step 2: Create search hook**

`useCommandPaletteSearch(query, campaignId)`:
- 200ms debounce via useState + useEffect + setTimeout
- Parallel Supabase queries to spells, monsters, npcs, player_characters, locations, sessions, scenes
- Results grouped by type with icons
- Max 5 results per type
- Uses TanStack Query with debounced query as key

- [ ] **Step 3: Create CommandPalette component**

Full overlay modal with:
- Search input (large, prominent)
- Grouped results list
- Keyboard navigation (↑↓ move, Enter select, Esc close)
- Focus trap
- ScaleIn animation
- Navigation on select (using TanStack Router's useNavigate)

- [ ] **Step 4: Wire into App.tsx**

Add Cmd+K / Ctrl+K global listener. Render `<CommandPalette />` at app root. Extract campaignId from current route params for scoped search.

- [ ] **Step 5: Verify build and test**

Run: `npx tsc --noEmit && npx vite build`

---

## Task 7: Mobile Refinement

**Files:**
- Create: `public/manifest.json`
- Modify: `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/features/initiative/CombatantRow.tsx`
- Modify: `src/features/timeline/SceneBlock.tsx`
- Modify: `src/features/sessions/SessionPage.tsx`
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create PWA manifest, icons + update index.html**

Create `public/manifest.json` with app name, theme colour, display standalone.
Generate simple SVG-based PNG icons (amber dice on dark background) for 192px and 512px.
Add `<link rel="manifest">`, `<meta name="theme-color">`, Apple meta tags to `index.html`.

- [ ] **Step 2: Mobile touch targets**

Button.tsx: add `max-md:min-h-[44px]` to sm size.
CombatantRow.tsx: HP +/- buttons `max-md:w-11 max-md:h-11`, condition toggle + remove buttons same.
SceneBlock.tsx: scene status dot — expand tap area to 44px on mobile with padding (visual dot stays small).

- [ ] **Step 3: Mobile session view**

SessionPage.tsx: On mobile, initiative tracker renders as `max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:rounded-t-xl` slide-up panel.
Scene blocks: `max-md:px-3` for full-width feel, larger text on mobile.
Prep/Play toggle: `max-md:w-full` on mobile.

- [ ] **Step 4: Enhance MobileNav**

Add animated active indicator with `motion.div` + `layoutId`.
Add `whileTap={{ scale: 0.95 }}` to nav items.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit && npx vite build`

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npx vite build` passes
- [ ] Page transitions animate on route change
- [ ] Staggered lists cascade on mount
- [ ] Modals scale-in on open
- [ ] Button press has tactile scale feedback
- [ ] Toasts appear for mutation success/error
- [ ] Toasts auto-dismiss after 3 seconds
- [ ] Cmd+K opens command palette
- [ ] Command palette search returns grouped results
- [ ] Keyboard navigation works in command palette
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Touch targets >= 44px on mobile
- [ ] Colour tokens (forest green, rust red) flow through all components
