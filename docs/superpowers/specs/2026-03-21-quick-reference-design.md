# Quick Reference Lookup

## Overview

A Cmd+J overlay that lets the GM search and read campaign content (spells, monsters, abilities, NPCs, PCs, locations) without leaving the current page. Includes a split-pane layout with search results on the left and a condensed detail view on the right, with the option to expand to full details, add items to the session timeline, save to campaign libraries, or assign abilities to characters.

This is enhancement #2 of three planned improvements. It builds on the existing command palette infrastructure but serves a different purpose: Cmd+K navigates, Cmd+J reads.

## Goals

- Instant access to campaign content during live play without page navigation
- Condensed-first detail views with expand option for full information
- Contextual action buttons per content type (timeline, library, character assignment)
- Searchable abilities/features system with SRD import and homebrew support
- Keyboard-driven interaction (arrow keys, enter, escape)

## Non-Goals

- Replacing the existing Cmd+K command palette (they coexist)
- Collaborative/player-facing reference lookup
- Offline/cached content (always queries Supabase)
- AI-powered search or natural language queries

## Data Model

### New table: `abilities`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| campaign_id | uuid | FK to campaigns |
| name | text | e.g., "Rage", "Darkvision", "Sneak Attack" |
| description | text | Full description of the ability |
| usage_type | text | `action` / `bonus_action` / `reaction` / `passive` / `other` |
| source | text | `srd` / `homebrew` |
| srd_slug | text | Dedup key for SRD imports (nullable) |
| ability_data | jsonb | Full SRD data blob (nullable, for imported abilities) |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS: `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`

### New junction table: `character_abilities`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| ability_id | uuid | FK to abilities |
| character_id | uuid | FK to player_characters |
| campaign_id | uuid | FK to campaigns (for RLS) |
| notes | text | Optional per-character notes (e.g., "3/day, recharges on long rest") |

RLS: Same pattern — `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`

### SRD Import

Pull class features and racial traits from Open5e API (`/v1/classes/` and `/v1/races/` endpoints). Dedup by `srd_slug`, same pattern as spell and monster imports.

## Component Architecture

### New files

| File | Responsibility |
|------|----------------|
| `app/src/features/quick-reference/QuickReference.tsx` | Overlay component — search bar, split pane layout, footer, keyboard navigation |
| `app/src/features/quick-reference/QuickReferenceDetail.tsx` | Right-side detail pane — renders condensed/expanded views per content type, action buttons |
| `app/src/features/quick-reference/useQuickReferenceSearch.ts` | Search hook — debounced multi-table search including abilities, fetches full details on selection |
| `app/src/features/quick-reference/useAbilities.ts` | CRUD hook for abilities and character_abilities tables |
| `app/src/lib/quick-reference.ts` | Zustand store — isOpen, open, close (same pattern as command-palette.ts) |

### Integration points

- `QuickReference` mounted in `App.tsx` alongside `CommandPalette` (both global overlays)
- `Cmd+J` keybinding registered in the same place as `Cmd+K`
- "Add to Timeline" reuses `useAddTimelineBlock` from existing timeline feature
- "Add to Spellbook/Bestiary" reuses existing mutation hooks (`useSpells`, `useMonsters`)
- Same animation components (`AnimatePresence`, `ScaleIn`, `motion`)
- Same design tokens and component patterns throughout

## Layout & Interaction

### Overlay structure

- Centered modal, ~800px wide
- Search bar at the top (magnifying glass icon, text input, ESC badge)
- Split pane below: left results list (~240px), right detail pane (remaining width)
- Footer with keyboard shortcut hints and Cmd+J badge
- Backdrop blur overlay (same as command palette)

### Interaction flow

1. `Cmd+J` → overlay opens, search input focused
2. Type to search → results appear on the left, grouped by type
3. Arrow keys or click to select a result → details appear on the right
4. Click expand button to see full details
5. Click action buttons (Add to Timeline, Add to Library, Add to Character, Go to Page)
6. `Esc` or click backdrop to close
7. Opening always starts with empty search, closing clears all state

### Keyboard shortcuts

- `↑/↓` — navigate results
- `Enter` — select result (shows details on right)
- `Esc` — close overlay

## Detail Views

Each content type has a condensed view (default) and an expanded view (toggled by expand button). All renderers live inside `QuickReferenceDetail.tsx`.

### Spell detail
- **Condensed:** Key stats bar (level, school, range, area, save, damage, components), description
- **Expanded:** + at higher levels, full spell_data content, casting time, duration

### Monster detail
- **Condensed:** AC, HP, speed, ability score row, key actions (first 2-3)
- **Expanded:** + all actions, legendary actions, saving throws, skills, immunities, senses, full stat_block

### Ability detail
- **Condensed:** Usage type badge (action/bonus action/reaction/passive), source badge (SRD/homebrew), description
- **Expanded:** + full ability_data content, related class/race info

### PC detail
- **Condensed:** Race, class, level, AC, HP, ability scores
- **Expanded:** + skills, saving throws, spells, features, personality traits

### NPC detail
- **Condensed:** Race, occupation, personality, appearance
- **Expanded:** + stats (if present), notes, linked locations

### Location detail
- **Condensed:** Type, description
- **Expanded:** + notes, linked NPCs with roles, image

## Action Buttons

Contextual per content type:

| Content Type | Actions |
|---|---|
| Spell | + Add to Timeline, + Add to Spellbook*, Go to Spellbook |
| Monster | + Add to Timeline, + Add to Bestiary*, Go to Bestiary |
| Ability | + Add to Timeline, + Add to Character**, Go to Characters |
| PC | + Add to Timeline, Go to Characters |
| NPC | + Add to Timeline, Go to Characters |
| Location | + Add to Timeline, Go to Locations |

\* Only shown for SRD-sourced items not already in the campaign library. After adding, button becomes disabled with checkmark: "In Spellbook" / "In Bestiary".

\** "Add to Character" flow:
1. Click button → dropdown of campaign PCs appears
2. Click a PC → creates `character_abilities` row
3. Toast: "Rage added to Thorin"
4. Dropdown closes, button remains available for assigning to more PCs

**"Add to Timeline":** Creates a timeline block with `content_snapshot` containing the condensed detail. Requires an active session (button disabled with tooltip if no session context).

## Search Behavior

- Same debounced approach as command palette (200ms debounce, minimum 2 characters)
- Searches 6 tables in parallel: `spells`, `monsters`, `player_characters`, `npcs`, `locations`, `abilities`
- Name-based `ilike` matching, limited to 5 results per group
- Results grouped by type with icons

### Result subtitles

- Spells: Level N · School
- Monsters: CR N · Size Type
- Abilities: Usage Type · Source Class/Race
- PCs: Race Class · Level N
- NPCs: Occupation
- Locations: Type

### Detail fetching

When a result is selected, the full record is fetched by ID if not already in the search response. For spells and monsters this means the `spell_data`/`stat_block` JSONB blob. Single Supabase query, fast by primary key.

## Styling

Matches the existing warm craft aesthetic:

- Overlay background: `bg-bg-base` with `border-border`, same as command palette
- Backdrop: `bg-bg-deep/60` with `backdrop-blur-sm`
- Selected result: amber left border (`border-primary`) + `primary-ghost` background
- Key stats bar: `bg-bg-raised` with `radius-md`
- Usage type badges: colored by type — action (primary), bonus action (success), reaction (warning), passive (info)
- Action buttons: primary amber for "Add to Timeline", secondary outline for others
- Animations: `ScaleIn` for the overlay, same as command palette

## Dependencies

No new npm packages. Uses existing:
- Zustand (store)
- TanStack Query (search hook)
- Supabase (queries)
- motion/react (animations)

New Supabase migration for `abilities` and `character_abilities` tables.
Open5e API calls for SRD ability imports (same pattern as existing spell/monster imports).
