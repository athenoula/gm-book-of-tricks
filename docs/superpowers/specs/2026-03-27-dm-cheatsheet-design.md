# DM's Cheat Sheet — Design Spec

## Overview

A global modal overlay containing static D&D 5e reference tables organized into tabbed sections. Designed for quick mid-session lookups so the DM doesn't need to leave the app or flip through a rulebook.

## Trigger / Access

| Method | Detail |
|--------|--------|
| **Keyboard shortcut** | `Cmd+L` (Mac) / `Ctrl+L` (Windows/Linux) — global, works from any page |
| **Session page button** | A "Cheat Sheet" button in the session header toolbar (next to Dice and Initiative buttons) |
| **Command Palette** | Searchable via Cmd+K — typing "cheat", "cheat sheet", or "dm" surfaces a "DM's Cheat Sheet" action |
| **Close** | `Esc` key, click backdrop, or close button |

## Modal Presentation

Follows the same pattern as Quick Reference (`QuickReference.tsx`):

- **Desktop:** Fixed overlay (`z-50`), backdrop blur, `ScaleIn` animation. Max-width ~700px, centered with top offset.
- **Mobile:** Bottom-sheet spring animation (`y: 100% → 0`). Close button (X) in top-right. Full-width, max-height 85vh, scrollable.
- Title bar: "DM's Cheat Sheet" heading. Desktop shows ESC badge, mobile shows X button.

## Layout: Tabbed Sections

Horizontal tab row across the top of the modal. One tab active at a time. Content area below is scrollable.

**6 tabs:**

1. Skill Checks
2. Conditions
3. Cover
4. DCs
5. Travel
6. Items

On mobile, the tab row scrolls horizontally if needed (overflow-x-auto).

## Tab Content

### 1. Skill Checks

All 18 skills grouped by ability score. Two-column grid (single column on mobile).

| Ability | Skills |
|---------|--------|
| **STR** | Athletics |
| **DEX** | Acrobatics, Sleight of Hand, Stealth |
| **INT** | Arcana, History, Investigation, Nature, Religion |
| **WIS** | Animal Handling, Insight, Medicine, Perception, Survival |
| **CHA** | Deception, Intimidation, Performance, Persuasion |
| **CON** | *(no skills — note: CON saves only)* |

Each entry: colored ability abbreviation tag + skill name.

Footer note: "Contested checks: both sides roll, highest wins."

### 2. Conditions

All 15 standard conditions with 1-2 line mechanical summaries:

- **Blinded** — Can't see. Auto-fail sight checks. Attacks have disadvantage; attacks against have advantage.
- **Charmed** — Can't attack charmer. Charmer has advantage on social checks.
- **Deafened** — Can't hear. Auto-fail hearing checks.
- **Frightened** — Disadvantage on checks/attacks while source is in sight. Can't willingly move closer.
- **Grappled** — Speed is 0. Ends if grappler incapacitated or effect moves target out of reach.
- **Incapacitated** — Can't take actions or reactions.
- **Invisible** — Impossible to see without magic/special sense. Advantage on attacks; attacks against have disadvantage.
- **Paralyzed** — Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits.
- **Petrified** — Turned to stone. Weight x10. Incapacitated, can't move/speak. Resistance to all damage. Immune to poison/disease.
- **Poisoned** — Disadvantage on attacks and ability checks.
- **Prone** — Disadvantage on attacks. Melee attacks against have advantage; ranged attacks against have disadvantage. Must spend half movement to stand.
- **Restrained** — Speed is 0. Attacks have disadvantage; attacks against have advantage. Disadvantage on DEX saves.
- **Stunned** — Incapacitated, can't move, can only speak falteringly. Auto-fail STR/DEX saves. Attacks against have advantage.
- **Unconscious** — Incapacitated, can't move or speak, drops held items, falls prone. Auto-fail STR/DEX saves. Attacks have advantage; melee hits are auto-crits.
- **Exhaustion** — Level table (1-6) shown as a compact sub-table:

| Level | Effect |
|-------|--------|
| 1 | Disadvantage on ability checks |
| 2 | Speed halved |
| 3 | Disadvantage on attacks and saves |
| 4 | HP max halved |
| 5 | Speed reduced to 0 |
| 6 | Death |

Note: "Effects are cumulative."

### 3. Cover

Three rows, simple and compact:

| Type | AC/DEX Save Bonus | Description |
|------|-------------------|-------------|
| **Half** | +2 | Obstacle blocks at least half the body (low wall, furniture, another creature) |
| **Three-Quarters** | +5 | Obstacle blocks about three-quarters (portcullis, arrow slit) |
| **Full** | Can't be targeted | Completely concealed by obstacle |

### 4. DC Guidelines

| Difficulty | DC |
|------------|------|
| Very Easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very Hard | 25 |
| Nearly Impossible | 30 |

### 5. Travel Pace

| Pace | Per Minute | Per Hour | Per Day | Effect |
|------|-----------|----------|---------|--------|
| **Fast** | 400 ft | 4 miles | 30 miles | -5 to passive Perception |
| **Normal** | 300 ft | 3 miles | 24 miles | — |
| **Slow** | 200 ft | 2 miles | 18 miles | Can use Stealth |

### 6. Common Item Costs

Grouped into categories:

**Adventuring Gear**
| Item | Cost |
|------|------|
| Rope (50 ft) | 1 gp |
| Torch (10) | 1 cp each |
| Rations (1 day) | 5 sp |
| Waterskin | 2 sp |
| Bedroll | 1 gp |
| Tinderbox | 5 sp |
| Piton (10) | 5 cp each |
| Grappling Hook | 2 gp |

**Potions**
| Item | Cost |
|------|------|
| Healing (2d4+2) | 50 gp |
| Greater Healing (4d4+4) | 100 gp |

**Services**
| Item | Cost |
|------|------|
| Ale (mug) | 4 cp |
| Meal (modest) | 3 sp |
| Inn stay (modest) | 5 sp |
| Inn stay (comfortable) | 8 sp |
| Messenger (per mile) | 2 cp |

## Data Architecture

All content is static — no database queries.

- **Data file:** `features/cheat-sheet/cheatSheetData.ts` — exports typed arrays/objects for each tab's content
- **No Supabase dependency** — pure client-side reference data

## State Management

New Zustand store following existing patterns:

```typescript
// lib/cheat-sheet.ts
type CheatSheetState = {
  isOpen: boolean
  activeTab: string  // 'skills' | 'conditions' | 'cover' | 'dcs' | 'travel' | 'items'
  open: () => void
  close: () => void
  setTab: (tab: string) => void
}
```

## New Files

| File | Purpose |
|------|---------|
| `features/cheat-sheet/CheatSheet.tsx` | Modal component with tabs and content rendering |
| `features/cheat-sheet/cheatSheetData.ts` | All static reference data |
| `lib/cheat-sheet.ts` | Zustand store (isOpen, activeTab) |

## Integration Points

| Location | Change |
|----------|--------|
| `App.tsx` | Add `Cmd+L` / `Ctrl+L` keyboard listener alongside existing `Cmd+K` and `Cmd+J` handlers. Render `<CheatSheet />` component. |
| `SessionPage.tsx` | Add "Cheat Sheet" button in the header toolbar (between Dice and Initiative buttons). Uses a book/scroll icon from game-icons. Calls `useCheatSheet.getState().open()`. |
| `hooks/useCommandPaletteSearch.ts` | Add "DM's Cheat Sheet" as a searchable action in the command palette results. |
| `components/ui/icons.ts` | Add `GiBookmarklet` icon import for the cheat sheet button (fallback: `GiOpenBook` if not available in the icon set). |

## Mobile Considerations

- Bottom-sheet presentation (same as Quick Reference)
- Tab row scrolls horizontally (`overflow-x-auto`, `flex-nowrap`)
- Tables use compact text sizing on mobile
- Close button (X) always visible in top-right
- Accessible via Command Palette (Cmd+K) for discoverability
- Session page button visible on mobile toolbar
