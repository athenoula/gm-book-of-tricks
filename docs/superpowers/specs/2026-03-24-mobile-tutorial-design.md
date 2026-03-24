# Mobile Tutorial Presentation — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Depends on:** Guided tutorial system (implemented), mobile nav (implemented)

---

## Overview

Replace the floating tooltip popover with a fixed bottom bar on mobile for the tutorial. Keeps the spotlight highlight on elements but moves the explanation text into a compact bar above the MobileNav. Also update step content to use mobile-friendly language (tap instead of click, no keyboard shortcuts).

**Key decisions:**
- Bottom bar + spotlight format (not full-screen cards or floating tooltips)
- Bar sits above MobileNav (nav stays visible and functional)
- Continuous chapter flow (no break cards between chapters)
- Mobile-specific content where desktop language doesn't apply

---

## Mobile Tutorial Bottom Bar

### Position and Layout

- Fixed at `bottom-[74px]` (56px MobileNav + 18px for scroll dots/safe area), full width
- `z-[65]` — same as desktop tutorial overlay, above MobileNav (z-40)
- Renders only on mobile (`< 768px`) — desktop tooltip behavior unchanged

### Bar Structure

```
┌──────────────────────────────────────────┐
│ Title                    Chapter · 1/4   │
│ Description text goes here in one or     │
│ two lines max.                           │
│ Skip              [◀ Back] [Next ▶]      │
└──────────────────────────────────────────┘
```

- **Top row:** Step title (left, `font-heading text-text-heading text-sm`), chapter name + step counter (right, `font-label text-primary-light text-xs`)
- **Middle:** Description text (`font-body text-text-body text-xs leading-relaxed`)
- **Bottom row:** "Skip tour" link (left, `text-text-muted text-xs`), Back/Next buttons (right, existing `Button` component `size="sm"`)
- Padding: `px-4 py-3`
- Background: `bg-bg-base border-t border-primary-light`
- Entrance animation: slide up from below via `motion.div` with `initial={{ y: 50, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`

### Step Mode Variants

**Highlight mode:** Standard bar with Back/Next/Skip as described above.

**Create mode:** Bar shows step content. No Next button (user must tap the highlighted element). "Skip tour" still available. Spotlight gets `pointer-events: auto`. Bar renders at `z-[45]` (below dialogs) same as desktop create mode.

**Acknowledge mode:** Bar shows acknowledgment text with `{name}` replaced. Single "Continue" button centered. No Back or Skip.

### Spotlight

Same spotlight behavior as desktop — `getBoundingClientRect()`, gold border, box-shadow cutout. All existing positioning/scroll/resize logic applies. The only difference is the tooltip is replaced by the bottom bar.

---

## Mobile-Specific Step Content

Extend `mobileAlternative` on steps where desktop content references clicks or keyboard shortcuts. The provider already swaps in `mobileAlternative` fields on mobile.

### Steps needing mobile content overrides

**Getting Started chapter:**

| Step | Field | Mobile value |
|------|-------|-------------|
| Create a Campaign | content | "Let's create your first campaign to get started. Tap the button to begin!" |
| Add a Character | content | "Every adventure needs heroes. Tap below to add your first player character." |
| Create a Session | content | "Sessions are where you prep and run your games. Tap below to create your first one." |

**Navigation chapter:** Already has full `mobileAlternative` overrides (target, title, content, placement) from the mobile nav spec.

**Campaign Setup chapter:**

| Step | Field | Mobile value |
|------|-------|-------------|
| All Campaigns | content | "Tap here to switch between campaigns or create a new one." |

**Session Prep chapter:**

| Step | Field | Mobile value |
|------|-------|-------------|
| Scene Blocks | content | "Each block is a scene, encounter, or note. Tap to expand, hold and drag to reorder." |

**Running the Game chapter:** No overrides needed — content doesn't reference desktop-specific interactions.

### Implementation

For steps that only need a `content` override (not target/title/placement), add `mobileAlternative: { content: '...' }` with just the content field. The provider's spread-merge logic (`{ ...rawStep, ...rawStep.mobileAlternative }`) handles this — only the specified fields are overridden.

Update the `mobileAlternative` type to make all fields optional:
```ts
mobileAlternative?: Partial<Pick<TutorialStep, 'target' | 'title' | 'content' | 'placement'>>
```

---

## File Changes

**Modified files:**
- `src/features/tutorial/TutorialOverlay.tsx` — Add mobile bottom bar rendering path (check `useIsMobile()`, render bar instead of positioned tooltip on mobile)
- `src/features/tutorial/steps.ts` — Add `mobileAlternative.content` overrides to Getting Started, Campaign Setup, and Session Prep steps. Update `mobileAlternative` type to `Partial<Pick<...>>`.
- `src/hooks/useIsMobile.ts` — Already exists, no changes needed

**No changes to:**
- `TutorialProvider.tsx` — Already handles `mobileAlternative` swapping
- `MobileNav.tsx` — Already in place
- Tutorial store — No new state needed
