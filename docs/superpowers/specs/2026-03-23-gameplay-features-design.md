# Gameplay Features Batch

## Overview

Six independent features to improve the live-play and character management experience:

1. **Remove Play mode** — simplify timeline to always show editing controls
2. **Active combatant glow** — amber pulse on the current turn in initiative tracker
3. **Pin timeline items** — pin any one item to the top of the timeline
4. **Dice roller drawer** — right-side panel with 3D physics dice
5. **Loot & inventory** — party treasure at campaign level, PC inventory on character sheets, SRD item import
6. **Character XP tracking** — XP with progress bar toward next 5e level

These are independent and can be built in any order, though removing Play mode first simplifies the others.

## 1. Remove Play Mode

### What changes
- Remove the Prep/Play toggle from `SessionTimeline.tsx`
- Remove `isPrep` state variable — everything behaves as if always in Prep mode
- Drag handles, edit buttons, add buttons, and delete buttons always visible
- `SceneBlock` and `TimelineBlockCard` no longer receive an `isPrep` prop
- Remove the auto-save-on-mode-switch useEffect in `SceneBlock`

### What stays
- Initiative tracker on session page is unaffected
- Content Drawer (Library sidebar) unchanged

This is purely removing code — no new features.

## 2. Active Combatant Glow

### What changes
- The combatant at `activeIndex` during active combat gets an amber glow effect
- CSS: `box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.15)` with a subtle pulse animation
- `@keyframes pulse-glow` that breathes between 40% and 20% opacity — noticeable but not distracting
- Uses existing `primary` color token
- Only applies during active combat (not before combat starts or after it ends)

### Files affected
- `CombatantRow` component (or equivalent) — add conditional glow class
- `index.css` — add `pulse-glow` keyframes

## 3. Pin Timeline Items

### What changes
- Any timeline item (scene or block) can be pinned via a pin icon in its header
- Only one item pinned at a time — pinning another unpins the previous
- Pinned item renders as a duplicate at the very top of the timeline with a "Pinned" label and pin icon
- Original item stays in its normal position
- Unpin by clicking the pin icon on either the top copy or the original

### State management
- Ephemeral UI state — does not persist across page loads
- `pinnedItemId` stored in local component state on `SessionTimeline` (or a small Zustand store)
- No database changes needed

### Files affected
- `SessionTimeline.tsx` — pin state, render pinned item at top
- `SceneBlock.tsx` — add pin button to header
- `TimelineBlockCard.tsx` — add pin button to header

## 4. Dice Roller Drawer

### What changes
- A dice icon button in the session page header (next to Initiative button) opens a right-side drawer
- Drawer is ~350px wide, slides in from the right
- Can stay open while interacting with the timeline

### Drawer contents
- Dice type selector: d4, d6, d8, d10, d12, d20, d100 with quantity pickers (+/- buttons)
- "Roll" button triggers 3D dice animation
- 3D canvas area showing dice tumbling with physics via `@3d-dice/dice-box`
- Results display: total sum + individual dice values
- Roll history: recent rolls visible in the drawer for reference

### Drawer behavior
- Close with X button or Esc
- Available on session pages only (button in session header)

### Dependencies
- New npm package: `@3d-dice/dice-box` — WebGL 3D dice with physics simulation

### Files
- `app/src/features/dice/DiceRoller.tsx` — drawer component with dice selection, 3D canvas, results
- `app/src/features/dice/useDiceRoller.ts` — state management (open/close, roll history)
- `app/src/features/sessions/SessionPage.tsx` — add dice button to header, mount drawer

## 5. Loot & Inventory

### Data model

**New table: `items`** (campaign item library)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| campaign_id | uuid | FK to campaigns |
| name | text | Item name |
| description | text | Item description (default '') |
| type | text | `weapon` / `armor` / `magic_item` / `equipment` / `consumable` / `other` |
| rarity | text | `common` / `uncommon` / `rare` / `very_rare` / `legendary` / `artifact` (nullable) |
| cost | text | e.g., "50 gp" (nullable) |
| stackable | boolean | Default false. True for potions, arrows, gold |
| source | text | `srd` / `homebrew` (default `homebrew`) |
| srd_slug | text | Dedup key for SRD imports (nullable) |
| item_data | jsonb | Full SRD data blob (nullable) |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS: `campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())`

**New table: `character_inventory`** (items on PCs)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| item_id | uuid | FK to items |
| character_id | uuid | FK to player_characters |
| campaign_id | uuid | FK to campaigns (for RLS) |
| quantity | integer | Default 1 |
| notes | text | e.g., "Attuned", "Broken" (nullable) |
| equipped | boolean | Default false |

RLS: Same campaign ownership pattern.

**New table: `party_treasure`** (campaign-level shared loot)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (default gen_random_uuid()) |
| item_id | uuid | FK to items (nullable — gold/currency entries may not reference an item) |
| campaign_id | uuid | FK to campaigns |
| name | text | Item name or "Gold Pieces" |
| quantity | integer | Default 1 |
| notes | text | Nullable |
| created_at | timestamptz | Default now() |

RLS: Same campaign ownership pattern.

### SRD import

Bulk import from Open5e into the `items` table:
- `/v1/magicitems/` — 1,618 magic items (name, type, desc, rarity, requires_attunement)
- `/v1/weapons/` — 68 weapons (name, cost, damage_dice, weapon_range, properties)
- `/v1/armor/` — 23 armor (name, cost, base_ac, plus_max)

Same dedup-by-slug pattern as spells/monsters.

### UI locations

**Campaign overview** — "Party Treasure" section after Plot Threads:
- List of shared items with quantity and notes
- "Add Item" button — search campaign item library + SRD
- Gold/currency tracker (quick add/subtract)
- Remove items or transfer to a PC

**PC sheet** — "Inventory" section:
- List of character's items with equipped toggle, quantity, and notes
- "Add Item" button — search campaign item library + SRD
- Stackable items show quantity with +/- controls
- Unique items show equipped checkbox

### Component architecture

| File | Responsibility |
|------|----------------|
| `app/src/features/inventory/useItems.ts` | CRUD hooks for items table + SRD bulk import |
| `app/src/features/inventory/useCharacterInventory.ts` | CRUD hooks for character_inventory |
| `app/src/features/inventory/usePartyTreasure.ts` | CRUD hooks for party_treasure |
| `app/src/features/inventory/ItemSearch.tsx` | Reusable item search component (campaign + SRD) |
| `app/src/features/inventory/PartyTreasure.tsx` | Campaign overview section |
| `app/src/features/inventory/CharacterInventory.tsx` | PC sheet section |

## 6. Character XP Tracking

### Data model

Add one column to `player_characters`:

| Column | Type | Description |
|--------|------|-------------|
| xp | integer | Current experience points (default 0) |

### 5e XP thresholds (static data)

Stored as a static array — no database or API needed:

| Level | XP | Level | XP |
|-------|----|-------|----|
| 2 | 300 | 12 | 100,000 |
| 3 | 900 | 13 | 120,000 |
| 4 | 2,700 | 14 | 140,000 |
| 5 | 6,500 | 15 | 165,000 |
| 6 | 14,000 | 16 | 195,000 |
| 7 | 23,000 | 17 | 225,000 |
| 8 | 34,000 | 18 | 265,000 |
| 9 | 48,000 | 19 | 305,000 |
| 10 | 64,000 | 20 | 355,000 |
| 11 | 85,000 | | |

### UI on PC sheet

- XP display with amber progress bar toward next level
- Text: "2,400 / 2,700 XP" (current / next threshold)
- "Add XP" button — click to input an amount, adds to current total
- Level-up detection: if XP crosses the threshold, progress bar fills completely with a golden glow. GM manually updates level.

### Files affected
- `app/src/lib/data/xp-thresholds.ts` — static XP table
- `app/src/lib/types.ts` — add `xp` to PlayerCharacter type
- `app/src/features/characters/PCSheet.tsx` — add XP section with progress bar and Add XP button
- `app/src/features/characters/useCharacters.ts` — add XP update mutation (or reuse existing update)

## Dependencies

### New npm packages
- `@3d-dice/dice-box` — 3D dice physics and rendering for the dice roller

### New Supabase migration
- Add `xp` column to `player_characters`
- Create `items`, `character_inventory`, `party_treasure` tables with RLS

### Open5e API
- `/v1/magicitems/`, `/v1/weapons/`, `/v1/armor/` for SRD item imports

## Implementation Order

1. Remove Play mode (simplifies everything else)
2. Active combatant glow (small CSS change)
3. Pin timeline items (UI state only)
4. Character XP tracking (small data model + UI)
5. Dice roller drawer (new component + npm dep)
6. Loot & inventory (largest — new tables, SRD import, two UI locations)
