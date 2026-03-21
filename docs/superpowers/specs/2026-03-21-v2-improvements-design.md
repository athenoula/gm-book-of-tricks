# V2 Book of Tricks — Improvements Design Spec

**Date:** 2026-03-21
**Status:** Draft

---

## Overview

Eight improvements to the GM Book of Tricks V2, ranging from a full generator overhaul to UI refinements. All changes build on the existing Vite+React+Supabase+TanStack architecture.

### Feature Summary

| # | Feature | Complexity |
|---|---------|-----------|
| 1 | Generator overhaul (compendium) | High |
| 2 | Edition-aware D&D data | Medium |
| 3 | Source book display | Low |
| 4 | Custom monster creation | Medium |
| 5 | Editable battles on timeline | Medium |
| 6 | Monster-to-NPC conversion | Low |
| 7 | Scratchpad to timeline | Low |
| 8 | Dropdown selectors for race/class | Low |

---

## 1. Generator Overhaul (Compendium)

### What changes

Replace the existing NPC generator (4 hardcoded archetypes in `npc-tables.ts`) and existing Encounter Generator (CR-based combat builder + random tables) with the full TTRPG Master Compendium content. The Loot Table Manager is retained as-is since it holds user-created content.

### Data structure

Static JSON files in the codebase (no database storage — this is curated reference content):

- `npc-archetypes.json` — 10 archetypes (Tavern Keeper, Blacksmith, Shopkeeper, Guard Captain, Alchemist, Mysterious Stranger, Noble, Urchin, Sage, Cultist), each with 4 columns (First Name, Last Name, Race, Quirk) × 20 rows
- `npc-races.json` — 9 races (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling), each with 3 columns (First Name, Last Name, Quirk) × 20 rows (race is predetermined)
- `encounter-tables.json` — 6 locations (Forest, City Streets, Dungeon, Road/Wilderness, Coastal/Sea, Mountain), each with 5 independent sub-tables (Who/What, Disposition, Complication, Reward, Consequence) × 20 rows

### UI layout

The Generators tab gets 3 sub-tabs:

1. **NPC by Archetype** — pick an archetype from a dropdown or card selector, see the 4-column d20 table, roll each column independently
2. **NPC by Race** — pick a race, see the 3-column d20 table, same roll mechanic
3. **Random Encounter** — pick a location, see 5 independent d20 sub-tables, roll each independently

### Roll mechanic

Reuse the existing d20 roll animation (rapid number cycling at 60ms intervals, 15 iterations, final result via `rollD20()`). Each column rolls independently. A "Roll All" button rolls every column simultaneously. Individual column headers are clickable to re-roll just that column.

### Result display

The rolled results assemble into a readable summary card at the top of the generator:

- **NPC example:** *"Bartholomew Stoutbelly, Human — Constantly polishing a tankard"* (Tavern Keeper)
- **Encounter example:** *"A territorial owlbear / Hostile / It's a trap! / A map to a hidden treasure / The party makes a powerful enemy"* (Forest)

### What gets removed

- `NPCGenerator.tsx` and `npc-tables.ts` (replaced by compendium archetypes + races)
- `EncounterGenerator.tsx` (replaced by compendium encounter tables)
- The Smart Builder tab and CR-based difficulty calculation logic

### What stays

- `LootTableManager.tsx` and `useLootTables.ts` (user-created content, not replaced)
- `rollD20()` and other dice utilities in `lib/dnd.ts`

---

## 2. Edition-Aware D&D Data

### Campaign setting

Use the existing `game_system` field on campaigns which already stores `'dnd5e-2014'` or `'dnd5e-2024'` (see `GAME_SYSTEMS` in `types.ts`). No schema change needed — just wire it into API queries. Set during campaign creation, editable in campaign settings.

### API filtering

Open5e's `document__slug` parameter handles edition filtering:

- `dnd5e-2014` → `document__slug=wotc-srd`
- `dnd5e-2024` → `document__slug=wotc-srd52`

The `searchSpells()` and `searchMonsters()` functions in `lib/open5e.ts` receive a new `edition` parameter. The campaign's edition is passed through automatically from the campaign context.

### "Include other edition" toggle

A checkbox on the SRD Search tab in both the Spellbook and Bestiary pages:

- Default: off (only show content matching campaign edition)
- When toggled on: drops the `document__slug` filter, showing both editions
- Results are tagged with their edition so they remain distinguishable

### Edition-aware dropdowns

Race and class dropdown options (see Feature 8) are also edition-aware, using separate arrays for 2014 vs 2024 content.

---

## 3. Source Book Display

### Data source

Open5e returns `document__title` and `document__slug` on both spells and monsters (e.g. "Systems Reference Document", "Tome of Beasts").

### Storage

Add a `source_book` text field to the `spells` and `monsters` tables. Populated automatically when importing from Open5e. Homebrew entries get `source_book: 'Homebrew'`.

### Display

A small muted pill/badge on spell and monster cards, next to existing metadata (level, school, CR, etc.). Examples: `SRD`, `Tome of Beasts`, `Homebrew`.

### Filtering

Optional filter-by-source-book dropdown on the spellbook and bestiary list views, alongside the existing search.

---

## 4. Custom Monster Creation

### Form layout

Modeled after the standard D&D stat block format:

- **Header:** Name, Size (dropdown), Type (dropdown: beast, fiend, undead, etc.), Alignment, CR
- **Core stats:** AC, HP, Hit Dice, Speed (walk, fly, swim, burrow, climb)
- **Ability scores:** STR, DEX, CON, INT, WIS, CHA — six number inputs
- **Proficiencies:** Saving throws, skills (multi-select dropdowns)
- **Traits:** Damage resistances/immunities/vulnerabilities, condition immunities, senses, languages
- **Abilities:** Repeatable name + description fields (e.g. "Pack Tactics", "Keen Smell")
- **Actions:** Repeatable name + description fields (e.g. "Multiattack", "Bite")
- **Legendary/Lair actions:** Optional section, same repeatable name + description pattern

### Storage

Saves to the existing `monsters` table with `source: 'homebrew'`, `source_book: 'Homebrew'`. The full form data goes into the `stat_block` JSONB field using the same structure as Open5e imports, so existing display components work without modification.

### Entry point

A "Create Monster" button on the Bestiary page's Library tab, alongside the existing monster list. Clicking it opens the creation form as a full-page view or large modal.

### Editing

Homebrew monsters are fully editable. SRD imports are read-only (users can duplicate an SRD monster as homebrew to modify it).

---

## 5. Editable Battles on Timeline

### Current state

Battle blocks on the timeline store a `content_snapshot` (JSONB) of the battle at the time it was added. They are display-only.

### New behavior

Battle timeline blocks link to a real `battles` row via `source_id`. Clicking "Edit Battle" expands the block and loads the full initiative tracker component inline with that battle's live data.

### Flow

1. Battle block has a `source_id` pointing to a `battles` row
2. Clicking "Edit Battle" expands the block and loads the initiative tracker with the battle's live data
3. Full functionality: add/remove combatants, set HP/AC/initiative, roll initiative, run combat rounds, track conditions
4. Changes persist to the `battles` table in real time (same as existing initiative tracker)
5. The timeline block's `content_snapshot` updates when the battle is saved/collapsed, keeping the card display current

### Creating battles from timeline

An "Add Battle" option in the timeline creates a new empty `battles` row and immediately opens the initiative tracker inline so participants can be added.

---

## 6. Monster-to-NPC Conversion

### Interaction

A "Make NPC" button on monster cards (both SRD and homebrew).

### Flow

1. Click "Make NPC" on a monster card
2. A quick form opens with fields: Name, Personality, Notes
3. On save, creates an NPC entry in the `npcs` table with the monster's stat block attached (copied into NPC's `stats` JSONB or stored as a reference)
4. The NPC appears in the Characters page alongside regular NPCs, with a badge indicating it has a full stat block

### Data model

NPCs can optionally have a full monster stat block in addition to their existing lightweight `stats` field (hp, ac, ability scores). The existing `stats` field remains unchanged for simple NPCs. A new optional `stat_block` JSONB field is added to the `npcs` table for monster-converted NPCs, using the same structure as the `monsters` table's `stat_block`. When both exist, `stat_block` takes precedence for combat display; `stats` is ignored if `stat_block` is present. This avoids migration of existing NPC data.

---

## 7. Scratchpad to Timeline

### Entry point

An "Inspiration" tab is added to the Content Drawer (the right sidebar used to add content to the timeline). This tab appears alongside the existing Monsters, NPCs, Spells, and Locations tabs.

### Interaction

When viewing the Content Drawer from within a session, scratchpad items for the campaign appear in the Inspiration tab. Clicking one copies it to the timeline.

### What happens on copy

- Creates a new timeline block with `block_type: 'note'`
- Snapshots the inspiration item's title, content, type, tags, and media_url into `content_snapshot`
- The original inspiration item stays untouched in the scratchpad
- The new block appears at the end of the timeline (or within the active scene if scenes are in use)

---

## 8. Dropdown Selectors for Race/Class

### Where

PC creation form and NPC creation form. Replace free-text inputs for race and class with dropdown selects.

### Data — edition-aware arrays

**2014 races:** Human, Elf, Dwarf, Halfling, Gnome, Half-Elf, Half-Orc, Tiefling, Dragonborn, + "Other (custom)"

**2024 races:** Human, Elf, Dwarf, Halfling, Gnome, Tiefling, Dragonborn, Orc, Aasimar, Goliath, Ardling, + "Other (custom)"

**Classes (both editions):** Fighter, Wizard, Rogue, Cleric, Bard, Barbarian, Druid, Monk, Paladin, Ranger, Sorcerer, Warlock, Artificer, + "Other (custom)"

### "Other (custom)" behavior

Selecting "Other (custom)" reveals a free-text input, so users are never locked out of using homebrew races or classes.

### NPC forms

Same dropdowns, but class is optional (many NPCs don't have a class).

---

## Files Affected

### New files

- `lib/data/npc-archetypes.json` — compendium archetype data
- `lib/data/npc-races.json` — compendium race-specific NPC data
- `lib/data/encounter-tables.json` — compendium encounter data
- `lib/data/editions.ts` — edition-aware race/class arrays, edition constants
- `features/generators/CompendiumNPCGenerator.tsx` — archetype + race NPC generator
- `features/generators/CompendiumEncounterGenerator.tsx` — location-based encounter generator
- `features/bestiary/MonsterCreateForm.tsx` — homebrew monster creation form

### Modified files

- `lib/open5e.ts` — add `edition` parameter to search functions, `document__slug` filtering
- `lib/types.ts` — update `game_system` type, add `source_book` to spell/monster types, add optional `stat_block` to NPC type
- `features/campaigns/CreateCampaignDialog.tsx` — edition picker
- `features/spellbook/SpellbookPage.tsx` — "include other edition" toggle, source book badge/filter
- `features/bestiary/BestiaryPage.tsx` — "include other edition" toggle, source book badge/filter, create monster entry point
- `features/characters/CharactersPage.tsx` — race/class dropdowns, monster-NPC badge display
- `features/characters/PCSheet.tsx` — race/class dropdowns
- `features/characters/useCharacters.ts` — support `stat_block` on NPCs
- `features/generators/` — remove old generator files, add new compendium generators
- `features/timeline/SessionTimeline.tsx` — editable battle blocks with inline initiative tracker
- `features/timeline/useTimelineBlocks.ts` — battle block ↔ battles table linking
- `features/timeline/ContentDrawer.tsx` — add Inspiration tab
- `features/bestiary/useMonsters.ts` — monster-to-NPC conversion mutation
- `features/initiative/InitiativeTracker.tsx` — support inline embedding from timeline context

### Removed files

- `features/generators/NPCGenerator.tsx`
- `features/generators/npc-tables.ts`
- `features/generators/EncounterGenerator.tsx`

### Database changes

- `spells` table: add `source_book` text column
- `monsters` table: add `source_book` text column
- `npcs` table: add optional `stat_block` JSONB column
- `campaigns` table: no change needed — `game_system` already uses `'dnd5e-2014' | 'dnd5e-2024' | 'pf2e' | 'pf1e' | 'other'`
