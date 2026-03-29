# Editable Initiative — Design Spec

**Date:** 2026-03-29
**Status:** Draft

## Summary

Two changes to initiative handling: (1) PCs prompt the GM for initiative instead of auto-rolling, since players roll their own dice. (2) All combatants' initiative badges become click-to-edit, so the GM can adjust any value at any time. The list reorders automatically when initiative changes.

## 1. PC Initiative Prompt in QuickAddPanel

When the GM clicks "+ Add" on a PC row in `QuickAddPanel`:
- Instead of immediately adding with `rollD20() + initiative_bonus`, the row transforms to show a number input
- The input is pre-focused with placeholder "Init"
- **Enter** or a confirm button → adds the combatant with the typed initiative value
- **Escape** → cancels, row returns to normal
- NPCs and monsters continue to auto-roll as they do now — no change

### Implementation

`QuickAddPanel.tsx` tracks a `pendingPcId` state. When a PC's "+ Add" is clicked, instead of calling `addPC(pc)`, it sets `pendingPcId` to that PC's id. The `QuickAddRow` for that PC then renders an initiative input instead of the "+ Add" button. On confirm, it calls `addCombatant.mutate()` with the typed value. On cancel/Escape, `pendingPcId` resets to null.

## 2. Click-to-Edit Initiative Badge

The initiative badge (colored number box on each combatant row) becomes clickable in both `CombatantRow` and `CombatantInlineRow`:

- **Click** the badge → transforms into a number input (same dimensions as the badge)
- **Enter** → saves the new value. In `CombatantRow`, calls `useUpdateCombatant`. In `CombatantInlineRow`, calls the parent's state updater.
- **Escape or blur** → cancels, reverts to original value
- The combatant list automatically reorders because it's already sorted by initiative (derived sort in both `InitiativeTracker` and `InlineBattle`)

### Implementation

`CombatantRow.tsx` adds local state `editingInit` (boolean) and `editInitValue` (string). When editing, the badge div renders an `<input type="number">` instead of the static number. On Enter, mutates via `useUpdateCombatant({ id, initiative: newValue })`. On Escape/blur, resets state.

`InlineBattle.tsx` — `CombatantInlineRow` gets the same pattern but calls a new `onEditInitiative?: (newInit: number) => void` callback. `InlineBattle` handles it by updating local state and calling `saveState()`.

## File Changes

**Modified files:**
- `app/src/features/initiative/QuickAddPanel.tsx` — PC initiative prompt
- `app/src/features/initiative/CombatantRow.tsx` — click-to-edit initiative badge
- `app/src/features/timeline/InlineBattle.tsx` — click-to-edit initiative badge on inline rows

**No new files. No DB changes. No new components.**

## Scope Exclusions

- No changes to NPC/monster auto-roll behavior
- No changes to AddCombatantForm (already has manual initiative input)
- No changes to battle save/load logic
