# Combatant Info Popover — Design Spec

**Date:** 2026-03-29
**Status:** Draft

## Summary

Clicking a combatant's name in the initiative tracker (both the full `InitiativeTracker` and the compact `InlineBattle`) opens a floating popover card showing the full info for that creature — monster stat block, NPC details, or PC character sheet. Uses the same `*FullView` components built for timeline inline expansion. Data is stored as a snapshot at add-time, so no live queries are needed.

## Interaction Model

- **Click combatant name** → popover appears anchored near the name
- **Click elsewhere or press Escape** → popover dismisses
- **Click a different combatant's name** → closes current popover, opens new one
- **Only one popover open at a time**
- Works in both `InitiativeTracker` (full tracker) and `InlineBattle` (timeline compact view)

## Data Storage

### New Column: `source_snapshot`

Add a `source_snapshot JSONB DEFAULT NULL` column to the `combatants` table. This stores the full source data at add-time, identical to the enriched `content_snapshot` format used in timeline blocks.

### Enrichment at Add-Time

**QuickAddPanel** changes — when adding from library, include full source data:

**PC:** Store the same enriched snapshot as timeline PC-as-NPC blocks:
- `source_type: 'pc'`, plus: name, race, class, subclass, level, ability_scores, hp_current, hp_max, armor_class, speed, proficiency_bonus, saving_throw_proficiencies, skill_proficiencies, equipment, class_features, traits, personality_traits, ideals, bonds, flaws, backstory, appearance, notes, player_name, portrait_url, spellcasting_ability, is_pc: true

**NPC:** Store the same enriched snapshot as timeline NPC blocks:
- `source_type: 'npc'`, plus: name, race, occupation, personality, appearance, notes, stats, portrait_url, stat_block

**Monster:** Store the same enriched snapshot as timeline monster blocks:
- `source_type: 'monster'`, plus: name, size, type, alignment, challenge_rating, armor_class, hit_points, hit_dice, speed, stat_block, armor_desc, notes

**AddCombatantForm** (manual entry): `source_snapshot` remains `null`. The popover shows a minimal card with just name, HP, AC, and any notes.

### useAddCombatant Hook Change

The mutation input type gains an optional `source_snapshot?: Record<string, unknown>` field. The Supabase insert includes it when present.

### CombatantSnapshot Type Change

The `CombatantSnapshot` type in `useBattles.ts` gains an optional `source_snapshot?: Record<string, unknown>` field. When battles are saved (template or save_state), the source_snapshot is included in `combatant_data` so it survives save/load cycles.

### InlineBattle Snapshot Change

The `InlineBattle` component reads combatant snapshots from `content_snapshot.combatants`. Each combatant object gains an optional `source_snapshot` field. This data flows through when battles are saved to timeline via `onSaveToTimeline` / `onSnapshotUpdate`.

## Popover Component

### `CombatantInfoPopover`

A new component that renders the floating popover card.

**Props:**
```typescript
{
  sourceType: 'pc' | 'npc' | 'monster' | null
  sourceSnapshot: Record<string, unknown> | null
  combatantName: string
  combatantHp: number
  combatantHpMax: number
  combatantAc: number
  anchorRef: React.RefObject<HTMLElement>
  onClose: () => void
}
```

**Rendering logic:**
- If `sourceSnapshot` exists and `sourceType === 'monster'` → render `MonsterFullView`
- If `sourceSnapshot` exists and `sourceType === 'npc'` → render `NPCFullView` (handles both NPC and PC-as-NPC via `is_pc` flag)
- If `sourceSnapshot` exists and `sourceType === 'pc'` → render `NPCFullView` with `is_pc: true`
- If no `sourceSnapshot` → render minimal card: name, HP, AC only

**Positioning:**
- Uses a portal to render outside the tracker's scroll container
- Positioned below the anchor element, centered horizontally
- Auto-flips above if not enough space below
- Max height: `60vh` with overflow scroll
- Max width: `400px`

**Styling:**
- `bg-bg-base` background with `border border-amber-500/40`
- `shadow-[0_0_20px_rgba(245,158,11,0.15)]` amber glow
- `backdrop-blur-sm` on a semi-transparent overlay behind (click to dismiss)
- `rounded-[--radius-lg]`
- Fade-in animation via `motion.div`

### Integration Points

**CombatantRow** — the name `<span>` becomes a clickable button. On click, calls a callback `onShowInfo(combatantId)` passed from the tracker.

**InitiativeTracker** — manages `activePopoverId` state. Passes `onShowInfo` to each `CombatantRow`. Renders `CombatantInfoPopover` when active, passing the combatant's `source_snapshot` and a ref to the clicked name element.

**InlineBattle** — same pattern. The inline combatant name becomes clickable. Manages its own `activePopoverId` state and renders the popover.

## Backward Compatibility

- Existing combatants have `source_snapshot: null` → popover shows minimal card
- Existing battle saves have no `source_snapshot` in combatant_data → popover shows minimal card
- No migration of existing data needed

## DB Migration

```sql
ALTER TABLE combatants ADD COLUMN source_snapshot JSONB DEFAULT NULL;
```

## File Structure

**New files:**
- `app/src/features/initiative/CombatantInfoPopover.tsx`

**Modified files:**
- `app/src/features/initiative/useCombatants.ts` — add `source_snapshot` to `Combatant` type and `useAddCombatant` input
- `app/src/features/initiative/useBattles.ts` — add `source_snapshot` to `CombatantSnapshot` type
- `app/src/features/initiative/QuickAddPanel.tsx` — enrich combatant adds with source snapshots
- `app/src/features/initiative/CombatantRow.tsx` — make name clickable, add `onShowInfo` callback
- `app/src/features/initiative/InitiativeTracker.tsx` — manage popover state, render popover, pass `source_snapshot` when saving battles
- `app/src/features/timeline/InlineBattle.tsx` — make combatant names clickable, render popover, include `source_snapshot` in snapshot saves

**New migration:**
- `app/supabase/migrations/YYYYMMDDHHMMSS_combatant_source_snapshot.sql`

## Scope Exclusions

- No editing in the popover — it's read-only reference
- No fetching from source tables — all data from snapshot
- No changes to AddCombatantForm — manual combatants get no snapshot
- No changes to battle template/save-state logic beyond including the new field
