# Timeline Inline Expansion — Design Spec

**Date:** 2026-03-29
**Status:** Draft

## Summary

Timeline block cards currently have two states: collapsed (title only) and compact (snapshot preview). This feature adds a third state — **expanded** — that shows the complete content of any library item (monster, NPC, location, handout, spell) inline on the timeline. Clicking the title cycles through all three states.

## Interaction Model

### Three-State Title Click Cycle

```
collapsed (▸) → compact (▾) → expanded (▼ amber) → collapsed (▸)
```

- **Collapsed:** Title bar only. Chevron points right (`▸`). Existing behaviour, persisted via `is_collapsed` in DB.
- **Compact:** Current snapshot preview. Chevron points down (`▾`). Existing behaviour.
- **Expanded:** Full content view. Filled chevron down (`▼`) in amber. New.

### State Storage

- **Collapsed ↔ Compact** toggle: persisted in DB via existing `is_collapsed` boolean (unchanged).
- **Expanded** state: local React state only (`expandedBlockIds: Set<string>` on `SessionTimeline` or `TimelineBlockCard`). Resets on page reload. This is intentional — expansion is a transient reference action, not a layout preference.

### Click Logic

The title `<button>` in `TimelineBlockCard` currently calls `toggleCollapse()`. New logic:

```
if collapsed       → set is_collapsed=false (go to compact)
if compact         → add to expandedBlockIds (go to expanded)
if expanded        → set is_collapsed=true, remove from expandedBlockIds (go to collapsed)
```

## Visual Treatment

### Expanded State Cues

When a block is in expanded state:
- **Border:** Card border changes to amber (`border-amber-500/40`) with subtle glow (`shadow-[0_0_12px_rgba(245,158,11,0.1)]`)
- **Header:** Background darkens slightly (`bg-bg-raised`)
- **Chevron:** Filled down arrow (`▼`) in amber instead of the outline chevron
- **Animation:** `motion.div` with `layout` prop for smooth height transition. Content fades in with `AnimatePresence`.

### Unchanged States

Collapsed and compact states remain visually identical to current implementation.

## Enriched Snapshots

When items are added to the timeline via `ContentDrawer`, the `content_snapshot` must include all data needed for the full expanded view. Currently some fields are omitted.

### What's Missing Per Type

**NPC** (current snapshot: `name, race, occupation, personality, appearance, notes, stats`):
- Add: `portrait_url`, `stat_block`

**PC-as-NPC** (current snapshot: `name, race, class, level, hp_current, hp_max, armor_class, speed, initiative_bonus, ability_scores, personality_traits, notes, player_name, is_pc`):
- Add: `portrait_url`, `subclass`, `background`, `alignment`, `proficiency_bonus`, `saving_throw_proficiencies`, `skill_proficiencies`, `equipment`, `class_features`, `traits`, `ideals`, `bonds`, `flaws`, `backstory`, `appearance`, `spellcasting_ability`

**Monster** (current snapshot: `name, size, type, alignment, challenge_rating, armor_class, hit_points, hit_dice, speed, stat_block`):
- Add: `armor_desc`, `notes`
- Note: `stat_block` already contains the full Open5e monster blob (saving throws, skills, damage immunities, senses, languages, special abilities, actions, legendary actions, lair actions, etc.), so the expanded view data is already present — just not rendered.

**Spell** (current snapshot: `name, level, school, casting_time, range, duration, concentration, ritual, components, spell_data`):
- Add: `classes`, `notes`
- Note: `spell_data` already contains the full Open5e spell blob (`desc`, `higher_level`, etc.), so expanded view data is already present — just not rendered.

**Location** (current snapshot: `name, type, description, notes`):
- Add: `image_url`, `map_url`

**Handout** (current snapshot: `template, content, style, seal`):
- Add: `image_url`
- Note: This is already nearly complete. The existing `HandoutPreview` component can render the full handout from these fields plus `image_url`.

### Backward Compatibility

Existing timeline blocks created before this change will have smaller snapshots. The expanded view components must handle missing fields gracefully — showing what's available and omitting sections that are `null`/`undefined`. No migration of existing data is needed.

## Expanded View Components

One new component per block type, rendered when the block is in expanded state. These replace the existing `*Snapshot` inline renderers.

### `MonsterFullView`

Renders the complete monster stat block in classic D&D style:
1. Type/alignment line (italic)
2. Red separator
3. AC (with armor description), HP (with hit dice), Speed (all movement types)
4. Red separator
5. Ability score grid (6 columns, score + modifier)
6. Red separator
7. Saving throws, skills, damage vulnerabilities/resistances/immunities, condition immunities, senses, languages, CR (all from `stat_block`)
8. Red separator
9. **Special Abilities** section — each with bold italic name + description
10. **Actions** section
11. **Reactions** section (if present)
12. **Legendary Actions** section (if present, with preamble text)
13. **Lair Actions** section (if present)
14. GM notes (from `notes` field, if present)

All data sourced from `content_snapshot.stat_block` (Open5e format) plus top-level snapshot fields.

### `NPCFullView`

1. Portrait (circular, via `PortraitFrame` if `portrait_url` exists) + name + race/occupation
2. Amber separator
3. Personality quote (italic, amber left border)
4. **Appearance** section
5. **Notes** section (full text, not truncated)
6. Amber separator
7. **Stats** section — ability score grid (if stats exist) + HP/AC/Speed
8. Full `stat_block` rendering (if NPC has a full stat block — same layout as monster)

For PCs rendered as NPCs (`is_pc: true`):
1. Portrait + name + race/class/subclass/level
2. Background, alignment
3. Personality traits, ideals, bonds, flaws
4. Appearance, backstory
5. Ability scores grid + saving throw proficiencies
6. Skill proficiencies
7. Equipment list
8. Class features, traits
9. Spellcasting ability (if present)
10. Notes

### `LocationFullView`

1. Image (if `image_url` exists, rendered as a banner/header image)
2. Name + type badge
3. Green separator
4. **Description** section (full text)
5. **Notes** section (full text)
6. Map link/image (if `map_url` exists)

### `HandoutFullView`

Renders the full handout template using the existing `HandoutPreview` component:
- Passes `template`, `content`, `style`, `seal`, `imageUrl` from snapshot
- Centered within the card
- Wax seal rendered in position (not draggable in timeline context — read-only)

### `SpellFullView`

1. Level/school line (italic, blue)
2. Blue separator
3. Casting time, range, components, duration (2-column grid)
4. Blue separator
5. Full description text (from `spell_data.desc`)
6. **At Higher Levels** section (from `spell_data.higher_level`, if present)
7. Blue separator
8. Classes list
9. GM notes (if present)

## Component Architecture

```
TimelineBlockCard
├── Header (title click → cycle state)
├── if compact:
│   ├── MonsterSnapshot (existing)
│   ├── NPCSnapshot (existing)
│   ├── SpellSnapshot (existing)
│   ├── LocationSnapshot (existing)
│   └── HandoutSnapshot (existing)
└── if expanded:
    ├── MonsterFullView (new)
    ├── NPCFullView (new)
    ├── SpellFullView (new)
    ├── LocationFullView (new)
    └── HandoutFullView (new)
```

The existing snapshot components remain unchanged for the compact state. The new `*FullView` components are only rendered when expanded.

## File Structure

New files:
- `app/src/features/timeline/full-views/MonsterFullView.tsx`
- `app/src/features/timeline/full-views/NPCFullView.tsx`
- `app/src/features/timeline/full-views/SpellFullView.tsx`
- `app/src/features/timeline/full-views/LocationFullView.tsx`
- `app/src/features/timeline/full-views/HandoutFullView.tsx`

Modified files:
- `app/src/features/timeline/TimelineBlockCard.tsx` — three-state logic, expanded visual cues, render full-view components
- `app/src/features/timeline/ContentDrawer.tsx` — enrich snapshots with additional fields
- `app/src/features/timeline/SessionTimeline.tsx` — manage `expandedBlockIds` state, pass down to cards

## Scope Exclusions

- **No DB migration** — expanded state is local, snapshots are enriched at add-time only
- **No new routes or pages** — everything happens inline
- **No editing in expanded view** — this is read-only reference. Editing happens in the library pages.
- **Battle and scene blocks** — these already have their own inline edit/expand patterns (InlineBattle, SceneEditor). Not changed.
- **Note blocks** — already have inline editing. Not changed.
- **Inspiration blocks** — stored as `note` type, not changed.
