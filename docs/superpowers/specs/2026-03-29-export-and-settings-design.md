# Export & Settings Page Design Spec

**Date:** 2026-03-29
**Status:** Draft

## Overview

Two connected features:

1. **Data Export** — download all campaign content as markdown files in a ZIP, for data portability
2. **Settings Page** — a new account/settings page that houses the export controls alongside profile, appearance, and future account management

## Settings Page

### Access

- Gear icon pinned to the bottom of the sidebar (below campaign navigation)
- Navigates to `/settings` route
- Highlighted when active, same pattern as other sidebar items
- Protected route (requires auth)

### Layout

Stacked sections in a single scrollable column. Each section has a heading, description, and its controls. Sections separated by ornamental dividers.

### Sections

#### Profile

- **Change email** — input field showing current email, "Update" button. Uses `supabase.auth.updateUser({ email })`. Supabase sends a confirmation email to the new address.
- **Change password** — "Current password" and "New password" fields, "Update" button. Uses `supabase.auth.updateUser({ password })`. Requires re-authentication if session is stale (Supabase handles this).

#### Appearance

- **Theme toggle** — three-option selector: Light / Dark / System. Wires into existing `useTheme` Zustand store (`setPreference`). Current preference is pre-selected on load.

#### Data & Export

- **Export All Campaigns** — button that triggers a full export of every campaign into a single ZIP. Shows progress bar during export.
- **Per-campaign export list** — lists all campaigns with individual "Export" buttons. Each triggers a single-campaign ZIP download.
- **Progress indicator** — progress bar with current step label (e.g., "Exporting sessions...") and percentage. Driven by `useExportStore`.

#### Account (Future — not built in this pass)

- Placeholder section or omitted entirely. Will house delete account / danger zone later.

## Export Engine

### Architecture

Pure client-side. No backend/Edge Functions involved.

- **JSZip** library for ZIP creation in the browser
- **Direct Supabase queries** in a utility module (not React hooks, since this runs outside component lifecycle)
- **Zustand store** (`useExportStore`) for progress tracking
- **`URL.createObjectURL`** + programmatic `<a>` click for triggering download (no FileSaver.js dependency needed)

### Export Scope

#### Per-Campaign Export

Fetches all data for a single campaign and produces a ZIP named `{campaign-name}-export.zip` containing:

```
{campaign-name}/
├── campaign.md
├── sessions/
│   ├── session-01-{title-slug}.md
│   ├── session-02-{title-slug}.md
│   └── ...
├── characters/
│   └── {name-slug}.md
├── npcs/
│   └── {name-slug}.md
├── monsters/
│   └── {name-slug}.md
├── spells/
│   └── {name-slug}.md
├── items/
│   └── {name-slug}.md
├── locations/
│   └── {name-slug}.md
├── handouts/
│   └── {name-slug}.md
└── battles/
    └── {name-slug}.md
```

#### Export All

Runs per-campaign export for every campaign the user owns. Produces a single ZIP named `book-of-tricks-export.zip`:

```
book-of-tricks-export/
├── {campaign-1-name}/
│   ├── campaign.md
│   ├── sessions/
│   └── ...
├── {campaign-2-name}/
│   └── ...
└── ...
```

### Data Fetched Per Campaign

| Table | Query | Notes |
|-------|-------|-------|
| campaigns | Single row by ID | Metadata for campaign.md |
| sessions | All for campaign, ordered by session_number | Include recap |
| timeline_blocks | All for each session, ordered by sort_order | Embedded in session markdown |
| player_characters | All for campaign | With ability_scores, class_features, traits, equipment |
| pc_spells | Joined with spells table | For each PC's spell list |
| character_inventory | Joined with items table | For each PC's equipment |
| npcs | All for campaign | With stats, stat_block |
| npc_spells | Joined with spells table | For each NPC's spell list |
| monsters | All for campaign | With stat_block, source |
| spells | All for campaign | With spell_data, source |
| items | All for campaign | With type, rarity |
| locations | All for campaign | With parent_location_id for hierarchy |
| handouts | All for campaign | With template_type, content |
| battles | All for campaign | With combatant snapshots |

### Progress Tracking

Zustand store: `useExportStore`

```typescript
interface ExportStore {
  status: 'idle' | 'exporting' | 'done' | 'error'
  progress: number        // 0-100
  currentStep: string     // e.g., "Exporting sessions..."
  error: string | null
  startExport: () => void
  setProgress: (progress: number, step: string) => void
  finish: () => void
  fail: (error: string) => void
  reset: () => void
}
```

Progress updates at each data type boundary (e.g., after sessions complete, move to characters, etc.). For Export All, progress is per-campaign with a label like "Exporting The Dragon Campaign (2/5)".

### Markdown Format

Every file uses YAML frontmatter for structured data, followed by a readable markdown body.

#### campaign.md

```markdown
---
name: The Dragon Campaign
game_system: dnd5e
created: 2026-01-15
---

# The Dragon Campaign

## Description
A high-fantasy campaign set in...

## Summary
- **Sessions:** 12
- **PCs:** 4
- **NPCs:** 23
- **Locations:** 8
```

#### sessions/{number}-{slug}.md

```markdown
---
title: The Dragon's Lair
session_number: 3
date: 2026-02-10
status: completed
---

# Session 3: The Dragon's Lair

## Recap
The party ventured deep into...

## Timeline

### Scene: Entering the Cave
The air grows cold as...

### Battle: Dragon Ambush
**Combatants:**
- Young Red Dragon (HP: 178, AC: 18)
- Kobold Skirmisher x3 (HP: 12, AC: 13)

### Handout: Ancient Map
A weathered parchment revealing...

### Scene: The Hoard
Gold coins stretch as far as...
```

Timeline blocks are embedded in the session file, in sort order. Block types rendered with type-specific formatting:
- **scene** — heading + markdown content
- **battle** — heading + combatant list from snapshot
- **handout** — heading + content summary
- **monster/npc/spell/location** — heading + brief reference (name, key stats)

#### characters/{slug}.md

```markdown
---
name: Thorn Ironforge
class: Fighter
level: 5
race: Dwarf
player_name: Alex
---

# Thorn Ironforge
**Level 5 Dwarf Fighter** — played by Alex

## Ability Scores
| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| 18  | 12  | 16  | 10  | 14  | 8   |

## Equipment
- Greataxe +1
- Chain Mail

## Spells
_(none)_

## Class Features
- Second Wind
- Action Surge

## Traits
- Dwarven Resilience
```

#### npcs/{slug}.md

```markdown
---
name: Goblin King
source: homebrew
---

# Goblin King

## Description
A cunning ruler of the underground...

## Stats
- **AC:** 15
- **HP:** 45
- **Speed:** 30 ft.

## Spells
- Misty Step
- Hold Person
```

If `stat_block` JSON exists, render full stat block fields (abilities, actions, traits, etc.).

#### monsters/{slug}.md

```markdown
---
name: Young Red Dragon
source: srd
srd_slug: young-red-dragon
challenge_rating: 10
source_book: SRD 5.1
---

# Young Red Dragon
*Source: SRD 5.1*

## Stats
- **AC:** 18 (natural armor)
- **HP:** 178 (17d10 + 85)
- **Speed:** 40 ft., climb 40 ft., fly 80 ft.

## Actions
- **Multiattack:** The dragon makes three attacks...
- **Fire Breath (Recharge 5–6):** ...
```

Stat block rendered from `stat_block` JSON. For SRD monsters, include `source: srd` and `srd_slug` in frontmatter.

#### spells/{slug}.md

```markdown
---
name: Fireball
source: srd
level: 3
school: Evocation
classes: [Sorcerer, Wizard]
---

# Fireball
*3rd-level Evocation (SRD)*

**Casting Time:** 1 action
**Range:** 150 feet
**Components:** V, S, M (a tiny ball of bat guano and sulfur)
**Duration:** Instantaneous

A bright streak flashes from your pointing finger...
```

Spell details rendered from `spell_data` JSON when available, otherwise from column fields.

#### items/{slug}.md

```markdown
---
name: Sword of Flame
type: weapon
rarity: rare
source: homebrew
---

# Sword of Flame
*Rare Weapon (Homebrew)*

## Description
A longsword wreathed in magical fire...

## Properties
- **Type:** Weapon
- **Rarity:** Rare
- **Stackable:** No
```

#### locations/{slug}.md

```markdown
---
name: Ashen Mountains
parent: null
---

# Ashen Mountains

## Description
A volcanic mountain range to the north...

## Child Locations
- Dragon's Lair
- Dwarven Outpost
```

Parent and child locations referenced by name. Hierarchy is flattened into individual files but navigable via these references.

#### handouts/{slug}.md

```markdown
---
name: Wanted Poster
template: wanted_poster
---

# Wanted Poster

## Content
WANTED: Dead or Alive
The Goblin King — 500 gold reward...

## Seal
Royal Seal of Neverwinter
```

#### battles/{slug}.md

```markdown
---
name: Ambush at the Bridge
---

# Ambush at the Bridge

## Combatants
| Name | HP | AC | Initiative |
|------|----|----|-----------|
| Young Red Dragon | 178 | 18 | 15 |
| Kobold Skirmisher | 12 | 13 | 8 |
| Kobold Skirmisher | 12 | 13 | 6 |
```

### Slug Generation

File names use slugified entity names: lowercase, spaces to hyphens, strip special characters. Sessions prefixed with zero-padded session number (e.g., `01-the-dragons-lair.md`). Duplicate slugs get a numeric suffix (`goblin-2.md`).

## Per-Campaign Quick Export

Accessible from the campaign's "..." overflow menu on the campaign overview page. Selecting "Export Campaign" triggers the export directly (no navigation to settings).

Progress shown via toasts:
- Start: "Exporting {campaign name}..."
- Progress updates: toast updates with percentage
- Complete: "Export complete — {filename} downloaded"
- Error: "Export failed — {error message}"

## UI Components

### New Files

| File | Purpose |
|------|---------|
| `src/features/settings/SettingsPage.tsx` | Main settings page with stacked sections |
| `src/features/settings/ProfileSection.tsx` | Email/password change forms |
| `src/features/settings/AppearanceSection.tsx` | Theme toggle (light/dark/system) |
| `src/features/settings/DataExportSection.tsx` | Export All + per-campaign export list |
| `src/features/settings/useExportStore.ts` | Zustand store for export progress |
| `src/lib/export/campaign-exporter.ts` | Core export logic: fetch data, build markdown, create ZIP |
| `src/lib/export/markdown-formatters.ts` | Per-entity-type markdown formatting functions |
| `src/lib/export/slugify.ts` | Slug generation utility |

### Modified Files

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add gear icon at bottom, link to /settings |
| `src/routes/router.tsx` | Add /settings route |
| `src/features/campaigns/CampaignOverview.tsx` (or wherever "..." menu lives) | Add "Export Campaign" menu item |

### Dependencies

| Package | Purpose |
|---------|---------|
| `jszip` | ZIP file creation in browser |

No other new dependencies. `file-saver` is not needed — we can use `URL.createObjectURL` + programmatic `<a>` click, which is simpler and avoids an extra dependency.

## Design Notes

- Settings page uses the same Warm Craft aesthetic as the rest of the app — Cinzel headings, Crimson Pro body, amber accents, ornamental dividers between sections
- Export progress bar styled with amber fill on dark track
- Theme toggle uses a segmented control or chip-style selector (not a dropdown)
- Per-campaign list in Data & Export section shows campaign name, game system, and an export button per row
- All interactions use existing toast system for feedback
- No loading skeletons needed — settings page data is minimal (just campaigns list for export section)
