# Mobile Navigation & Utilities — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Replace the limited 4-tab mobile bottom nav with a swipeable horizontal bar containing all navigation pages plus utility actions (Search, Quick Reference, Tour). Also make the Command Palette and Quick Reference render as full-screen bottom sheets on mobile instead of centered dialogs.

**Key decisions:**
- Swipeable horizontal tab bar with all 8 nav items + 3 utilities
- Item order: core nav (Overview, Sessions, Characters), then utilities (Search, Ref), then remaining nav, Tour at end
- Right-edge fade gradient as scroll affordance
- Command Palette and Quick Reference slide up as full-screen sheets on mobile
- Mobile-specific tutorial step alternatives for the Navigation chapter

---

## Swipeable Mobile Nav Bar

### Item Order (left to right)

| # | Item | Type | Icon | Action |
|---|------|------|------|--------|
| 1 | Overview | nav | GiCrossedSwords | Navigate to `/campaign/$campaignId` |
| 2 | Sessions | nav | GiScrollUnfurled | Navigate to `/campaign/$campaignId/sessions` |
| 3 | Characters | nav | GiThreeFriends | Navigate to `/campaign/$campaignId/characters` |
| 4 | Search | utility | GiMagnifyingGlass | Open Command Palette |
| 5 | Reference | utility | GiBoltShield | Open Quick Reference |
| 6 | Bestiary | nav | GiSpikedDragonHead | Navigate to `/campaign/$campaignId/bestiary` |
| 7 | Spellbook | nav | GiSparkles | Navigate to `/campaign/$campaignId/spellbook` |
| 8 | Locations | nav | GiPositionMarker | Navigate to `/campaign/$campaignId/locations` |
| 9 | Generators | nav | GiRollingDices | Navigate to `/campaign/$campaignId/generators` |
| 10 | Scratchpad | nav | GiNotebook | Navigate to `/campaign/$campaignId/scratchpad` |
| 11 | Tour | utility | GiOpenBook | Open Chapter Picker |

Items 1-3 visible without scrolling on standard phone widths (~375px). Search and Quick Ref are one swipe away.

### Visual Design

- **Nav items:** Square icon style (same as current MobileNav — `GameIcon` with standard sizing)
- **Utility items:** Circular icon background with subtle border (`border border-border rounded-full`) to visually distinguish actions from page navigation
- **Active state:** Gold underline indicator (`bg-primary-light`) under the current page's icon, same as current MobileNav. Utility items do NOT get active state since they open overlays, not navigate.
- **Container:** `overflow-x-auto` with `-webkit-overflow-scrolling: touch` for smooth momentum scrolling. Hide scrollbar via `scrollbar-width: none` / `::-webkit-scrollbar { display: none }`.

### Scroll Affordance

Right-edge fade gradient indicating more content to the right:
- A `div` absolutely positioned on the right side of the nav bar
- `background: linear-gradient(to left, var(--color-bg-base), transparent)`
- Width: ~32px
- Disappears when the bar is scrolled to the end (track scroll position with a scroll event listener)
- `pointer-events: none` so it doesn't block taps on underlying icons

### Component Changes

**Replace `MobileNav.tsx`** with the new swipeable version. The component:
- Receives `campaignId` prop (same as current)
- Imports all icons from the barrel file
- Maps over a combined array of nav items and utility items
- Nav items render as `<Link>` (same as current)
- Utility items render as `<button>` with onClick handlers:
  - Search: `useCommandPalette.getState().open()`
  - Reference: `useQuickReference.getState().open()`
  - Tour: opens ChapterPicker (local state toggle, renders ChapterPicker component)
- Tracks scroll position for fade gradient show/hide
- Uses `useRef` on the scroll container to detect scroll position

### Styling

```
Container: fixed bottom-0 left-0 right-0 z-40 bg-bg-base/95 backdrop-blur-sm border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]
Scroll area: flex overflow-x-auto gap-0 scrollbar-hide
Each item: flex-shrink-0 flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center w-[64px]
Fade overlay: absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-bg-base to-transparent
```

### Notes

- **Item order change:** The current MobileNav has Characters before Sessions. This spec intentionally swaps that to match the sidebar order (Sessions first, per recent commit "ui: move Sessions to top of sidebar navigation").
- **"More" tab removed:** The current "More" tab pointing to Generators is replaced by listing all pages individually in the scrollable bar.
- **`layoutId` animation:** Drop the `layoutId="mobile-nav-indicator"` approach from the current MobileNav. With 11 items in a scrollable container, the spring animation across off-screen items causes visual glitches. Instead, use a simple `motion.div` indicator rendered below the active item without `layoutId`.
- **Accessibility:** The nav container should have `role="tablist"`. Utility buttons need `aria-label` attributes (e.g., `aria-label="Search"`, `aria-label="Quick Reference"`).
- **ChapterPicker:** Import from `@/features/tutorial/ChapterPicker`. Uses `isOpen` and `onClose` props. Manage open state with local `useState` in MobileNav.

---

## Full-Screen Mobile Sheets

### Command Palette (`CommandPalette.tsx`)

On mobile (< 768px), change the overlay from a centered dialog to a full-screen bottom sheet.

**Desktop (md+, unchanged):**
- Fixed overlay, centered at `pt-[15vh]`
- `max-w-[540px]`, `ScaleIn` animation
- Backdrop with blur

**Mobile (<md):**
- Fixed overlay, anchored to bottom: `fixed inset-0`
- The dialog itself: `fixed bottom-0 inset-x-0 h-full` with `rounded-t-xl` top corners
- Slide-up animation: `initial={{ y: "100%" }}` → `animate={{ y: 0 }}` with `transition={{ type: 'spring', damping: 30, stiffness: 300 }}`
- No drag handle — rely on backdrop tap and Escape key to close. (A drag handle without drag-to-dismiss is a misleading affordance, and implementing gesture detection adds complexity for little gain.)
- Same search input + results, just full width
- Backdrop: same dark overlay with tap-to-close

**Viewport detection:** Create a shared `useIsMobile()` hook in `src/hooks/useIsMobile.ts` that listens for the `md` breakpoint (768px) via `window.matchMedia('(max-width: 767px)')`. This responds to orientation changes and resizes, unlike a one-shot `window.innerWidth` check. Both CommandPalette and QuickReference use this hook to switch between desktop and mobile rendering.

### Quick Reference (`QuickReference.tsx`)

Same treatment as Command Palette:
- Desktop: existing centered overlay
- Mobile: full-screen bottom sheet sliding up
- Drag handle pill at top
- Full-width content

---

## Tutorial Navigation Chapter — Mobile Alternatives (In Scope)

The tutorial's Navigation chapter (Chapter 1) currently targets sidebar elements which are skipped on mobile. Add mobile-specific step alternatives that target the swipeable nav bar instead. This is in scope for this spec.

**Mobile Navigation steps (replace sidebar steps when `window.innerWidth < 768`):**

| # | Target | Title | Content |
|---|--------|-------|---------|
| 1 | `[data-tutorial="mobile-nav"]` | Navigation Bar | Swipe this bar to access all sections of your campaign. Your most-used pages are right here. |
| 2 | `[data-tutorial="mobile-search"]` | Search | Tap here to quickly search and jump to any entity — monsters, spells, NPCs, sessions. |
| 3 | `[data-tutorial="mobile-ref"]` | Quick Reference | Tap here to look up any entity without leaving your current page. |

**Implementation:** Add a `mobileTarget` and `mobileContent` field to `TutorialStep`, or have the provider swap step definitions based on viewport width. The simplest approach: add `mobileAlternative` as an optional field on steps that provides replacement `target`, `title`, `content`, and `placement` for mobile.

Add `data-tutorial` attributes to the swipeable nav bar:
- `data-tutorial="mobile-nav"` on the scroll container
- `data-tutorial="mobile-search"` on the Search utility button
- `data-tutorial="mobile-ref"` on the Reference utility button

---

## File Changes Summary

**New files:**
- `src/hooks/useIsMobile.ts` — Shared hook using `matchMedia` for responsive mobile detection

**Modified files:**
- `src/components/layout/MobileNav.tsx` — Full rewrite: swipeable bar with all items + utilities + fade gradient
- `src/components/ui/CommandPalette.tsx` — Add mobile full-screen sheet layout using `useIsMobile`
- `src/features/quick-reference/QuickReference.tsx` — Add mobile full-screen sheet layout using `useIsMobile`
- `src/features/tutorial/steps.ts` — Add `mobileAlternative` field to TutorialStep, add mobile alternatives for Navigation chapter steps
- `src/features/tutorial/TutorialProvider.tsx` — Swap step definitions based on viewport width for mobile alternatives

**New data-tutorial attributes:**
- `data-tutorial="mobile-nav"` on swipeable nav scroll container
- `data-tutorial="mobile-search"` on Search button in MobileNav
- `data-tutorial="mobile-ref"` on Reference button in MobileNav
