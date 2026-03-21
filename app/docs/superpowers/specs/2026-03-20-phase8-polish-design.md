# Phase 8: Polish & Power Features — Design Spec

## Context

GM Book of Tricks v2 has 7 phases of functionality built (auth, campaigns, sessions, initiative tracker, content library, generators, creative spaces, session timeline). The app works but lacks visual polish, user feedback, keyboard accessibility, and mobile optimisation. Phase 8 adds the finishing layer.

**Aesthetic direction:** Warm Craft — charcoal + amber, serif headings, handcrafted feel. Status colours updated to forest green (`#2d6a4f` / `#52b788`) and rust red (`#9b2226` / `#e07a5f`) for warmth.

**Animation approach:** Motion-first — the `motion` library (v12, already installed) is used consistently for all animations.

---

## 1. Motion Primitives

Reusable animation wrapper components in `src/components/motion/`.

### Components

| Component | Behaviour | Props |
|-----------|-----------|-------|
| `FadeIn` | opacity 0→1 | `duration?`, `delay?`, `className?` |
| `SlideUp` | opacity 0→1 + translateY(12px→0) | `duration?`, `delay?` |
| `ScaleIn` | opacity 0→1 + scale(0.95→1) | `duration?` — for modals/dialogs |
| `StaggerList` | Wraps children, each child delays 40ms after previous | `staggerDelay?` |
| `PageTransition` | Wraps route outlet, fade+slide on route change | — |

### Defaults
- Duration: 200ms (uses `--duration-normal`)
- Easing: `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)`
- All respect `prefers-reduced-motion` — instant render, no animation

### Where Applied
- **Page transitions:** `PageTransition` wraps the router outlet in `App.tsx`
- **Lists:** `StaggerList` on campaign grid, spell lists, monster lists, session lists, NPC cards, location tree
- **Modals:** `ScaleIn` on CreateCampaignDialog, CreateSessionDialog, CommandPalette
- **Cards:** `SlideUp` on individual cards when they mount
- **Micro-interactions:** Button press `whileTap={{ scale: 0.97 }}`, card hover `whileHover={{ y: -2 }}`

### File
`src/components/motion/index.tsx` — single file exporting all primitives.

---

## 2. Toast Notification System

### Architecture
- **Store:** Zustand store at `src/lib/toast.ts`
  - State: `toasts: Toast[]`
  - Actions: `addToast(type, message)`, `removeToast(id)`
  - Toast type: `{ id: string, type: 'success' | 'error' | 'info', message: string, createdAt: number }`
- **Component:** `src/components/ui/Toast.tsx`
  - Renders in fixed position bottom-right (`bottom-6 right-6`)
  - Max 3 visible, oldest dismissed first
  - Auto-dismiss after 3 seconds
  - Motion: slide in from right, fade out on dismiss
  - Click to dismiss early
- **Provider:** `<Toaster />` rendered in `App.tsx` at root level

### Visual Design
- **Success:** bg `#2d6a4f`, text `#52b788`, icon ✓
- **Error:** bg `#9b2226`, text `#e07a5f`, icon ✕
- **Info:** bg `#3730a3`, text `#818cf8`, icon ℹ
- Border radius: `--radius-md`
- Max width: 360px
- Font: DM Sans, 13px

### Integration Points
Wire `addToast` into existing TanStack Query mutation `onSuccess` / `onError` callbacks across:
- Campaign create/delete
- Session create/delete/status change
- Combatant add/remove/HP changes (batch — don't toast every HP tick)
- Spell save/bulk import/delete
- Monster save/delete
- PC/NPC create/update/delete
- Scene create/delete
- Encounter/loot table operations
- Inspiration item operations

### File
- `src/lib/toast.ts` — Zustand store
- `src/components/ui/Toast.tsx` — Toaster component

---

## 3. Command Palette

### Architecture
- **Store:** Zustand store at `src/lib/command-palette.ts`
  - State: `isOpen: boolean`, `query: string`
  - Actions: `open()`, `close()`, `setQuery(q)`
- **Keyboard shortcut:** Global `useEffect` in App.tsx listens for `Cmd+K` / `Ctrl+K` → `open()`
- **Component:** `src/components/ui/CommandPalette.tsx`

### Search Behaviour
- Debounced query (200ms) searches across Supabase tables in the active campaign:
  - `spells` — by name
  - `monsters` — by name
  - `npcs` — by name
  - `player_characters` — by name
  - `locations` — by name
  - `sessions` — by name
  - `scenes` — by name
- Results grouped by type with icons (✦ Spells, 🐉 Monsters, 👥 Characters, 📍 Locations, 📜 Sessions)
- Max 5 results per type
- If no campaign is active (on /home), search across all user's campaigns

### Keyboard Navigation
- `↑` / `↓` — move highlight through results
- `Enter` — navigate to selected item (spell → spellbook, monster → bestiary, session → session page, etc.)
- `Esc` — close palette
- Focus trapped inside palette when open

### Visual Design
- Centered modal overlay with backdrop blur
- Search input at top with magnifying glass icon
- Results list with type headers, hover/active highlighting
- Footer with keyboard shortcut hints
- Motion: ScaleIn on open, fade out on close

### Files
- `src/lib/command-palette.ts` — Zustand store
- `src/components/ui/CommandPalette.tsx` — UI component
- `src/hooks/useCommandPaletteSearch.ts` — search hook with debounced Supabase queries

---

## 4. Mobile Refinement

### Touch Targets
Audit and fix all interactive elements to meet 44px minimum:
- Button `sm` size: increase to `min-h-[44px]` on mobile
- Initiative tracker +/- HP buttons: 44px on mobile
- Condition toggle buttons: 44px on mobile
- Scene status dots: increase to 44px tap area (visual size can stay small, tap area expanded)
- Navigation items in MobileNav: already 56px ✓

### Mobile Session View
- Initiative tracker: full-width slide-up panel from bottom (not inline) on mobile
- Scene blocks: full-width, larger text, more padding
- Prep/Play mode toggle: full-width on mobile

### PWA Manifest
- `public/manifest.json` with:
  - `name`: "GM Book of Tricks"
  - `short_name`: "GM Tricks"
  - `display`: "standalone"
  - `theme_color`: "#141210" (bg-deep)
  - `background_color`: "#141210"
  - App icons: 192px + 512px (simple dice/book icon)
- `<link rel="manifest">` in index.html
- `<meta name="theme-color">` for mobile browser chrome

### Mobile Nav Enhancement
- Active tab indicator: animated underline that slides between tabs (motion `layoutId`)
- Press feedback: `whileTap={{ scale: 0.95 }}` on nav items

### Files
- `public/manifest.json` — PWA manifest
- `public/icon-192.png`, `public/icon-512.png` — app icons
- Updates to existing components for mobile-specific styles

---

## 5. Colour Token Updates

Update `src/index.css` design tokens:

```css
/* Status — warmer palette */
--color-success: #52b788;        /* was #4ade80 */
--color-success-dim: #2d6a4f;    /* was #166534 */
--color-danger: #e07a5f;         /* was #f87171 */
--color-danger-dim: #9b2226;     /* was #991b1b */
```

These flow through all existing components via the token system — HP bars, status badges, condition colours, button variants, toast colours.

---

## Build Order

1. **Motion primitives** — `FadeIn`, `SlideUp`, `StaggerList`, `ScaleIn`, `PageTransition`
2. **Colour token update** — forest green + rust red
3. **Toast system** — store + component
4. **Apply animations** — page transitions, list staggering, modal animations, micro-interactions across all pages
5. **Wire toasts** — into all mutations
6. **Command Palette** — store + search hook + UI component
7. **Mobile refinement** — touch targets, PWA manifest, mobile session view, nav animation

---

## Verification

### Manual Testing
- Page transitions: navigate between routes, verify smooth fade+slide
- Staggered lists: load campaign with multiple items, verify cascade entrance
- Toasts: save a spell, delete an NPC, trigger an error — verify toast appears and auto-dismisses
- Command palette: Cmd+K → type "fire" → verify spells/monsters appear → arrow down → Enter → verify navigation
- Mobile: resize to 375px width, verify all touch targets ≥44px, test initiative tracker slide-up
- Reduced motion: enable `prefers-reduced-motion` in browser settings, verify no animations
- PWA: open on mobile browser, verify "Add to Home Screen" prompt works

### Automated
- TypeScript: `npx tsc --noEmit` passes
- Build: `npx vite build` passes
