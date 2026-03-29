# Custom Spells — Create & Edit Homebrew Spells

**Date:** 2026-03-29
**Status:** Approved

## Summary

Add the ability for GMs to create homebrew spells from scratch and edit them after creation. Follows the established monster create/edit pattern — inline form replaces library view, edit button only on homebrew entries.

## Scope

- Create homebrew spells with all standard D&D spell fields
- Edit existing homebrew spells
- No changes to SRD spells (read-only, delete-only as before)
- No schema migration needed — existing `spells` table already supports `source: 'homebrew'`

## Data Layer

### No Schema Changes

The `spells` table already has:
- `source text NOT NULL DEFAULT 'srd'` with CHECK constraint for `'srd' | 'homebrew'`
- `srd_slug text` (nullable — null for homebrew)
- `spell_data jsonb` (nullable — will store `{ desc, higher_level }` for homebrew)
- `source_book text` (will default to `'Homebrew'` for custom spells)

### New Mutation Hooks (`useSpells.ts`)

**`useCreateSpell()`**
- Inserts into `spells` with `source: 'homebrew'`, `srd_slug: null`, `source_book: 'Homebrew'`
- Stores `desc` and `higher_level` in `spell_data` jsonb to maintain display compatibility with SRD spells
- `spell_data` shape for homebrew: `{ desc: string, higher_level: string }`
- Invalidates `['spells', campaignId]` query cache on success
- Toast on success: "Spell created"

**`useUpdateSpell()`**
- Updates spell by ID (only homebrew spells should reach this path via UI gating)
- Same field set as create
- Updates `spell_data.desc` and `spell_data.higher_level` alongside top-level columns
- Invalidates `['spells', campaignId]` query cache on success
- Toast on success: "Spell updated"

## Form Component: `SpellCreateForm.tsx`

**Location:** `src/features/spellbook/SpellCreateForm.tsx`

Single component handling both create and edit modes (determined by optional `spell` prop, matching `MonsterCreateForm` pattern).

### Props

```typescript
interface SpellCreateFormProps {
  campaignId: string
  spell?: Spell        // present = edit mode, absent = create mode
  onClose: () => void
}
```

### Form Fields

| Field | Input Type | Required | Default |
|-------|-----------|----------|---------|
| Name | Text input | Yes | `''` |
| Level | Select (Cantrip, 1–9) | Yes | `0` |
| School | Select (8 schools from `SPELL_SCHOOLS`) | No | `''` |
| Casting Time | Text input | No | `''` |
| Range | Text input | No | `''` |
| Duration | Text input | No | `''` |
| Components | Text input (e.g., "V, S, M (bat fur)") | No | `''` |
| Concentration | Checkbox | No | `false` |
| Ritual | Checkbox | No | `false` |
| Classes | Toggle chips (all 8 from `SPELL_CLASSES`) | No | `[]` |
| Description | Textarea | No | `''` |
| At Higher Levels | Textarea | No | `''` |
| GM Notes | Textarea | No | `''` |

### Layout

Compact single-column form wrapped in `<SlideUp>`:
1. Header row: title ("Create Custom Spell" / "Edit Spell") + Cancel button
2. Name + Level + School row (flex)
3. Casting Time / Range / Duration / Components (2×2 grid)
4. Concentration + Ritual checkboxes (inline)
5. Classes toggle chips (all 8 shown as clickable pills)
6. Description textarea
7. At Higher Levels textarea
8. GM Notes textarea
9. Submit button ("Create Spell" / "Save Spell")

### Edit Mode Pre-fill

When `spell` prop is provided:
- All top-level fields pre-filled from spell columns
- `desc` and `higher_level` extracted from `spell.spell_data` (with null-safe fallback to `''`)

## SpellbookPage Integration

### Library Toolbar

Add "Create Spell" button next to "Import All SRD":

```
[Filter input] [Source dropdown] [Select] [Create Spell] [Import All SRD]
```

### State Management

Two new state variables in `SpellLibrary`:
- `showCreateForm: boolean` — toggled by "Create Spell" button
- `editingSpell: Spell | null` — set by "Edit" button on homebrew spell cards

When either is truthy, render `<SpellCreateForm>` in place of the library (same pattern as `MonsterLibrary`).

### SpellCard Edit Button

Add "Edit" button to expanded SpellCard, visible only when `spell.source === 'homebrew'`:
- Appears next to the existing "Remove" button
- Calls `onEdit()` prop which sets `editingSpell` in the parent

### SpellCard Display Fix

Currently, the expanded SpellCard only renders details when `data` (spell_data cast as Open5eSpell) is present. Homebrew spells won't have a full Open5eSpell shape — they'll have `{ desc, higher_level }`.

Update the expanded view to handle homebrew spell_data:
- Read `desc` and `higher_level` from `spell_data` regardless of source
- Read casting_time, range, duration from top-level spell columns (already available)
- This means the mechanics grid uses `spell.casting_time` etc. instead of `data.casting_time`
- The description uses `(spell.spell_data as any)?.desc` with fallback
- Classes display uses `spell.classes.join(', ')` instead of `data.dnd_class`

## Display Compatibility

By storing `desc` and `higher_level` in `spell_data`, these existing consumers work with minimal or no changes:

| Consumer | Changes Needed |
|----------|---------------|
| SpellCard (expanded) | Read mechanics from top-level columns; read desc/higher_level from spell_data |
| SpellFullView (timeline) | Same approach — already reads some fields from spell columns |
| SpellPicker | No changes — only shows name, level, school, concentration |
| QuickReferenceDetail | Minor: read desc from spell_data |
| SpellPDF | Minor: read desc/higher_level from spell_data |

## Files Changed

| File | Change |
|------|--------|
| `src/features/spellbook/SpellCreateForm.tsx` | **New** — form component |
| `src/features/spellbook/useSpells.ts` | Add `useCreateSpell()` and `useUpdateSpell()` hooks |
| `src/features/spellbook/SpellbookPage.tsx` | Add create button, edit button, form state management, fix SpellCard display for homebrew |
