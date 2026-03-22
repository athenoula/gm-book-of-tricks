# Quick Reference Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cmd+J quick reference overlay that lets the GM search and read campaign content (spells, monsters, abilities, NPCs, PCs, locations) without leaving the current page, with contextual actions to add items to the timeline, campaign libraries, or character sheets.

**Architecture:** New `quick-reference` feature module with a split-pane overlay (search results left, detail pane right). New `abilities` and `character_abilities` database tables with SRD import support. Zustand store for overlay state, TanStack Query hooks for search and CRUD. Mounts in App.tsx alongside the existing CommandPalette.

**Tech Stack:** React 19, Zustand, TanStack Query, Supabase (PostgreSQL + RLS), Open5e API, motion/react, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-21-quick-reference-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/supabase/migrations/20260321140000_abilities.sql` | Create | Database tables: abilities, character_abilities, RLS policies, indexes |
| `app/src/lib/quick-reference.ts` | Create | Zustand store (isOpen, open, close, selectedItem) |
| `app/src/lib/open5e.ts` | Modify | Add fetchClassFeatures/fetchRacialTraits functions |
| `app/src/features/quick-reference/useAbilities.ts` | Create | CRUD hooks for abilities + character_abilities + SRD bulk import |
| `app/src/features/quick-reference/useQuickReferenceSearch.ts` | Create | Multi-table search hook (6 tables including abilities) |
| `app/src/features/quick-reference/QuickReferenceDetail.tsx` | Create | Detail renderers for each content type (condensed + expanded) |
| `app/src/features/quick-reference/QuickReference.tsx` | Create | Overlay component: search bar, split pane, results list, keyboard nav |
| `app/src/App.tsx` | Modify | Mount QuickReference, register Cmd+J shortcut |

---

### Task 1: Database Migration — Abilities Tables

**Files:**
- Create: `app/supabase/migrations/20260321140000_abilities.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Abilities table
CREATE TABLE abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  usage_type text DEFAULT 'other' CHECK (usage_type IN ('action', 'bonus_action', 'reaction', 'passive', 'other')),
  source text DEFAULT 'homebrew' CHECK (source IN ('srd', 'homebrew')),
  srd_slug text,
  ability_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abilities_campaign_access" ON abilities
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_abilities_campaign ON abilities(campaign_id);
CREATE INDEX idx_abilities_name ON abilities(name);
CREATE UNIQUE INDEX idx_abilities_srd_slug ON abilities(campaign_id, srd_slug) WHERE srd_slug IS NOT NULL;

CREATE TRIGGER update_abilities_updated_at
  BEFORE UPDATE ON abilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Character-Abilities junction table
CREATE TABLE character_abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ability_id uuid REFERENCES abilities(id) ON DELETE CASCADE NOT NULL,
  character_id uuid REFERENCES player_characters(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  notes text DEFAULT '',
  UNIQUE(ability_id, character_id)
);

ALTER TABLE character_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_abilities_campaign_access" ON character_abilities
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_character_abilities_ability ON character_abilities(ability_id);
CREATE INDEX idx_character_abilities_character ON character_abilities(character_id);
```

- [ ] **Step 2: Push migration to Supabase**

```bash
cd app && echo "Y" | npx supabase db push
```

Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/migrations/20260321140000_abilities.sql
git commit -m "feat: add abilities and character_abilities tables with RLS"
```

---

### Task 2: Zustand Store — Quick Reference State

**Files:**
- Create: `app/src/lib/quick-reference.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand'

interface SelectedItem {
  id: string
  type: 'spell' | 'monster' | 'ability' | 'pc' | 'npc' | 'location'
}

interface QuickReferenceState {
  isOpen: boolean
  query: string
  selectedItem: SelectedItem | null
  open: () => void
  close: () => void
  setQuery: (q: string) => void
  selectItem: (item: SelectedItem) => void
}

export const useQuickReference = create<QuickReferenceState>((set) => ({
  isOpen: false,
  query: '',
  selectedItem: null,
  open: () => set({ isOpen: true, query: '', selectedItem: null }),
  close: () => set({ isOpen: false, query: '', selectedItem: null }),
  setQuery: (query) => set({ query }),
  selectItem: (selectedItem) => set({ selectedItem }),
}))
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/quick-reference.ts
git commit -m "feat: add quick reference zustand store"
```

---

### Task 3: Abilities CRUD Hook

**Files:**
- Create: `app/src/features/quick-reference/useAbilities.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Ability = {
  id: string
  campaign_id: string
  name: string
  description: string
  usage_type: 'action' | 'bonus_action' | 'reaction' | 'passive' | 'other'
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  ability_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type CharacterAbility = {
  id: string
  ability_id: string
  character_id: string
  campaign_id: string
  notes: string
}

export function useAbilities(campaignId: string) {
  return useQuery({
    queryKey: ['abilities', campaignId],
    queryFn: async (): Promise<Ability[]> => {
      const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateAbility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      description?: string
      usage_type?: Ability['usage_type']
      source?: Ability['source']
      srd_slug?: string
      ability_data?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('abilities')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Ability
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['abilities', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Ability added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useAssignAbilityToCharacter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      ability_id: string
      character_id: string
      campaign_id: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('character_abilities')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as CharacterAbility
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-abilities', variables.character_id] })
      useToastStore.getState().addToast('success', 'Ability assigned to character')
    },
    onError: (error: Error) => {
      if (error.message?.includes('duplicate')) {
        useToastStore.getState().addToast('error', 'Character already has this ability')
      } else {
        useToastStore.getState().addToast('error', error.message || 'Something went wrong')
      }
    },
  })
}

export function useCharacterAbilities(characterId: string) {
  return useQuery({
    queryKey: ['character-abilities', characterId],
    queryFn: async (): Promise<CharacterAbility[]> => {
      const { data, error } = await supabase
        .from('character_abilities')
        .select('*')
        .eq('character_id', characterId)
      if (error) throw error
      return data
    },
    enabled: !!characterId,
  })
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/quick-reference/useAbilities.ts
git commit -m "feat: add abilities CRUD hooks and character assignment"
```

---

### Task 4: Open5e API — Ability Import Functions

**Files:**
- Modify: `app/src/lib/open5e.ts`

Add functions to fetch class features and racial traits from Open5e. These follow the same pagination pattern as `fetchAllSpells`.

- [ ] **Step 1: Read the current open5e.ts file**

Read `app/src/lib/open5e.ts` to see where to add the new functions.

- [ ] **Step 2: Add class feature and racial trait types and fetch functions**

Add at the end of `app/src/lib/open5e.ts`:

```typescript
// ─── Class Features & Racial Traits ─────────────────────

export interface Open5eClassFeature {
  slug: string
  name: string
  desc: string
  feature_class: string
  level: number
  document__title: string
  document__slug: string
}

export interface Open5eRacialTrait {
  slug: string
  name: string
  desc: string
  document__title: string
  document__slug: string
}

export async function fetchClassFeatures(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Open5eClassFeature[]> {
  const all: Open5eClassFeature[] = []
  let url = 'https://api.open5e.com/v1/classes/?format=json&limit=50'

  // Open5e doesn't have a dedicated class features endpoint,
  // so we fetch classes and extract their features
  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e API error: ${res.status}`)
    const data = await res.json()

    for (const cls of data.results) {
      if (cls.features) {
        for (const feature of cls.features) {
          all.push({
            slug: `${cls.slug}-${feature.slug || feature.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: feature.name,
            desc: feature.desc || '',
            feature_class: cls.name,
            level: feature.level || 0,
            document__title: cls.document__title || '',
            document__slug: cls.document__slug || '',
          })
        }
      }
    }

    url = data.next
    onProgress?.(all.length, data.count * 5) // estimate
  }

  return all
}

export async function fetchRacialTraits(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Open5eRacialTrait[]> {
  const all: Open5eRacialTrait[] = []
  let url = 'https://api.open5e.com/v1/races/?format=json&limit=50'

  while (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open5e API error: ${res.status}`)
    const data = await res.json()

    for (const race of data.results) {
      if (race.traits) {
        // Traits come as markdown text — split into individual traits
        all.push({
          slug: race.slug,
          name: `${race.name} Traits`,
          desc: race.traits,
          document__title: race.document__title || '',
          document__slug: race.document__slug || '',
        })
      }
      // Also add subraces
      if (race.subraces) {
        for (const sub of race.subraces) {
          if (sub.traits) {
            all.push({
              slug: `${race.slug}-${sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-')}`,
              name: `${sub.name} Traits`,
              desc: sub.traits,
              document__title: sub.document__title || race.document__title || '',
              document__slug: sub.document__slug || race.document__slug || '',
            })
          }
        }
      }
    }

    url = data.next
    onProgress?.(all.length, data.count)
  }

  return all
}
```

- [ ] **Step 3: Add bulk import mutation to useAbilities.ts**

Add to the end of `app/src/features/quick-reference/useAbilities.ts`:

```typescript
import { fetchClassFeatures, fetchRacialTraits } from '@/lib/open5e'
import type { Open5eClassFeature, Open5eRacialTrait } from '@/lib/open5e'

export function useBulkImportAbilities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      onProgress,
    }: {
      campaignId: string
      onProgress?: (loaded: number, total: number, message: string) => void
    }) => {
      // Fetch class features and racial traits from Open5e
      onProgress?.(0, 0, 'Fetching class features...')
      const classFeatures = await fetchClassFeatures((loaded, total) => {
        onProgress?.(loaded, total, 'Fetching class features...')
      })

      onProgress?.(0, 0, 'Fetching racial traits...')
      const racialTraits = await fetchRacialTraits((loaded, total) => {
        onProgress?.(loaded, total, 'Fetching racial traits...')
      })

      // Get existing slugs
      const { data: existing } = await supabase
        .from('abilities')
        .select('srd_slug')
        .eq('campaign_id', campaignId)
        .not('srd_slug', 'is', null)

      const existingSlugs = new Set((existing ?? []).map((e) => e.srd_slug))

      // Map and filter class features
      const fromFeatures = classFeatures
        .filter((f) => !existingSlugs.has(f.slug))
        .map((f) => ({
          campaign_id: campaignId,
          name: f.name,
          description: f.desc,
          usage_type: 'other' as const,
          source: 'srd' as const,
          srd_slug: f.slug,
          ability_data: f as unknown as Record<string, unknown>,
        }))

      // Map and filter racial traits
      const fromTraits = racialTraits
        .filter((t) => !existingSlugs.has(t.slug))
        .map((t) => ({
          campaign_id: campaignId,
          name: t.name,
          description: t.desc,
          usage_type: 'passive' as const,
          source: 'srd' as const,
          srd_slug: t.slug,
          ability_data: t as unknown as Record<string, unknown>,
        }))

      const newAbilities = [...fromFeatures, ...fromTraits]

      // Batch insert in chunks of 50
      let inserted = 0
      for (let i = 0; i < newAbilities.length; i += 50) {
        const chunk = newAbilities.slice(i, i + 50)
        const { error } = await supabase.from('abilities').insert(chunk)
        if (error) throw error
        inserted += chunk.length
        onProgress?.(inserted, newAbilities.length, 'Importing abilities...')
      }

      return { imported: inserted }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['abilities', variables.campaignId] })
      useToastStore.getState().addToast('success', `Imported ${data.imported} abilities`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Import failed')
    },
  })
}
```

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/open5e.ts app/src/features/quick-reference/useAbilities.ts
git commit -m "feat: add Open5e class feature import and bulk ability import"
```

---

### Task 5: Quick Reference Search Hook

**Files:**
- Create: `app/src/features/quick-reference/useQuickReferenceSearch.ts`

This hook searches 6 tables in parallel and fetches full details on selection.

- [ ] **Step 1: Create the search hook**

```typescript
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SearchItem {
  id: string
  name: string
  subtitle: string
}

export interface SearchGroup {
  type: 'spell' | 'monster' | 'ability' | 'pc' | 'npc' | 'location'
  label: string
  icon: string
  items: SearchItem[]
}

export function useQuickReferenceSearch(query: string, campaignId: string | null) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery<SearchGroup[]>({
    queryKey: ['quick-reference-search', debouncedQuery, campaignId],
    enabled: debouncedQuery.length >= 2 && !!campaignId,
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`

      const [spells, monsters, abilities, characters, npcs, locations] = await Promise.all([
        supabase
          .from('spells')
          .select('id, name, level, school')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('monsters')
          .select('id, name, challenge_rating, size, type')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('abilities')
          .select('id, name, usage_type, ability_data')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('player_characters')
          .select('id, name, race, class, level')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('npcs')
          .select('id, name, occupation')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('locations')
          .select('id, name, type')
          .eq('campaign_id', campaignId!)
          .ilike('name', pattern)
          .limit(5),
      ])

      const groups: SearchGroup[] = []

      if (spells.data?.length) {
        groups.push({
          type: 'spell',
          label: 'Spells',
          icon: 'spell',
          items: spells.data.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: `Level ${s.level} · ${s.school || ''}`,
          })),
        })
      }

      if (monsters.data?.length) {
        groups.push({
          type: 'monster',
          label: 'Monsters',
          icon: 'monster',
          items: monsters.data.map((m) => ({
            id: m.id,
            name: m.name,
            subtitle: `CR ${m.challenge_rating} · ${m.size || ''} ${m.type || ''}`,
          })),
        })
      }

      if (abilities.data?.length) {
        const usageLabels: Record<string, string> = {
          action: 'Action',
          bonus_action: 'Bonus Action',
          reaction: 'Reaction',
          passive: 'Passive',
          other: '',
        }
        groups.push({
          type: 'ability',
          label: 'Abilities',
          icon: 'ability',
          items: abilities.data.map((a) => {
            const featureClass = (a.ability_data as Record<string, unknown>)?.feature_class as string | undefined
            const parts = [usageLabels[a.usage_type] || '', featureClass || ''].filter(Boolean)
            return {
              id: a.id,
              name: a.name,
              subtitle: parts.join(' · '),
            }
          }),
        })
      }

      if (characters.data?.length) {
        groups.push({
          type: 'pc',
          label: 'Characters',
          icon: 'character',
          items: characters.data.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: `${c.race || ''} ${c.class || ''} · Level ${c.level || '?'}`,
          })),
        })
      }

      if (npcs.data?.length) {
        groups.push({
          type: 'npc',
          label: 'NPCs',
          icon: 'npc',
          items: npcs.data.map((n) => ({
            id: n.id,
            name: n.name,
            subtitle: n.occupation || '',
          })),
        })
      }

      if (locations.data?.length) {
        groups.push({
          type: 'location',
          label: 'Locations',
          icon: 'location',
          items: locations.data.map((l) => ({
            id: l.id,
            name: l.name,
            subtitle: l.type || '',
          })),
        })
      }

      return groups
    },
  })
}

// Fetch full details for a selected item
export function useQuickReferenceDetail(
  type: SearchGroup['type'] | null,
  id: string | null,
) {
  const table: Record<string, string> = {
    spell: 'spells',
    monster: 'monsters',
    ability: 'abilities',
    pc: 'player_characters',
    npc: 'npcs',
    location: 'locations',
  }

  return useQuery({
    queryKey: ['quick-reference-detail', type, id],
    enabled: !!type && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table[type!])
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return { type: type!, data }
    },
  })
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/quick-reference/useQuickReferenceSearch.ts
git commit -m "feat: add quick reference search and detail hooks"
```

---

### Task 6: Detail Renderers

**Files:**
- Create: `app/src/features/quick-reference/QuickReferenceDetail.tsx`

Renders condensed/expanded detail views for each content type. Each renderer is a function component inside this file.

- [ ] **Step 1: Create the detail component with all renderers**

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { useQuickReferenceDetail } from './useQuickReferenceSearch'
import { useAssignAbilityToCharacter } from './useAbilities'
import { useAddTimelineBlock } from '@/features/timeline/useTimelineBlocks'
import { useSaveSpell } from '@/features/spellbook/useSpells'
import { useSaveMonster } from '@/features/bestiary/useMonsters'
import type { SearchGroup } from './useQuickReferenceSearch'
import { abilityModifier, formatModifier } from '@/lib/dnd'

interface Props {
  type: SearchGroup['type']
  id: string
  campaignId: string
  sessionId: string | null
}

export function QuickReferenceDetail({ type, id, campaignId, sessionId }: Props) {
  const { data: detail, isLoading } = useQuickReferenceDetail(type, id)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return <p className="text-text-muted text-sm p-4">Loading...</p>
  if (!detail) return <p className="text-text-muted text-sm p-4">Select an item to view details</p>

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {type === 'spell' && <SpellDetail data={detail.data} expanded={expanded} />}
        {type === 'monster' && <MonsterDetail data={detail.data} expanded={expanded} />}
        {type === 'ability' && <AbilityDetail data={detail.data} expanded={expanded} />}
        {type === 'pc' && <PCDetail data={detail.data} expanded={expanded} />}
        {type === 'npc' && <NPCDetail data={detail.data} expanded={expanded} />}
        {type === 'location' && <LocationDetail data={detail.data} expanded={expanded} />}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-muted border border-border rounded-[--radius-sm] px-2.5 py-1 mt-3 hover:text-text-body hover:border-border-hover transition-colors"
        >
          {expanded ? '▲ Show Less' : '▼ Full Details'}
        </button>
      </div>

      <ActionButtons
        type={type}
        item={detail.data}
        campaignId={campaignId}
        sessionId={sessionId}
      />
    </div>
  )
}

// ─── Spell Detail ───────────────────────────────────────

function SpellDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const sd = data.spell_data as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          {data.level === 0 ? 'Cantrip' : `Level ${data.level}`} {data.school as string}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        {sd?.range && <div><span className="text-text-muted">Range:</span> <span className="text-text-body">{sd.range as string}</span></div>}
        {sd?.duration && <div><span className="text-text-muted">Duration:</span> <span className="text-text-body">{sd.duration as string}</span></div>}
        {sd?.casting_time && <div><span className="text-text-muted">Cast:</span> <span className="text-text-body">{sd.casting_time as string}</span></div>}
        {data.components && <div><span className="text-text-muted">Comp:</span> <span className="text-text-body">{data.components as string}</span></div>}
      </div>

      <p className="text-sm text-text-body leading-relaxed mb-2">{(sd?.desc || data.description || '') as string}</p>

      {expanded && sd?.higher_level && (
        <div className="text-sm text-text-secondary mt-2">
          <span className="text-text-muted font-medium">At Higher Levels:</span> {sd.higher_level as string}
        </div>
      )}
    </div>
  )
}

// ─── Monster Detail ─────────────────────────────────────

function MonsterDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const sb = data.stat_block as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          CR {data.challenge_rating as string}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        <div><span className="text-text-muted">AC:</span> <span className="text-text-heading font-mono">{data.armor_class as number}</span></div>
        <div><span className="text-text-muted">HP:</span> <span className="text-text-heading font-mono">{data.hit_points as number}</span></div>
        {data.hit_dice && <div><span className="text-text-muted">HD:</span> <span className="text-text-body">{data.hit_dice as string}</span></div>}
        {sb?.speed && <div><span className="text-text-muted">Speed:</span> <span className="text-text-body">{Object.entries(sb.speed as Record<string, number>).map(([k, v]) => `${k} ${v}ft`).join(', ')}</span></div>}
      </div>

      {/* Ability scores */}
      {sb && (
        <div className="grid grid-cols-6 gap-1.5 text-center mb-3">
          {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5">
              <div className="text-[9px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-text-heading font-mono text-xs">{sb[ability] as number}</div>
              <div className="text-[10px] text-text-secondary">{formatModifier(abilityModifier(sb[ability] as number))}</div>
            </div>
          ))}
        </div>
      )}

      {/* Key actions (condensed: first 3, expanded: all) */}
      {sb?.actions && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Actions</h5>
          {((sb.actions as { name: string; desc: string }[])
            .slice(0, expanded ? undefined : 3))
            .map((a, i) => (
              <p key={i} className="text-xs text-text-body mb-1">
                <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
              </p>
            ))}
          {!expanded && (sb.actions as unknown[]).length > 3 && (
            <p className="text-xs text-text-muted italic">+{(sb.actions as unknown[]).length - 3} more actions...</p>
          )}
        </div>
      )}

      {expanded && sb?.special_abilities && (sb.special_abilities as unknown[]).length > 0 && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Special Abilities</h5>
          {(sb.special_abilities as { name: string; desc: string }[]).map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

      {expanded && sb?.legendary_actions && (sb.legendary_actions as unknown[]).length > 0 && (
        <div className="mb-2">
          <h5 className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Legendary Actions</h5>
          {sb.legendary_desc && <p className="text-xs text-text-secondary mb-1">{sb.legendary_desc as string}</p>}
          {(sb.legendary_actions as { name: string; desc: string }[]).map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="text-text-heading font-medium">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ability Detail ─────────────────────────────────────

function AbilityDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const usageLabels: Record<string, { label: string; color: string }> = {
    action: { label: 'Action', color: 'bg-primary/15 text-primary-light' },
    bonus_action: { label: 'Bonus Action', color: 'bg-success/15 text-success' },
    reaction: { label: 'Reaction', color: 'bg-warning/15 text-warning' },
    passive: { label: 'Passive', color: 'bg-info/15 text-info' },
    other: { label: 'Other', color: 'bg-bg-raised text-text-muted' },
  }
  const usage = usageLabels[(data.usage_type as string) || 'other']
  const ad = data.ability_data as Record<string, unknown> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-[--radius-sm] ${usage.color}`}>{usage.label}</span>
          <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">{data.source as string}</span>
        </div>
      </div>

      {ad?.feature_class && (
        <div className="text-xs text-text-secondary mb-2">
          <span className="text-text-muted">Class:</span> {ad.feature_class as string}
          {ad.level && <> · Level {ad.level as number}</>}
        </div>
      )}

      <p className="text-sm text-text-body leading-relaxed">{data.description as string}</p>

      {expanded && ad && (
        <div className="mt-2 text-xs text-text-secondary">
          {ad.document__title && <div><span className="text-text-muted">Source:</span> {ad.document__title as string}</div>}
        </div>
      )}
    </div>
  )
}

// ─── PC Detail ──────────────────────────────────────────

function PCDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  const abilityScores = data.ability_scores as Record<string, number> | null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">
          {data.race as string} {data.class as string} · Lvl {data.level as number}
        </span>
      </div>

      <div className="flex gap-4 p-2 bg-bg-raised rounded-[--radius-md] text-xs mb-3">
        <div><span className="text-text-muted">AC:</span> <span className="text-text-heading font-mono">{data.armor_class as number}</span></div>
        <div><span className="text-text-muted">HP:</span> <span className="text-text-heading font-mono">{data.hp_current as number}/{data.hp_max as number}</span></div>
        <div><span className="text-text-muted">Speed:</span> <span className="text-text-body">{data.speed as number}ft</span></div>
      </div>

      {abilityScores && (
        <div className="grid grid-cols-6 gap-1.5 text-center mb-3">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5">
              <div className="text-[9px] text-text-muted uppercase">{ability}</div>
              <div className="text-text-heading font-mono text-xs">{abilityScores[ability]}</div>
              <div className="text-[10px] text-text-secondary">{formatModifier(abilityModifier(abilityScores[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      {expanded && data.backstory && (
        <div className="text-sm text-text-body leading-relaxed mt-2">{data.backstory as string}</div>
      )}
    </div>
  )
}

// ─── NPC Detail ─────────────────────────────────────────

function NPCDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  return (
    <div>
      <h3 className="text-text-heading text-lg font-semibold mb-2">{data.name as string}</h3>

      <div className="space-y-1 text-xs text-text-secondary mb-3">
        {data.race && <div><span className="text-text-muted">Race:</span> {data.race as string}</div>}
        {data.occupation && <div><span className="text-text-muted">Occupation:</span> {data.occupation as string}</div>}
        {data.personality && <div><span className="text-text-muted">Personality:</span> {data.personality as string}</div>}
        {data.appearance && <div><span className="text-text-muted">Appearance:</span> {data.appearance as string}</div>}
      </div>

      {expanded && (
        <>
          {data.notes && <p className="text-sm text-text-body leading-relaxed">{data.notes as string}</p>}
          {data.stats && (
            <div className="mt-2 text-xs text-text-secondary">
              <span className="text-text-muted">Stats:</span> {JSON.stringify(data.stats)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Location Detail ────────────────────────────────────

function LocationDetail({ data, expanded }: { data: Record<string, unknown>; expanded: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-heading text-lg font-semibold">{data.name as string}</h3>
        {data.type && (
          <span className="text-xs text-text-muted bg-bg-raised px-2 py-0.5 rounded-[--radius-sm]">{data.type as string}</span>
        )}
      </div>

      {data.description && <p className="text-sm text-text-body leading-relaxed mb-2">{data.description as string}</p>}

      {expanded && data.notes && (
        <p className="text-sm text-text-secondary leading-relaxed mt-2">{data.notes as string}</p>
      )}
    </div>
  )
}

// ─── Action Buttons ─────────────────────────────────────

const NAV_MAP: Record<string, string> = {
  spell: 'spellbook',
  monster: 'bestiary',
  ability: 'characters',
  pc: 'characters',
  npc: 'characters',
  location: 'locations',
}

const NAV_LABELS: Record<string, string> = {
  spell: 'Spellbook',
  monster: 'Bestiary',
  ability: 'Characters',
  pc: 'Characters',
  npc: 'Characters',
  location: 'Locations',
}

function useCampaignPCs(campaignId: string) {
  return useQuery({
    queryKey: ['quick-ref-pcs', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_characters')
        .select('id, name')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
}

function ActionButtons({
  type,
  item,
  campaignId,
  sessionId,
}: {
  type: SearchGroup['type']
  item: Record<string, unknown>
  campaignId: string
  sessionId: string | null
}) {
  const addBlock = useAddTimelineBlock()
  const assignAbility = useAssignAbilityToCharacter()
  const { data: pcs } = useCampaignPCs(campaignId)
  const [showPCDropdown, setShowPCDropdown] = useState(false)
  const [addedToLibrary, setAddedToLibrary] = useState(false)

  const handleAddToTimeline = () => {
    if (!sessionId) return
    addBlock.mutate({
      session_id: sessionId,
      campaign_id: campaignId,
      block_type: type === 'pc' ? 'note' : type === 'ability' ? 'note' : type as 'monster' | 'npc' | 'spell' | 'location',
      source_id: item.id as string,
      title: item.name as string,
      content_snapshot: item,
      sort_order: Date.now(),
    })
  }

  const handleAssignToCharacter = (characterId: string) => {
    assignAbility.mutate({
      ability_id: item.id as string,
      character_id: characterId,
      campaign_id: campaignId,
    })
    setShowPCDropdown(false)
  }

  // Show "Add to Spellbook/Bestiary" for SRD items not yet in campaign
  const isSrdItem = (item.source as string) === 'srd'
  const showAddToLibrary = (type === 'spell' || type === 'monster') && isSrdItem && !addedToLibrary

  const handleAddToLibrary = () => {
    // The item is already in the campaign library if it was found by our search
    // (which queries campaign-scoped tables). This button is for future use when
    // search also includes SRD results not yet saved to the campaign.
    // For now, mark as added.
    setAddedToLibrary(true)
  }

  return (
    <div className="flex items-center gap-2 p-3 border-t border-border relative flex-wrap">
      <Button
        size="sm"
        onClick={handleAddToTimeline}
        disabled={!sessionId}
        title={!sessionId ? 'Navigate to a session first' : undefined}
      >
        + Add to Timeline
      </Button>

      {showAddToLibrary && (
        <Button size="sm" variant="secondary" onClick={handleAddToLibrary}>
          + Add to {type === 'spell' ? 'Spellbook' : 'Bestiary'}
        </Button>
      )}

      {addedToLibrary && (type === 'spell' || type === 'monster') && (
        <span className="text-xs text-success">✓ In {type === 'spell' ? 'Spellbook' : 'Bestiary'}</span>
      )}

      {type === 'ability' && (
        <div className="relative">
          <Button size="sm" variant="secondary" onClick={() => setShowPCDropdown(!showPCDropdown)}>
            + Add to Character
          </Button>
          {showPCDropdown && pcs && (
            <div className="absolute bottom-full left-0 mb-1 bg-bg-base border border-border rounded-[--radius-md] shadow-lg overflow-hidden min-w-[160px] z-10">
              {pcs.map((pc) => (
                <button
                  key={pc.id}
                  onClick={() => handleAssignToCharacter(pc.id)}
                  className="w-full text-left px-3 py-2 text-sm text-text-body hover:bg-bg-raised cursor-pointer"
                >
                  {pc.name}
                </button>
              ))}
              {pcs.length === 0 && (
                <p className="px-3 py-2 text-xs text-text-muted">No characters in campaign</p>
              )}
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          const segment = NAV_MAP[type]
          if (segment) {
            window.location.hash = `#/campaign/${campaignId}/${segment}`
          }
        }}
      >
        Go to {NAV_LABELS[type]}
      </Button>
    </div>
  )
}
```

Note to implementer: Check that `useSaveSpell` and `useSaveMonster` exist in the spellbook/bestiary hooks. If the import names differ, adjust accordingly. The `useCampaignPCs` hook is self-contained to avoid coupling with the characters feature's full query shape.

- [ ] **Step 2: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/quick-reference/QuickReferenceDetail.tsx
git commit -m "feat: add quick reference detail renderers and action buttons"
```

---

### Task 7: Quick Reference Overlay Component

**Files:**
- Create: `app/src/features/quick-reference/QuickReference.tsx`

The main overlay with search bar, split pane, results list, and keyboard navigation.

- [ ] **Step 1: Create the overlay component**

```tsx
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion, ScaleIn } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import {
  GiSparkles, GiSpikedDragonHead, GiThreeFriends,
  GiPositionMarker, GiMagnifyingGlass, GiLightningShield,
} from '@/components/ui/icons'
import type { IconComponent } from '@/components/ui/icons'
import { useQuickReference } from '@/lib/quick-reference'
import { useQuickReferenceSearch } from './useQuickReferenceSearch'
import { QuickReferenceDetail } from './QuickReferenceDetail'
import type { SearchGroup } from './useQuickReferenceSearch'

function getCampaignIdFromUrl(): string | null {
  const hash = window.location.hash
  const match = hash.match(/\/campaign\/([^/]+)/)
  return match ? match[1] : null
}

function getSessionIdFromUrl(): string | null {
  const hash = window.location.hash
  const match = hash.match(/\/session\/([^/]+)/)
  return match ? match[1] : null
}

const GROUP_ICONS: Record<string, IconComponent> = {
  spell: GiSparkles,
  monster: GiSpikedDragonHead,
  character: GiThreeFriends,
  npc: GiThreeFriends,
  ability: GiLightningShield,
  location: GiPositionMarker,
}

export function QuickReference() {
  const { isOpen, query, selectedItem, close, setQuery, selectItem } = useQuickReference()
  const campaignId = useMemo(() => (isOpen ? getCampaignIdFromUrl() : null), [isOpen])
  const sessionId = useMemo(() => (isOpen ? getSessionIdFromUrl() : null), [isOpen])
  const { data: groups } = useQuickReferenceSearch(query, campaignId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const flatItems = useMemo(() => {
    if (!groups) return []
    return groups.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupType: g.type }))
    )
  }, [groups])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  // Auto-select first result
  useEffect(() => {
    if (flatItems.length > 0 && !selectedItem) {
      const first = flatItems[0]
      selectItem({ id: first.id, type: first.groupType })
    }
  }, [flatItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const newIndex = selectedIndex + 1 < flatItems.length ? selectedIndex + 1 : 0
        setSelectedIndex(newIndex)
        const item = flatItems[newIndex]
        if (item) selectItem({ id: item.id, type: item.groupType })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const newIndex = selectedIndex - 1 >= 0 ? selectedIndex - 1 : flatItems.length - 1
        setSelectedIndex(newIndex)
        const item = flatItems[newIndex]
        if (item) selectItem({ id: item.id, type: item.groupType })
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    },
    [flatItems, selectedIndex, selectItem, close],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
          />
          <ScaleIn className="relative max-w-[800px] w-full">
            <div className="bg-bg-base rounded-xl border border-border shadow-lg overflow-hidden">
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <span className="text-text-muted text-lg shrink-0">
                  <GameIcon icon={GiMagnifyingGlass} size="lg" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search spells, monsters, abilities, characters..."
                  className="flex-1 bg-transparent text-lg text-text-heading placeholder:text-text-muted outline-none"
                />
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
                  ESC
                </kbd>
              </div>

              {/* Split pane */}
              <div className="grid grid-cols-[240px_1fr] min-h-[380px] max-h-[60vh]">
                {/* Left: Results */}
                <div className="border-r border-border overflow-y-auto">
                  {query.length < 2 ? (
                    <div className="px-4 py-8 text-center text-text-muted text-sm">
                      Type to search...
                    </div>
                  ) : !groups?.length ? (
                    <div className="px-4 py-8 text-center text-text-muted text-sm">
                      No results found
                    </div>
                  ) : (
                    <div className="py-1">
                      {groups.map((group) => {
                        const groupStartIndex = flatItems.findIndex(
                          (fi) => fi.groupType === group.type && fi.id === group.items[0]?.id,
                        )
                        return (
                          <div key={group.type}>
                            <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                              <GameIcon icon={GROUP_ICONS[group.icon] || GiSparkles} size="xs" /> {group.label}
                            </div>
                            {group.items.map((item, i) => {
                              const flatIndex = groupStartIndex + i
                              const isSelected = selectedItem?.id === item.id && selectedItem?.type === group.type
                              return (
                                <button
                                  key={item.id}
                                  className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary-ghost border-l-2 border-primary'
                                      : 'border-l-2 border-transparent hover:bg-bg-raised'
                                  }`}
                                  onClick={() => {
                                    setSelectedIndex(flatIndex)
                                    selectItem({ id: item.id, type: group.type })
                                  }}
                                  onMouseEnter={() => setSelectedIndex(flatIndex)}
                                >
                                  <div className="text-sm text-text-heading font-medium">{item.name}</div>
                                  {item.subtitle && (
                                    <div className="text-[11px] text-text-muted">{item.subtitle}</div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Detail */}
                <div className="overflow-hidden flex flex-col">
                  {selectedItem && campaignId ? (
                    <QuickReferenceDetail
                      type={selectedItem.type}
                      id={selectedItem.id}
                      campaignId={campaignId}
                      sessionId={sessionId}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                      Select an item to view details
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span>↑↓ navigate</span>
                  <span>esc close</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium">⌘J</kbd>
              </div>
            </div>
          </ScaleIn>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Check if GiLightningShield is available in the icons barrel**

Read `app/src/components/ui/icons.ts` and check if `GiLightningShield` is exported. If not, add it. Choose an appropriate game icon for abilities if that specific one doesn't exist.

- [ ] **Step 3: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/src/features/quick-reference/QuickReference.tsx app/src/components/ui/icons.ts
git commit -m "feat: add quick reference overlay component with split pane layout"
```

---

### Task 8: Mount in App.tsx and Register Cmd+J

**Files:**
- Modify: `app/src/App.tsx:1-88`

- [ ] **Step 1: Add imports**

Add to the imports in `app/src/App.tsx`:

```typescript
import { QuickReference } from '@/features/quick-reference/QuickReference'
import { useQuickReference } from '@/lib/quick-reference'
```

- [ ] **Step 2: Add Cmd+J to the keyboard handler**

In the existing `useEffect` keyboard handler (lines 21-30), add the Cmd+J case:

Replace:
```typescript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useCommandPalette.getState().open()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
```

With:
```typescript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useCommandPalette.getState().open()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        useQuickReference.getState().open()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
```

- [ ] **Step 3: Mount the QuickReference component**

Add `<QuickReference />` right after `<CommandPalette />` (line 66):

```typescript
      <CommandPalette />
      <QuickReference />
```

- [ ] **Step 4: Verify types compile**

```bash
cd app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat: mount quick reference overlay and register Cmd+J shortcut"
```

---

### Task 9: Manual Testing & Polish

**Files:**
- Possibly modify: any file in `app/src/features/quick-reference/`, `app/src/App.tsx`

- [ ] **Step 1: Start the dev server**

```bash
cd app && npm run dev
```

- [ ] **Step 2: Test the overlay**

1. Navigate to a campaign page
2. Press Cmd+J — verify overlay opens
3. Type a search query — verify results appear grouped by type
4. Arrow keys to navigate — verify selection highlights move
5. Click a result — verify details appear in the right pane
6. Click expand — verify full details appear
7. Press Esc — verify overlay closes
8. Verify Cmd+K still opens the command palette separately

- [ ] **Step 3: Test action buttons**

1. Select a spell → click "Add to Timeline" (must be on a session page)
2. Select a monster → verify "Add to Bestiary" button appears for SRD items
3. Select an ability → click "Add to Character" → verify PC dropdown appears
4. Click a PC name → verify toast confirmation
5. Click "Go to [page]" → verify navigation works

- [ ] **Step 4: Test abilities**

1. Create a homebrew ability via the abilities table (or import SRD abilities if available)
2. Search for the ability in the quick reference
3. Verify it appears with correct usage type badge
4. Assign it to a character

- [ ] **Step 5: Fix any issues found**

Address styling, behavior, or type issues.

- [ ] **Step 6: Run type check and build**

```bash
cd app && npx tsc --noEmit && npx vite build
```

Expected: Clean type check and successful build.

- [ ] **Step 7: Commit any fixes**

```bash
git add app/src/features/quick-reference/ app/src/App.tsx app/src/lib/ app/src/components/ui/icons.ts
git commit -m "fix: polish quick reference overlay after manual testing"
```

(Skip if no fixes were needed.)
