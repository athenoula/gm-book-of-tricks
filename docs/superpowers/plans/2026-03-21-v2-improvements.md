# V2 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 improvements to the GM Book of Tricks: compendium generator overhaul, edition-aware D&D data, source book display, custom monster creation, editable timeline battles, monster-to-NPC conversion, scratchpad-to-timeline, and race/class dropdowns.

**Architecture:** All features build on the existing Vite+React+Supabase+TanStack architecture. Static compendium data lives as JSON in the codebase. Edition filtering uses Open5e's `document__slug` parameter. New DB columns added via Supabase migrations. No new dependencies needed.

**Tech Stack:** React 19, TanStack Query/Router, Zustand, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS 4, motion/react, @hello-pangea/dnd

**Note:** This project has no test framework configured. Verification uses `npx tsc --noEmit` for type safety and `npx vite build` for build validation, plus manual browser testing.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/data/npc-archetypes.json` | 10 archetype tables (4 cols × 20 rows each) |
| `src/lib/data/npc-races.json` | 9 race-specific tables (3 cols × 20 rows each) |
| `src/lib/data/encounter-tables.json` | 6 location tables (5 sub-tables × 20 rows each) |
| `src/lib/data/editions.ts` | Edition constants, race/class arrays per edition, slug mapping |
| `src/features/generators/CompendiumNPCGenerator.tsx` | Archetype + race NPC generator with d20 roll animation |
| `src/features/generators/CompendiumEncounterGenerator.tsx` | Location-based encounter generator with 5 independent d20 tables |
| `src/features/bestiary/MonsterCreateForm.tsx` | Homebrew monster creation/edit form |
| `src/features/bestiary/MonsterToNPCDialog.tsx` | Quick dialog for converting monster to NPC |
| `supabase/migrations/XXXXXXXX_add_source_book_and_stat_block.sql` | DB migration |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `source_book` to Spell/Monster, add `stat_block` to NPC, add `InspirationItem` type |
| `src/lib/open5e.ts` | Add `edition` param to `searchSpells()` and `searchMonsters()` |
| `src/features/generators/GeneratorsPage.tsx` | Replace tabs with compendium generators |
| `src/features/spellbook/SpellbookPage.tsx` | Edition toggle, source book badge/filter |
| `src/features/spellbook/useSpells.ts` | Pass edition to SRD search |
| `src/features/bestiary/BestiaryPage.tsx` | Edition toggle, source book badge, create monster button, make NPC button |
| `src/features/bestiary/useMonsters.ts` | Pass edition to SRD search, add `useCreateMonster()`, `useMonsterToNPC()` |
| `src/features/characters/CharactersPage.tsx` | Race/class dropdowns, stat block badge on NPCs |
| `src/features/characters/PCSheet.tsx` | Race/class dropdowns in edit mode |
| `src/features/characters/useCharacters.ts` | Support `stat_block` on NPC create/update |
| `src/features/timeline/SessionTimeline.tsx` | Add battle creation from timeline |
| `src/features/timeline/TimelineBlockCard.tsx` | Editable battle blocks with inline tracker |
| `src/features/timeline/useTimelineBlocks.ts` | Battle block snapshot update mutation |
| `src/features/timeline/ContentDrawer.tsx` | Add Inspiration tab |
| `src/features/initiative/InitiativeTracker.tsx` | Support `inline` mode prop for timeline embedding |

### Removed Files
| File | Reason |
|------|--------|
| `src/features/generators/NPCGenerator.tsx` | Replaced by CompendiumNPCGenerator |
| `src/features/generators/npc-tables.ts` | Replaced by JSON data files |
| `src/features/generators/EncounterGenerator.tsx` | Replaced by CompendiumEncounterGenerator |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/XXXXXXXX_add_source_book_and_stat_block.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add source_book to spells and monsters
ALTER TABLE spells ADD COLUMN IF NOT EXISTS source_book text DEFAULT NULL;
ALTER TABLE monsters ADD COLUMN IF NOT EXISTS source_book text DEFAULT NULL;

-- Add stat_block to npcs (for monster-converted NPCs)
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS stat_block jsonb DEFAULT NULL;
```

Name the file with current timestamp format matching existing migrations in `supabase/migrations/`.

- [ ] **Step 2: Push the migration**

Run: `cd app && echo "Y" | npx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add source_book and stat_block columns"
```

---

## Task 2: Edition Constants & Type Updates

**Files:**
- Create: `src/lib/data/editions.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create editions.ts with edition-aware data**

File: `app/src/lib/data/editions.ts`

```typescript
export const EDITION_SLUGS: Record<string, string> = {
  'dnd5e-2014': 'wotc-srd',
  'dnd5e-2024': 'wotc-srd52',
}

export const RACES_2014 = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Half-Elf', 'Half-Orc', 'Tiefling', 'Dragonborn',
] as const

export const RACES_2024 = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome',
  'Tiefling', 'Dragonborn', 'Orc', 'Aasimar', 'Goliath', 'Ardling',
] as const

export const CLASSES = [
  'Fighter', 'Wizard', 'Rogue', 'Cleric', 'Bard', 'Barbarian',
  'Druid', 'Monk', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Artificer',
] as const

export function getRacesForEdition(gameSystem: string): readonly string[] {
  if (gameSystem === 'dnd5e-2024') return RACES_2024
  if (gameSystem === 'dnd5e-2014') return RACES_2014
  return [...new Set([...RACES_2014, ...RACES_2024])]
}

export function getEditionSlug(gameSystem: string): string | undefined {
  return EDITION_SLUGS[gameSystem]
}

export const MONSTER_SIZES = [
  'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan',
] as const

export const MONSTER_TYPES = [
  'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon',
  'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid',
  'Monstrosity', 'Ooze', 'Plant', 'Undead',
] as const

export const CHALLENGE_RATINGS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
] as const
```

- [ ] **Step 2: Update types.ts — add source_book to Spell and Monster, stat_block to NPC**

In `app/src/lib/types.ts`:

Add `source_book: string | null` to the `Spell` type (after `spell_data` field, around line 146).

Add `source_book: string | null` to the `Monster` type (after `stat_block` field, around line 127).

Add `stat_block: Record<string, unknown> | null` to the `NPC` type (after `stats` field, around line 102).

Also add `InspirationItem` type if not already in types.ts (it's currently only in `useInspiration.ts`):

```typescript
export type InspirationItem = {
  id: string
  user_id: string
  campaign_id: string | null
  title: string
  content: string | null
  type: 'text' | 'image' | 'link' | 'map'
  tags: string[]
  media_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/data/editions.ts app/src/lib/types.ts
git commit -m "feat: add edition constants and update types for source_book, stat_block"
```

---

## Task 3: Edition-Aware Open5e API

**Files:**
- Modify: `src/lib/open5e.ts`

- [ ] **Step 1: Add edition parameter to searchSpells()**

In `app/src/lib/open5e.ts`, update `searchSpells()` (line 64) to accept an optional `edition` parameter and add `document__slug` filtering:

```typescript
export async function searchSpells(params: {
  search?: string
  level?: number
  school?: string
  dnd_class?: string
  edition?: string      // NEW: 'dnd5e-2014' | 'dnd5e-2024'
  includeOtherEdition?: boolean  // NEW: if true, skip slug filter
} = {}): Promise<PaginatedResponse<Open5eSpell>> {
  const url = new URL(`${BASE_URL}/spells/`)
  if (params.search) url.searchParams.set('search', params.search)
  if (params.level !== undefined) url.searchParams.set('spell_level', String(params.level))
  if (params.school) url.searchParams.set('school', params.school)
  if (params.dnd_class) url.searchParams.set('dnd_class', params.dnd_class)

  // Edition filtering via document__slug
  if (params.edition && !params.includeOtherEdition) {
    const slug = EDITION_SLUGS[params.edition]
    if (slug) url.searchParams.set('document__slug', slug)
  }

  url.searchParams.set('limit', '100')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to search spells')
  return res.json()
}
```

Import `EDITION_SLUGS` from `@/lib/data/editions`.

- [ ] **Step 2: Add edition parameter to searchMonsters()**

Update `searchMonsters()` (line 102) similarly:

```typescript
export async function searchMonsters(params: {
  search?: string
  edition?: string
  includeOtherEdition?: boolean
} = {}): Promise<PaginatedResponse<Open5eMonster>> {
  const url = new URL(`${BASE_URL}/monsters/`)
  if (params.search) url.searchParams.set('search', params.search)

  if (params.edition && !params.includeOtherEdition) {
    const slug = EDITION_SLUGS[params.edition]
    if (slug) url.searchParams.set('document__slug', slug)
  }

  url.searchParams.set('limit', '20')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to search monsters')
  return res.json()
}
```

- [ ] **Step 3: Add document_title to Open5eSpell and Open5eMonster interfaces**

Add these fields to both interfaces if not already present:
```typescript
document__title: string
document__slug: string
```

These are returned by the API and needed for source book display.

- [ ] **Step 4: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/open5e.ts
git commit -m "feat: add edition-aware filtering to Open5e API functions"
```

---

## Task 4: Compendium JSON Data Files

**Files:**
- Create: `src/lib/data/npc-archetypes.json`
- Create: `src/lib/data/npc-races.json`
- Create: `src/lib/data/encounter-tables.json`

- [ ] **Step 1: Create npc-archetypes.json**

File: `app/src/lib/data/npc-archetypes.json`

Convert all 10 archetypes from `ttrpg_master_compendium.md` Part One into this structure:

```json
[
  {
    "name": "The Tavern Keeper",
    "table": [
      { "firstName": "Bartholomew", "lastName": "Stoutbelly", "race": "Human", "quirk": "Constantly polishing a tankard" },
      { "firstName": "Elara", "lastName": "Firebrew", "race": "Dwarf", "quirk": "Has a booming, infectious laugh" }
    ]
  }
]
```

All 10 archetypes, each with exactly 20 rows, 4 columns (firstName, lastName, race, quirk).

Source: `/Users/athenoula/claude things/V2 book of tricks/ttrpg_master_compendium.md` lines 7–260, Part One.

- [ ] **Step 2: Create npc-races.json**

File: `app/src/lib/data/npc-races.json`

Convert all 9 races from `ttrpg_master_compendium.md` Part Two:

```json
[
  {
    "race": "Dwarf",
    "table": [
      { "firstName": "Thorin", "lastName": "Stonehammer", "quirk": "Obsessed with the quality of stonework" }
    ]
  }
]
```

All 9 races, each with exactly 20 rows, 3 columns (firstName, lastName, quirk).

Source: `ttrpg_master_compendium.md` lines 264–491, Part Two.

- [ ] **Step 3: Create encounter-tables.json**

File: `app/src/lib/data/encounter-tables.json`

Convert all 6 locations from `ttrpg_master_compendium.md` Part Three:

```json
[
  {
    "location": "Forest",
    "tables": {
      "whoWhat": ["A territorial owlbear", "A circle of dancing pixies", ...],
      "disposition": ["Hostile", "Friendly", "Fearful", ...],
      "complication": ["It's a trap!", ...],
      "reward": ["A pouch of gold coins.", ...],
      "consequence": ["The party makes a powerful new enemy.", ...]
    }
  }
]
```

Each location has 5 sub-tables, each with exactly 20 entries (indexed 0–19, corresponding to d20 rolls 1–20).

Source: `ttrpg_master_compendium.md` lines 496–end, Part Three.

- [ ] **Step 4: Verify JSON is valid**

Run: `cd app && node -e "JSON.parse(require('fs').readFileSync('src/lib/data/npc-archetypes.json', 'utf8')); console.log('archetypes OK')" && node -e "JSON.parse(require('fs').readFileSync('src/lib/data/npc-races.json', 'utf8')); console.log('races OK')" && node -e "JSON.parse(require('fs').readFileSync('src/lib/data/encounter-tables.json', 'utf8')); console.log('encounters OK')"`
Expected: All 3 files parse without error.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/data/*.json
git commit -m "feat: add compendium data files for NPC and encounter generators"
```

---

## Task 5: Compendium NPC Generator

**Files:**
- Create: `src/features/generators/CompendiumNPCGenerator.tsx`
- Modify: `src/features/generators/GeneratorsPage.tsx`

- [ ] **Step 1: Create CompendiumNPCGenerator component**

File: `app/src/features/generators/CompendiumNPCGenerator.tsx`

This component has two modes: "By Archetype" and "By Race", controlled by a tab toggle.

**Props:** `{ campaignId: string }`

**State:**
- `mode`: `'archetype' | 'race'`
- `selectedArchetype`: index into archetypes array, or null
- `selectedRace`: index into races array, or null
- `selections`: `Record<string, number | null>` — maps column key to rolled row index (0–19)
- `rollingColumn`: `string | null` — which column is currently animating
- `rollDisplay`: `number` — the currently displayed number during animation

**Data imports:**
```typescript
import archetypeData from '@/lib/data/npc-archetypes.json'
import raceData from '@/lib/data/npc-races.json'
import { rollD20 } from '@/lib/dnd'
import { useCreateNPC } from '@/features/characters/useCharacters'
```

**Roll animation function** — reuse pattern from existing `NPCGenerator.tsx` (lines 40–57):
```typescript
function animateRoll(column: string, onComplete: (value: number) => void) {
  setRollingColumn(column)
  let count = 0
  const interval = setInterval(() => {
    setRollDisplay(Math.floor(Math.random() * 20))
    count++
    if (count >= 15) {
      clearInterval(interval)
      const result = rollD20() - 1 // 0-indexed for array access
      setRollingColumn(null)
      onComplete(result)
    }
  }, 60)
}
```

**Layout:**
1. Mode toggle tabs: "By Archetype" | "By Race"
2. Selector: dropdown/cards for archetype or race selection
3. Result summary card at top (when all columns rolled)
4. D20 table with rollable column headers
5. "Roll All" button, "Roll Next" button, "Save as NPC" button
6. Highlighted row per column based on `selections`

**"Save as NPC" button:** Uses `useCreateNPC()` to save with:
```typescript
{
  campaign_id: campaignId,
  name: `${table[selections.firstName].firstName} ${table[selections.lastName].lastName}`,
  race: mode === 'archetype' ? table[selections.race].race : selectedRaceData.race,
  personality: table[selections.quirk].quirk,
}
```

Use `@/components/motion` for animations (`FadeIn`, `StaggerList`). Use `@/components/ui` for `Button`, `Input`. Follow the visual patterns from the existing codebase (warm craft theme, gold-foil headings where appropriate).

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/generators/CompendiumNPCGenerator.tsx
git commit -m "feat: add compendium NPC generator with archetype and race modes"
```

---

## Task 6: Compendium Encounter Generator

**Files:**
- Create: `src/features/generators/CompendiumEncounterGenerator.tsx`

- [ ] **Step 1: Create CompendiumEncounterGenerator component**

File: `app/src/features/generators/CompendiumEncounterGenerator.tsx`

**Props:** `{ campaignId: string }`

**State:**
- `selectedLocation`: index into encounter data array, or null
- `selections`: `Record<'whoWhat' | 'disposition' | 'complication' | 'reward' | 'consequence', number | null>`
- `rollingColumn`: key or null
- `rollDisplay`: number

**Data import:**
```typescript
import encounterData from '@/lib/data/encounter-tables.json'
import { rollD20 } from '@/lib/dnd'
```

**Layout:**
1. Location selector (dropdown or card grid for 6 locations)
2. Result summary card at top (assembled encounter narrative)
3. 5 independent d20 sub-tables displayed as columns or stacked cards
4. Each sub-table header is clickable to re-roll just that table
5. "Roll All" button rolls all 5 simultaneously (staggered animation)

**Sub-table display:** Each of the 5 tables (Who/What, Disposition, Complication, Reward, Consequence) shows as a card with:
- Header label (clickable to re-roll)
- 20 rows with d20 numbers (1–20)
- Highlighted row for the rolled result
- Rolling animation on the active table

**Result summary format:**
```
Who/What: A territorial owlbear
Disposition: Hostile
Complication: It's a trap!
Reward: A map to a hidden treasure
Consequence: The party makes a powerful new enemy
```

Display as a styled narrative card with each element on its own line, labeled.

- [ ] **Step 2: Verify types compile**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/generators/CompendiumEncounterGenerator.tsx
git commit -m "feat: add compendium encounter generator with 6 locations and 5 sub-tables"
```

---

## Task 7: Wire Up Generators Page & Remove Old Files

**Files:**
- Modify: `src/features/generators/GeneratorsPage.tsx`
- Remove: `src/features/generators/NPCGenerator.tsx`
- Remove: `src/features/generators/npc-tables.ts`
- Remove: `src/features/generators/EncounterGenerator.tsx`

- [ ] **Step 1: Update GeneratorsPage.tsx**

Replace the current 3-tab layout (`'npc' | 'encounter' | 'loot'`) with new tabs:

```typescript
import { CompendiumNPCGenerator } from './CompendiumNPCGenerator'
import { CompendiumEncounterGenerator } from './CompendiumEncounterGenerator'
import { LootTableManager } from './LootTableManager'

type Tab = 'npc' | 'encounter' | 'loot'
```

Replace the `<NPCGenerator>` render with `<CompendiumNPCGenerator>` and `<EncounterGenerator>` with `<CompendiumEncounterGenerator>`. Keep `<LootTableManager>` as-is.

Update tab labels:
- "NPC Generator" (was same)
- "Encounter Generator" (was same)
- "Loot Tables" (was same)

- [ ] **Step 2: Delete old generator files**

Remove:
- `app/src/features/generators/NPCGenerator.tsx`
- `app/src/features/generators/npc-tables.ts`
- `app/src/features/generators/EncounterGenerator.tsx`

- [ ] **Step 3: Verify build**

Run: `cd app && npx tsc --noEmit && npx vite build`
Expected: Clean compile and build.

- [ ] **Step 4: Commit**

```bash
git add -A app/src/features/generators/
git commit -m "feat: replace old generators with compendium NPC and encounter generators"
```

---

## Task 8: Source Book Display & Edition Toggle on Spellbook

**Files:**
- Modify: `src/features/spellbook/useSpells.ts`
- Modify: `src/features/spellbook/SpellbookPage.tsx`

- [ ] **Step 1: Update useSpells.ts to pass edition**

In `useSearchSrdSpells()` (line 24), add `edition` and `includeOtherEdition` to the params passed to `searchSpells()`. The hook should accept these as parameters:

```typescript
export function useSearchSrdSpells(params: {
  search: string
  level?: number
  school?: string
  dnd_class?: string
  edition?: string
  includeOtherEdition?: boolean
}) {
  return useQuery({
    queryKey: ['srd-spells', params],
    queryFn: () => searchSpells(params),
    enabled: params.search.length > 0,
  })
}
```

Also update `spellFromSrd()` (line 40) to capture `source_book`:
```typescript
source_book: spell.document__title || null,
```

And update `useBulkImportSpells()` similarly.

- [ ] **Step 2: Update SpellbookPage.tsx — edition toggle and source book badge**

In `SrdSpellSearch` component (line 174):
- Add state: `const [includeOtherEdition, setIncludeOtherEdition] = useState(false)`
- Need `campaignId` to look up the campaign's `game_system`. Use the campaign from route params or pass it as a prop.
- Pass `edition` and `includeOtherEdition` to `useSearchSrdSpells()`
- Add a checkbox toggle above the search results: "Include other edition"

In `SpellCard` component (line 123):
- Display `spell.source_book` as a muted pill badge if present:
```tsx
{spell.source_book && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700/50 text-stone-400">
    {spell.source_book === 'Systems Reference Document' ? 'SRD' : spell.source_book}
  </span>
)}
```

In `SpellLibrary` component (line 41):
- Add optional source book filter dropdown above the spell list.

- [ ] **Step 3: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/spellbook/
git commit -m "feat: add edition toggle and source book display to spellbook"
```

---

## Task 9: Source Book Display & Edition Toggle on Bestiary

**Files:**
- Modify: `src/features/bestiary/useMonsters.ts`
- Modify: `src/features/bestiary/BestiaryPage.tsx`

- [ ] **Step 1: Update useMonsters.ts to pass edition**

Update `useSearchSrdMonsters()` (line 23) to accept `edition` and `includeOtherEdition`:

```typescript
export function useSearchSrdMonsters(params: {
  search: string
  edition?: string
  includeOtherEdition?: boolean
}) {
  return useQuery({
    queryKey: ['srd-monsters', params],
    queryFn: () => searchMonsters(params),
    enabled: params.search.length > 0,
  })
}
```

Update `useSaveMonster()` (line 32) to capture `source_book` from the Open5e data:
```typescript
source_book: monsterData.document__title || null,
```

- [ ] **Step 2: Update BestiaryPage.tsx — edition toggle and source book badge**

In `SrdMonsterSearch` (line 178):
- Add `includeOtherEdition` state and checkbox toggle
- Pass edition from campaign to `useSearchSrdMonsters()`

In `MonsterCard` (line 84):
- Display `monster.source_book` as a muted pill badge in the header area

In `MonsterLibrary` (line 41):
- Add optional source book filter dropdown

- [ ] **Step 3: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/bestiary/
git commit -m "feat: add edition toggle and source book display to bestiary"
```

---

## Task 10: Race/Class Dropdowns

**Files:**
- Modify: `src/features/characters/CharactersPage.tsx`
- Modify: `src/features/characters/PCSheet.tsx`

- [ ] **Step 1: Update PCCreateForm in CharactersPage.tsx**

In `PCCreateForm` (line 84), replace the free-text `race` and `class` inputs with dropdown selects.

Import edition data:
```typescript
import { getRacesForEdition, CLASSES } from '@/lib/data/editions'
```

The component needs access to the campaign's `game_system` to get edition-specific races. Pass this as a prop or fetch the campaign.

Replace race input (around line 100):
```tsx
<select
  value={race}
  onChange={e => setRace(e.target.value)}
  className="..." // match existing input styling
>
  <option value="">Select race...</option>
  {getRacesForEdition(gameSystem).map(r => (
    <option key={r} value={r}>{r}</option>
  ))}
  <option value="other">Other (custom)</option>
</select>
{race === 'other' && (
  <input
    type="text"
    value={customRace}
    onChange={e => setCustomRace(e.target.value)}
    placeholder="Enter custom race..."
    className="..."
  />
)}
```

Same pattern for class with `CLASSES` array. Add `customRace` and `customClass` state variables.

On submit, use `race === 'other' ? customRace : race` (same for class).

- [ ] **Step 2: Update NPCForm in CharactersPage.tsx**

In `NPCForm` (line 216), replace the free-text `race` input with same dropdown pattern. Class is optional for NPCs — add a class dropdown but keep it non-required.

- [ ] **Step 3: Update PCSheet.tsx edit mode**

In `PCSheet.tsx`, find the edit mode inputs for race and class and replace with the same dropdown + "Other (custom)" pattern.

- [ ] **Step 4: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/characters/
git commit -m "feat: add edition-aware race/class dropdowns to character forms"
```

---

## Task 11: Custom Monster Creation

**Files:**
- Create: `src/features/bestiary/MonsterCreateForm.tsx`
- Modify: `src/features/bestiary/useMonsters.ts`
- Modify: `src/features/bestiary/BestiaryPage.tsx`

- [ ] **Step 1: Add useCreateMonster hook to useMonsters.ts**

Add after existing hooks:

```typescript
export function useCreateMonster() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      size: string | null
      type: string | null
      alignment: string | null
      armor_class: number | null
      hit_points: number | null
      hit_dice: string | null
      challenge_rating: string | null
      speed: Record<string, string> | null
      stat_block: Record<string, unknown>
      source_book: string
    }) => {
      const { data, error } = await supabase
        .from('monsters')
        .insert({
          ...input,
          source: 'homebrew' as const,
          srd_slug: null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monsters', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Monster created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to create monster')
    },
  })
}
```

Also add `useUpdateMonster()` for editing homebrew monsters — same pattern but uses `.update()` instead of `.insert()`.

- [ ] **Step 2: Create MonsterCreateForm component**

File: `app/src/features/bestiary/MonsterCreateForm.tsx`

**Props:** `{ campaignId: string; monster?: Monster; onClose: () => void }`

When `monster` is provided, it's edit mode (pre-fill form). Otherwise, create mode.

**Form sections** (modeled on D&D stat block layout):

1. **Header section:** Name (text), Size (dropdown from `MONSTER_SIZES`), Type (dropdown from `MONSTER_TYPES`), Alignment (text), CR (dropdown from `CHALLENGE_RATINGS`)

2. **Defense section:** AC (number), HP (number), Hit Dice (text, e.g. "4d10+8"), Speed fields (walk, fly, swim, burrow, climb — each a text input like "30 ft.")

3. **Ability scores section:** 6 number inputs in a row (STR, DEX, CON, INT, WIS, CHA)

4. **Proficiencies section:** Saving throws (multi-select checkboxes for 6 abilities), Skills (text input, comma-separated)

5. **Traits section:** Damage resistances, immunities, vulnerabilities, condition immunities, senses, languages — all text inputs

6. **Abilities section:** Repeatable name + description fields. "Add Ability" button appends a new empty pair. Each pair has a remove button.

7. **Actions section:** Same repeatable pattern as abilities. "Add Action" button.

8. **Legendary Actions section:** Optional, collapsed by default. Same repeatable pattern.

**State:** Use a single `formState` object or individual `useState` calls per field. For repeatable sections, use arrays of `{ name: string, desc: string }`.

**On submit:** Build the `stat_block` JSONB from form state to match Open5e structure:
```typescript
const statBlock = {
  strength: str, dexterity: dex, constitution: con,
  intelligence: int, wisdom: wis, charisma: cha,
  strength_save: ..., // only if proficient
  special_abilities: abilities.filter(a => a.name),
  actions: actions.filter(a => a.name),
  legendary_actions: legendaryActions.filter(a => a.name),
  damage_resistances: dmgResistances,
  damage_immunities: dmgImmunities,
  damage_vulnerabilities: dmgVulnerabilities,
  condition_immunities: conditionImmunities,
  senses: senses,
  languages: languages,
}
```

Call `useCreateMonster().mutate()` or `useUpdateMonster().mutate()` and call `onClose()` on success.

- [ ] **Step 3: Add "Create Monster" button to BestiaryPage.tsx**

In `MonsterLibrary` (line 41), add state `showCreateForm` and a button:
```tsx
<Button onClick={() => setShowCreateForm(true)}>
  <GameIcon icon={GiDragonHead} size="sm" /> Create Monster
</Button>
```

When `showCreateForm` is true, render `<MonsterCreateForm campaignId={campaignId} onClose={() => setShowCreateForm(false)} />`.

Also add edit functionality to `MonsterCard` for homebrew monsters:
```tsx
{monster.source === 'homebrew' && (
  <Button size="sm" onClick={() => setEditingMonster(monster)}>Edit</Button>
)}
```

- [ ] **Step 4: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/bestiary/
git commit -m "feat: add custom monster creation and editing for homebrew monsters"
```

---

## Task 12: Monster-to-NPC Conversion

**Files:**
- Create: `src/features/bestiary/MonsterToNPCDialog.tsx`
- Modify: `src/features/bestiary/useMonsters.ts`
- Modify: `src/features/bestiary/BestiaryPage.tsx`
- Modify: `src/features/characters/CharactersPage.tsx`

- [ ] **Step 1: Add useMonsterToNPC hook**

In `app/src/features/bestiary/useMonsters.ts`, add:

```typescript
export function useMonsterToNPC() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      race: string | null
      personality: string | null
      notes: string | null
      stat_block: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('npcs')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaign_id] })
      useToastStore.getState().addToast('success', `${data.name} added as NPC`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to create NPC')
    },
  })
}
```

- [ ] **Step 2: Create MonsterToNPCDialog component**

File: `app/src/features/bestiary/MonsterToNPCDialog.tsx`

**Props:** `{ monster: Monster; campaignId: string; onClose: () => void }`

**Layout:** A small dialog/modal with:
- Pre-filled monster name (editable — user might want to rename, e.g. "Bandit Captain" → "Red Mara")
- Monster type shown as read-only context
- Personality text input
- Notes textarea
- Save / Cancel buttons

**On save:** Call `useMonsterToNPC().mutate()` with the monster's full `stat_block` copied into the NPC, plus the entered name, personality, notes, and the monster's type as `race`.

- [ ] **Step 3: Add "Make NPC" button to MonsterCard in BestiaryPage.tsx**

In `MonsterCard` (line 84), add a "Make NPC" button in the card actions area:
```tsx
<Button size="sm" variant="ghost" onClick={() => setMakeNPCMonster(monster)}>
  <GameIcon icon={GiHoodedFigure} size="sm" /> Make NPC
</Button>
```

Add state at the `BestiaryPage` level: `const [makeNPCMonster, setMakeNPCMonster] = useState<Monster | null>(null)`

Render the dialog when `makeNPCMonster` is set:
```tsx
{makeNPCMonster && (
  <MonsterToNPCDialog
    monster={makeNPCMonster}
    campaignId={campaignId}
    onClose={() => setMakeNPCMonster(null)}
  />
)}
```

- [ ] **Step 4: Show stat block badge on monster-converted NPCs**

In `NPCCard` in `CharactersPage.tsx` (line 179), add a badge when the NPC has a `stat_block`:
```tsx
{npc.stat_block && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
    Has Stat Block
  </span>
)}
```

Optionally make the stat block expandable on the NPC card (show ability scores, actions, etc. using the same layout as `MonsterCard`).

- [ ] **Step 5: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/bestiary/ app/src/features/characters/CharactersPage.tsx
git commit -m "feat: add monster-to-NPC conversion with stat block preservation"
```

---

## Task 13: Scratchpad to Timeline (Content Drawer)

**Files:**
- Modify: `src/features/timeline/ContentDrawer.tsx`
- Modify: `src/features/scratchpad/useInspiration.ts` (if needed for type export)

- [ ] **Step 1: Add Inspiration tab to ContentDrawer**

In `app/src/features/timeline/ContentDrawer.tsx`:

Add `'inspiration'` to the tab type (line ~35):
```typescript
type Tab = 'characters' | 'monsters' | 'spells' | 'locations' | 'inspiration'
```

Add the tab button in the tab bar section.

Import the campaign inspiration hook:
```typescript
import { useCampaignInspiration } from '@/features/scratchpad/useInspiration'
```

Add `InspirationItems` sub-component:

```typescript
function InspirationItems({ campaignId, onAdd }: {
  campaignId: string
  onAdd: (block: { block_type: string; source_id?: string; title: string; content_snapshot: Record<string, unknown> }) => void
}) {
  const { data: items } = useCampaignInspiration(campaignId)

  const addInspiration = (item: InspirationItem) => {
    onAdd({
      block_type: 'note',
      source_id: item.id,
      title: item.title,
      content_snapshot: {
        title: item.title,
        content: item.content,
        type: item.type,
        tags: item.tags,
        media_url: item.media_url,
      },
    })
  }

  if (!items?.length) return <p className="text-stone-500 text-sm p-4">No inspiration items for this campaign.</p>

  return (
    <div className="space-y-1">
      {items.map(item => (
        <ItemRow
          key={item.id}
          icon={/* pick icon by item.type */}
          name={item.title}
          subtitle={item.type}
          onAdd={() => addInspiration(item)}
        />
      ))}
    </div>
  )
}
```

Add the tab content render:
```tsx
{tab === 'inspiration' && (
  <InspirationItems campaignId={campaignId} onAdd={onAddToTimeline} />
)}
```

- [ ] **Step 2: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/ContentDrawer.tsx
git commit -m "feat: add inspiration tab to content drawer for scratchpad-to-timeline"
```

---

## Task 14: Editable Battles on Timeline

**Files:**
- Modify: `src/features/initiative/InitiativeTracker.tsx`
- Modify: `src/features/timeline/TimelineBlockCard.tsx`
- Modify: `src/features/timeline/SessionTimeline.tsx`
- Modify: `src/features/timeline/useTimelineBlocks.ts`

- [ ] **Step 1: Add inline mode to InitiativeTracker**

In `app/src/features/initiative/InitiativeTracker.tsx`, add an `inline` prop:

```typescript
type Props = {
  campaignId: string
  sessionId: string
  onSaveToTimeline?: (data: unknown) => void
  inline?: boolean           // NEW
  battleId?: string          // NEW: load specific battle
  onSnapshotUpdate?: (snapshot: Record<string, unknown>) => void  // NEW: notify parent of changes
}
```

When `inline` is true:
- Don't render the save/load UI (the battle is already linked to timeline)
- Use a more compact layout (less padding, no outer card wrapper)
- Call `onSnapshotUpdate()` when combat state changes (combatants added/removed, HP changed, round advanced) so the parent timeline block can update its snapshot

- [ ] **Step 2: Add useUpdateTimelineBlockSnapshot mutation**

In `app/src/features/timeline/useTimelineBlocks.ts`, add a mutation for updating just the `content_snapshot`:

```typescript
export function useUpdateTimelineBlockSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ blockId, snapshot }: { blockId: string; snapshot: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('timeline_blocks')
        .update({ content_snapshot: snapshot })
        .eq('id', blockId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks'] })
    },
  })
}
```

- [ ] **Step 3: Update TimelineBlockCard for battle blocks**

In `app/src/features/timeline/TimelineBlockCard.tsx`, add special handling for `block_type === 'battle'`:

```typescript
const [editingBattle, setEditingBattle] = useState(false)
```

When the block is a battle and `isPrep` is true, show an "Edit Battle" button:
```tsx
{block.block_type === 'battle' && isPrep && (
  <Button size="sm" onClick={() => setEditingBattle(!editingBattle)}>
    {editingBattle ? 'Close' : 'Edit Battle'}
  </Button>
)}
```

When `editingBattle` is true, render the inline initiative tracker:
```tsx
{editingBattle && block.block_type === 'battle' && (
  <InitiativeTracker
    campaignId={block.campaign_id}
    sessionId={block.session_id}
    inline
    battleId={block.source_id}
    onSnapshotUpdate={(snapshot) => {
      updateSnapshot.mutate({ blockId: block.id, snapshot })
    }}
  />
)}
```

Also handle the case where `block.source_id` is null — the first edit should create a new battle via `useSaveBattle()` and link it to the timeline block.

- [ ] **Step 4: Add "Add Battle" to timeline creation**

In `SessionTimeline.tsx`, the content drawer's quick add for battles (line 74–88 of ContentDrawer.tsx) already exists. Ensure that when a battle block is added from the content drawer, it creates a `battles` row and sets `source_id`.

Update `handleAddToTimeline` to handle battle creation:
```typescript
if (content.block_type === 'battle' && !content.source_id) {
  // Create a new battle first
  const battle = await saveBattle.mutateAsync({
    campaign_id: campaignId,
    session_id: sessionId,
    name: content.title || 'New Battle',
    type: 'save_state',
    combatant_data: [],
  })
  content.source_id = battle.id
}
```

- [ ] **Step 5: Verify build**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/initiative/InitiativeTracker.tsx app/src/features/timeline/
git commit -m "feat: add editable battle blocks with inline initiative tracker on timeline"
```

---

## Task 15: Final Build Verification & Cleanup

**Files:** All modified files

- [ ] **Step 1: Full type check**

Run: `cd app && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Full build**

Run: `cd app && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Check for unused imports or dead code**

Verify that the removed files (`NPCGenerator.tsx`, `npc-tables.ts`, `EncounterGenerator.tsx`) are not imported anywhere else. Search for imports:

```bash
grep -r "NPCGenerator\|npc-tables\|EncounterGenerator" app/src/ --include="*.tsx" --include="*.ts"
```

Expected: No matches (only the new files should appear).

- [ ] **Step 4: Manual smoke test**

Start dev server: `cd app && npm run dev`

Test each feature in the browser:
1. Generators tab → NPC by Archetype → select archetype → roll → verify results
2. Generators tab → NPC by Race → select race → roll → verify results
3. Generators tab → Encounter → select location → roll all → verify narrative
4. Spellbook → SRD Search → verify edition toggle appears and filters work
5. Bestiary → SRD Search → verify edition toggle appears and filters work
6. Bestiary → Library → "Create Monster" → fill form → save → verify in list
7. Bestiary → Monster card → "Make NPC" → fill name/personality → save → check Characters page
8. Characters → Create PC → verify race/class dropdowns with "Other" option
9. Characters → Create NPC → verify race dropdown
10. Session → Timeline → Content Drawer → Inspiration tab → copy item → verify timeline block
11. Session → Timeline → Add Battle → Edit Battle → verify inline initiative tracker
12. Spell/Monster cards → verify source book badges

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup for V2 improvements"
```
