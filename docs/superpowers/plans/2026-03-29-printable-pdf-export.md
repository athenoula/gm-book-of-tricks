# Printable PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add printable PDF generation with themed/clean styles for session prep sheets, individual content items, and multi-select bundles.

**Architecture:** `@react-pdf/renderer` generates PDFs from React components client-side. A shared data fetcher is extracted from the existing markdown export engine. PDF components use shared primitives and two theme objects. Multi-select mode on list pages uses a Zustand store and floating action bar.

**Tech Stack:** React 19, @react-pdf/renderer, Zustand, Supabase, Tailwind CSS 4

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/export/fetch-campaign-data.ts` | Shared Supabase data fetching functions |
| `src/lib/export/pdf/styles.ts` | Themed + clean PDF StyleSheet objects + font registration |
| `src/lib/export/pdf/primitives.tsx` | Reusable PDF building blocks (PageHeader, StatBlockCard, etc.) |
| `src/lib/export/pdf/MonsterPDF.tsx` | Monster stat block PDF |
| `src/lib/export/pdf/SpellPDF.tsx` | Spell card PDF |
| `src/lib/export/pdf/NPCPDF.tsx` | NPC reference PDF |
| `src/lib/export/pdf/PCPDF.tsx` | Character summary PDF |
| `src/lib/export/pdf/ItemPDF.tsx` | Item card PDF |
| `src/lib/export/pdf/LocationPDF.tsx` | Location summary PDF |
| `src/lib/export/pdf/HandoutPDF.tsx` | Handout content PDF |
| `src/lib/export/pdf/BattlePDF.tsx` | Encounter table PDF |
| `src/lib/export/pdf/SessionPrepPDF.tsx` | Session prep sheet PDF |
| `src/lib/export/pdf/BundlePDF.tsx` | Multi-item wrapper PDF |
| `src/lib/export/pdf/generate.ts` | Orchestrator: data → component → blob → download |
| `src/lib/export/pdf/usePrintSelectStore.ts` | Zustand store for multi-select state |
| `src/components/ui/PrintSelectionBar.tsx` | Floating bottom bar for multi-select |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/export/campaign-exporter.ts` | Import from shared fetcher instead of inline queries |
| `src/features/sessions/SessionPage.tsx` | Add "Print Prep Sheet" button |
| `src/features/bestiary/BestiaryPage.tsx` | Add print buttons + multi-select |
| `src/features/spellbook/SpellbookPage.tsx` | Add print buttons + multi-select |
| `src/features/characters/CharactersPage.tsx` | Add multi-select for PCs |
| `src/features/characters/PCSheet.tsx` | Add print button |
| `src/features/locations/LocationsPage.tsx` | Add print buttons + multi-select |

### Dependencies

| Package | Purpose |
|---------|---------|
| `@react-pdf/renderer` | PDF generation from React components |

---

## Task 1: Install @react-pdf/renderer

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install the package**

```bash
cd app && npm install @react-pdf/renderer
```

- [ ] **Step 2: Verify installation compiles**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: add @react-pdf/renderer for printable PDF export"
```

---

## Task 2: Shared Data Fetcher

**Files:**
- Create: `src/lib/export/fetch-campaign-data.ts`
- Modify: `src/lib/export/campaign-exporter.ts`

Extract the Supabase queries from `campaign-exporter.ts` into reusable functions. The campaign exporter will import from this new module instead of having its own queries.

- [ ] **Step 1: Create fetch-campaign-data.ts**

```typescript
// src/lib/export/fetch-campaign-data.ts

import { supabase } from '@/lib/supabase'
import type { Campaign, Session, PlayerCharacter, NPC, Monster, Spell, Handout } from '@/lib/types'

// Re-export inline types used by both export engines
export type TimelineBlock = {
  id: string
  session_id: string
  campaign_id: string
  block_type: 'scene' | 'note' | 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'handout'
  source_id: string | null
  title: string
  content_snapshot: Record<string, unknown>
  sort_order: number
  is_collapsed: boolean
  created_at: string
  updated_at: string
}

export type Location = {
  id: string
  campaign_id: string
  name: string
  description: string | null
  type: string | null
  parent_location_id: string | null
  map_url: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Item = {
  id: string
  campaign_id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'magic_item' | 'equipment' | 'consumable' | 'other'
  rarity: string | null
  cost: string | null
  stackable: boolean
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  item_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type Battle = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  type: 'template' | 'save_state'
  round: number
  active_index: number
  in_combat: boolean
  combatant_data: { name: string; hp_max: number; armor_class: number; initiative: number; is_player: boolean }[]
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Helper ──

async function query<T>(
  table: string,
  filter: { column: string; value: string | string[]; op?: 'eq' | 'in' },
  options?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  let q = supabase.from(table).select('*')
  if (filter.op === 'in') {
    q = q.in(filter.column, filter.value as string[])
  } else {
    q = q.eq(filter.column, filter.value as string)
  }
  if (options?.order) {
    q = q.order(options.order, { ascending: options.ascending ?? true })
  }
  const { data, error } = await q
  if (error) throw new Error(`Error fetching ${table}: ${error.message}`)
  return (data ?? []) as unknown as T[]
}

// ── Public Fetchers ──

export async function fetchCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
  if (error || !data) throw new Error(error?.message ?? 'Campaign not found')
  return data as unknown as Campaign
}

export async function fetchSessions(campaignId: string): Promise<Session[]> {
  return query<Session>('sessions', { column: 'campaign_id', value: campaignId }, { order: 'session_number' })
}

export async function fetchSessionById(sessionId: string): Promise<Session> {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
  if (error || !data) throw new Error(error?.message ?? 'Session not found')
  return data as unknown as Session
}

export async function fetchTimelineBlocks(sessionIds: string[]): Promise<TimelineBlock[]> {
  if (sessionIds.length === 0) return []
  return query<TimelineBlock>('timeline_blocks', { column: 'session_id', value: sessionIds, op: 'in' }, { order: 'sort_order' })
}

export async function fetchPCs(campaignId: string): Promise<PlayerCharacter[]> {
  return query<PlayerCharacter>('player_characters', { column: 'campaign_id', value: campaignId })
}

export async function fetchNPCs(campaignId: string): Promise<NPC[]> {
  return query<NPC>('npcs', { column: 'campaign_id', value: campaignId })
}

export async function fetchMonsters(campaignId: string): Promise<Monster[]> {
  return query<Monster>('monsters', { column: 'campaign_id', value: campaignId })
}

export async function fetchSpells(campaignId: string): Promise<Spell[]> {
  return query<Spell>('spells', { column: 'campaign_id', value: campaignId })
}

export async function fetchItems(campaignId: string): Promise<Item[]> {
  return query<Item>('items', { column: 'campaign_id', value: campaignId })
}

export async function fetchLocations(campaignId: string): Promise<Location[]> {
  return query<Location>('locations', { column: 'campaign_id', value: campaignId })
}

export async function fetchHandouts(campaignId: string): Promise<Handout[]> {
  return query<Handout>('handouts', { column: 'campaign_id', value: campaignId })
}

export async function fetchBattles(campaignId: string): Promise<Battle[]> {
  return query<Battle>('battles', { column: 'campaign_id', value: campaignId })
}

export async function fetchPCSpells(pcIds: string[]): Promise<Array<{ pc_id: string; spell: { name: string } | null }>> {
  if (pcIds.length === 0) return []
  const { data, error } = await supabase.from('pc_spells').select('*, spell:spells(name)').in('pc_id', pcIds)
  if (error) throw new Error(`Error fetching pc_spells: ${error.message}`)
  return (data ?? []) as unknown as Array<{ pc_id: string; spell: { name: string } | null }>
}

export async function fetchNPCSpells(npcIds: string[]): Promise<Array<{ npc_id: string; spell: { name: string } | null }>> {
  if (npcIds.length === 0) return []
  const { data, error } = await supabase.from('npc_spells').select('*, spell:spells(name)').in('npc_id', npcIds)
  if (error) throw new Error(`Error fetching npc_spells: ${error.message}`)
  return (data ?? []) as unknown as Array<{ npc_id: string; spell: { name: string } | null }>
}

export async function fetchCharacterInventory(pcIds: string[]): Promise<Array<{ character_id: string; item: { name: string } | null; quantity: number; equipped: boolean }>> {
  if (pcIds.length === 0) return []
  const { data, error } = await supabase.from('character_inventory').select('*, item:items(name)').in('character_id', pcIds)
  if (error) throw new Error(`Error fetching character_inventory: ${error.message}`)
  return (data ?? []) as unknown as Array<{ character_id: string; item: { name: string } | null; quantity: number; equipped: boolean }>
}

/**
 * Given timeline blocks, fetch the full records for any referenced content by source_id.
 * Returns a map of source_id → full record for monsters, NPCs, spells, and locations.
 */
export async function fetchResolvedTimelineContent(blocks: TimelineBlock[]): Promise<{
  monsters: Map<string, Monster>
  npcs: Map<string, NPC>
  spells: Map<string, Spell>
  locations: Map<string, Location>
  npcSpellNames: Map<string, string[]>
}> {
  const monsterIds: string[] = []
  const npcIds: string[] = []
  const spellIds: string[] = []
  const locationIds: string[] = []

  for (const block of blocks) {
    if (!block.source_id) continue
    switch (block.block_type) {
      case 'monster': monsterIds.push(block.source_id); break
      case 'npc': npcIds.push(block.source_id); break
      case 'spell': spellIds.push(block.source_id); break
      case 'location': locationIds.push(block.source_id); break
    }
    // Battles embed combatant data in content_snapshot, no source_id fetch needed
  }

  const [monstersArr, npcsArr, spellsArr, locationsArr, npcSpellsArr] = await Promise.all([
    monsterIds.length > 0 ? query<Monster>('monsters', { column: 'id', value: monsterIds, op: 'in' }) : [],
    npcIds.length > 0 ? query<NPC>('npcs', { column: 'id', value: npcIds, op: 'in' }) : [],
    spellIds.length > 0 ? query<Spell>('spells', { column: 'id', value: spellIds, op: 'in' }) : [],
    locationIds.length > 0 ? query<Location>('locations', { column: 'id', value: locationIds, op: 'in' }) : [],
    npcIds.length > 0 ? fetchNPCSpells(npcIds) : [],
  ])

  const monsters = new Map(monstersArr.map(m => [m.id, m]))
  const npcs = new Map(npcsArr.map(n => [n.id, n]))
  const spells = new Map(spellsArr.map(s => [s.id, s]))
  const locations = new Map(locationsArr.map(l => [l.id, l]))

  // Group NPC spell names by NPC ID
  const npcSpellNames = new Map<string, string[]>()
  for (const ns of npcSpellsArr) {
    if (!ns.spell?.name) continue
    const existing = npcSpellNames.get(ns.npc_id) ?? []
    existing.push(ns.spell.name)
    npcSpellNames.set(ns.npc_id, existing)
  }

  return { monsters, npcs, spells, locations, npcSpellNames }
}

/**
 * Fetch the previous session's recap for a session prep sheet.
 * If the current session has its own recap, returns that.
 * Otherwise finds the previous session by session_number and returns its recap.
 */
export async function fetchRecapForSession(session: Session): Promise<string | null> {
  if (session.recap) return session.recap
  if (!session.session_number || session.session_number <= 1) return null

  const { data } = await supabase
    .from('sessions')
    .select('recap')
    .eq('campaign_id', session.campaign_id)
    .eq('session_number', session.session_number - 1)
    .single()

  return data?.recap ?? null
}
```

- [ ] **Step 2: Update campaign-exporter.ts to use shared fetcher**

Refactor `campaign-exporter.ts` to import from `fetch-campaign-data.ts`. Replace the inline type definitions and the `exportCampaignToFolder` data-fetching section with imports from the shared module. The exporter should call `fetchCampaign()`, `fetchSessions()`, `fetchTimelineBlocks()`, `fetchPCs()`, etc. instead of making direct supabase calls.

Read the current `campaign-exporter.ts` file, then replace:
- The inline type definitions (TimelineBlock, Location, Item, Battle) with imports from `fetch-campaign-data.ts`
- The parallel `Promise.all` queries in `exportCampaignToFolder` with calls to the shared fetchers

The formatting and ZIP generation logic stays the same.

- [ ] **Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manually test existing export still works**

Run `npm run dev`, navigate to a campaign, click Export. Verify the ZIP downloads correctly with the same content as before the refactor.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/export/fetch-campaign-data.ts app/src/lib/export/campaign-exporter.ts
git commit -m "refactor(export): extract shared data fetcher from campaign exporter"
```

---

## Task 3: PDF Styles & Font Registration

**Files:**
- Create: `src/lib/export/pdf/styles.ts`

- [ ] **Step 1: Create styles.ts**

```tsx
// src/lib/export/pdf/styles.ts

import { StyleSheet, Font } from '@react-pdf/renderer'

// ── Font Registration ──

Font.register({
  family: 'Cinzel',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnfY3lCA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-j7gfY3lCA.ttf', fontWeight: 700 },
  ],
})

Font.register({
  family: 'Crimson Pro',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/crimsonpro/v24/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm18OJE_VNWjQ9tK.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/crimsonpro/v24/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm18D5Y_VNWjQ9tK.ttf', fontWeight: 700 },
  ],
})

// ── Theme Types ──

export type PdfTheme = 'themed' | 'clean'

export interface PdfStyles {
  page: Record<string, unknown>
  heading: Record<string, unknown>
  subheading: Record<string, unknown>
  body: Record<string, unknown>
  label: Record<string, unknown>
  divider: Record<string, unknown>
  callout: Record<string, unknown>
  card: Record<string, unknown>
  cardTitle: Record<string, unknown>
  statRow: Record<string, unknown>
  statLabel: Record<string, unknown>
  statValue: Record<string, unknown>
  table: Record<string, unknown>
  tableHeader: Record<string, unknown>
  tableRow: Record<string, unknown>
  tableCell: Record<string, unknown>
  footer: Record<string, unknown>
}

// ── Themed Styles ──

const themed = StyleSheet.create({
  page: {
    backgroundColor: '#f5f0e8',
    padding: 40,
    fontFamily: 'Crimson Pro',
    fontSize: 10,
    color: '#2c1810',
  },
  heading: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 4,
    marginTop: 12,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#4a3728',
  },
  label: {
    fontSize: 8,
    color: '#8b6f5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#c4a87c',
    borderBottomStyle: 'solid',
    marginVertical: 10,
    opacity: 0.6,
  },
  callout: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#c4a87c',
    borderLeftStyle: 'solid',
    padding: 8,
    marginBottom: 10,
    borderRadius: 2,
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(196,168,124,0.4)',
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#5c3d2e',
  },
  statValue: {
    fontSize: 9,
    color: '#4a3728',
  },
  table: {
    marginTop: 6,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#c4a87c',
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,168,124,0.3)',
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#8b6f5e',
  },
}) as unknown as PdfStyles

// ── Clean Styles ──

const clean = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  heading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
    marginTop: 12,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333333',
  },
  label: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    borderBottomStyle: 'solid',
    marginVertical: 10,
  },
  callout: {
    borderLeftWidth: 2,
    borderLeftColor: '#cccccc',
    borderLeftStyle: 'solid',
    paddingLeft: 8,
    marginBottom: 10,
  },
  card: {
    border: '1px solid #cccccc',
    borderRadius: 2,
    padding: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#333333',
  },
  statValue: {
    fontSize: 9,
    color: '#333333',
  },
  table: {
    marginTop: 6,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 3,
    marginBottom: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999999',
  },
}) as unknown as PdfStyles

// ── Theme Selector ──

export function getStyles(theme: PdfTheme): PdfStyles {
  return theme === 'themed' ? themed : clean
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Note: The Google Fonts URLs may need adjustment if they 404. If font registration fails at runtime, the PDF will still render with Helvetica as fallback. The URLs above are for the variable-weight TTF files — verify they load in a browser first. If they don't work, use static weight files from `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700` and extract the TTF URLs from the CSS response.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/styles.ts
git commit -m "feat(pdf): add themed and clean PDF style systems with font registration"
```

---

## Task 4: PDF Primitives

**Files:**
- Create: `src/lib/export/pdf/primitives.tsx`

- [ ] **Step 1: Create primitives.tsx**

```tsx
// src/lib/export/pdf/primitives.tsx

import { View, Text } from '@react-pdf/renderer'
import type { PdfStyles } from './styles'

// ── PageHeader ──

export function PageHeader({ title, subtitle, styles }: { title: string; subtitle?: string; styles: PdfStyles }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle && <Text style={styles.label}>{subtitle}</Text>}
      <View style={styles.divider} />
    </View>
  )
}

// ── SectionHeading ──

export function SectionHeading({ text, styles }: { text: string; styles: PdfStyles }) {
  return <Text style={styles.subheading}>{text}</Text>
}

// ── Divider ──

export function Divider({ styles }: { styles: PdfStyles }) {
  return <View style={styles.divider} />
}

// ── AbilityScoreRow ──

export function AbilityScoreRow({ scores, styles }: {
  scores: { strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number }
  styles: PdfStyles
}) {
  const abilities = [
    { label: 'STR', value: scores.strength },
    { label: 'DEX', value: scores.dexterity },
    { label: 'CON', value: scores.constitution },
    { label: 'INT', value: scores.intelligence },
    { label: 'WIS', value: scores.wisdom },
    { label: 'CHA', value: scores.charisma },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
      {abilities.map((a) => (
        <View key={a.label} style={{ alignItems: 'center', width: 40 }}>
          <Text style={styles.statLabel}>{a.label}</Text>
          <Text style={{ fontSize: 12, fontWeight: 700 }}>{a.value}</Text>
          <Text style={{ fontSize: 7, color: '#888' }}>({Math.floor((a.value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((a.value - 10) / 2)})</Text>
        </View>
      ))}
    </View>
  )
}

// ── StatBlockCard ──

export function StatBlockCard({ name, ac, hp, cr, speed, actions, styles }: {
  name: string
  ac?: number | string
  hp?: number | string
  cr?: string | null
  speed?: string
  actions?: string[]
  styles: PdfStyles
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      <View style={styles.statRow}>
        {ac != null && <Text style={styles.statValue}>AC {ac}</Text>}
        {hp != null && <Text style={styles.statValue}>HP {hp}</Text>}
        {cr && <Text style={styles.statValue}>CR {cr}</Text>}
      </View>
      {speed && <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>Speed: {speed}</Text>}
      {actions && actions.length > 0 && (
        <Text style={{ fontSize: 8, color: '#666' }}>{actions.join(', ')}</Text>
      )}
    </View>
  )
}

// ── SpellCard ──

export function SpellCardPrimitive({ name, level, school, castingTime, range, description, styles }: {
  name: string
  level: number
  school: string | null
  castingTime: string | null
  range: string | null
  description?: string
  styles: PdfStyles
}) {
  const levelLabel = level === 0 ? 'Cantrip' : `Level ${level}`
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>
        {levelLabel}{school ? ` ${school}` : ''} — {castingTime ?? '?'}, {range ?? '?'}
      </Text>
      {description && <Text style={{ fontSize: 8, marginTop: 2 }}>{description.substring(0, 200)}{description.length > 200 ? '...' : ''}</Text>}
    </View>
  )
}

// ── NPCCard ──

export function NPCCardPrimitive({ name, personality, ac, hp, spells, styles }: {
  name: string
  personality?: string | null
  ac?: number
  hp?: number
  spells?: string[]
  styles: PdfStyles
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      {personality && <Text style={{ fontSize: 8, fontStyle: 'italic', marginBottom: 2 }}>{personality.substring(0, 150)}{personality.length > 150 ? '...' : ''}</Text>}
      <View style={styles.statRow}>
        {ac != null && <Text style={styles.statValue}>AC {ac}</Text>}
        {hp != null && <Text style={styles.statValue}>HP {hp}</Text>}
      </View>
      {spells && spells.length > 0 && (
        <Text style={{ fontSize: 8, color: '#666' }}>Spells: {spells.join(', ')}</Text>
      )}
    </View>
  )
}

// ── PageFooter ──

export function PageFooter({ styles }: { styles: PdfStyles }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Generated by Book of Tricks</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/primitives.tsx
git commit -m "feat(pdf): add reusable PDF primitives (headers, stat blocks, spell cards, etc.)"
```

---

## Task 5: Monster & Spell PDFs

**Files:**
- Create: `src/lib/export/pdf/MonsterPDF.tsx`
- Create: `src/lib/export/pdf/SpellPDF.tsx`

These are the simplest individual content PDFs and serve as the template for all others.

- [ ] **Step 1: Create MonsterPDF.tsx**

```tsx
// src/lib/export/pdf/MonsterPDF.tsx

import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Monster } from '@/lib/types'
import type { PdfTheme } from './styles'
import { getStyles } from './styles'
import { PageHeader, PageFooter, AbilityScoreRow, SectionHeading, Divider } from './primitives'

export function MonsterPDF({ monster, theme }: { monster: Monster; theme: PdfTheme }) {
  const s = getStyles(theme)
  const sb = monster.stat_block || {}
  const speedStr = Object.entries(monster.speed)
    .map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`)
    .join(', ')

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageHeader
          title={monster.name}
          subtitle={`${monster.size || ''} ${monster.type || ''}${monster.alignment ? `, ${monster.alignment}` : ''}${monster.source === 'srd' ? ' (SRD)' : ''}`}
          styles={s}
        />

        <View style={s.statRow}>
          <Text style={s.body}><Text style={s.statLabel}>AC </Text>{monster.armor_class}{monster.armor_desc ? ` (${monster.armor_desc})` : ''}</Text>
          <Text style={s.body}><Text style={s.statLabel}>HP </Text>{monster.hit_points}{monster.hit_dice ? ` (${monster.hit_dice})` : ''}</Text>
          <Text style={s.body}><Text style={s.statLabel}>CR </Text>{monster.challenge_rating || '?'}</Text>
        </View>
        <Text style={s.body}><Text style={s.statLabel}>Speed </Text>{speedStr || '30 ft.'}</Text>

        {sb.strength != null && (
          <>
            <Divider styles={s} />
            <AbilityScoreRow scores={{
              strength: sb.strength as number ?? 10,
              dexterity: sb.dexterity as number ?? 10,
              constitution: sb.constitution as number ?? 10,
              intelligence: sb.intelligence as number ?? 10,
              wisdom: sb.wisdom as number ?? 10,
              charisma: sb.charisma as number ?? 10,
            }} styles={s} />
          </>
        )}

        {renderActions('Special Abilities', sb.special_abilities as { name: string; desc: string }[] | undefined, s)}
        {renderActions('Actions', sb.actions as { name: string; desc: string }[] | undefined, s)}
        {renderActions('Legendary Actions', sb.legendary_actions as { name: string; desc: string }[] | undefined, s)}

        {monster.notes && (
          <>
            <SectionHeading text="Notes" styles={s} />
            <Text style={s.body}>{monster.notes}</Text>
          </>
        )}

        <PageFooter styles={s} />
      </Page>
    </Document>
  )
}

function renderActions(title: string, actions: { name: string; desc: string }[] | undefined, s: ReturnType<typeof getStyles>) {
  if (!actions || actions.length === 0) return null
  return (
    <>
      <SectionHeading text={title} styles={s} />
      {actions.map((a, i) => (
        <View key={i} style={{ marginBottom: 4 }}>
          <Text style={s.body}><Text style={{ fontWeight: 700 }}>{a.name}. </Text>{a.desc}</Text>
        </View>
      ))}
    </>
  )
}

// Inner content for use in BundlePDF (no Document/Page wrapper)
export function MonsterPDFContent({ monster, styles }: { monster: Monster; styles: ReturnType<typeof getStyles> }) {
  const sb = monster.stat_block || {}
  const speedStr = Object.entries(monster.speed)
    .map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`)
    .join(', ')

  return (
    <>
      <PageHeader
        title={monster.name}
        subtitle={`${monster.size || ''} ${monster.type || ''}${monster.alignment ? `, ${monster.alignment}` : ''}${monster.source === 'srd' ? ' (SRD)' : ''}`}
        styles={styles}
      />
      <View style={styles.statRow}>
        <Text style={styles.body}><Text style={styles.statLabel}>AC </Text>{monster.armor_class}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>HP </Text>{monster.hit_points}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>CR </Text>{monster.challenge_rating || '?'}</Text>
      </View>
      <Text style={styles.body}><Text style={styles.statLabel}>Speed </Text>{speedStr || '30 ft.'}</Text>
      {sb.strength != null && (
        <>
          <Divider styles={styles} />
          <AbilityScoreRow scores={{
            strength: sb.strength as number ?? 10, dexterity: sb.dexterity as number ?? 10,
            constitution: sb.constitution as number ?? 10, intelligence: sb.intelligence as number ?? 10,
            wisdom: sb.wisdom as number ?? 10, charisma: sb.charisma as number ?? 10,
          }} styles={styles} />
        </>
      )}
      {renderActions('Special Abilities', sb.special_abilities as { name: string; desc: string }[] | undefined, styles)}
      {renderActions('Actions', sb.actions as { name: string; desc: string }[] | undefined, styles)}
      {renderActions('Legendary Actions', sb.legendary_actions as { name: string; desc: string }[] | undefined, styles)}
    </>
  )
}
```

- [ ] **Step 2: Create SpellPDF.tsx**

```tsx
// src/lib/export/pdf/SpellPDF.tsx

import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Spell } from '@/lib/types'
import type { PdfTheme } from './styles'
import { getStyles } from './styles'
import { PageHeader, PageFooter, SectionHeading } from './primitives'

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function SpellPDF({ spell, theme }: { spell: Spell; theme: PdfTheme }) {
  const s = getStyles(theme)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <SpellPDFContent spell={spell} styles={s} />
        <PageFooter styles={s} />
      </Page>
    </Document>
  )
}

export function SpellPDFContent({ spell, styles }: { spell: Spell; styles: ReturnType<typeof getStyles> }) {
  const sd = spell.spell_data || {}
  const levelLabel = spell.level === 0
    ? `${spell.school || ''} cantrip`
    : `${ordinal(spell.level)}-level ${spell.school || ''}`

  const tags = [
    spell.concentration ? 'Concentration' : null,
    spell.ritual ? 'Ritual' : null,
  ].filter(Boolean).join(', ')

  const desc = (sd.desc as string) || (sd.description as string) || ''
  const higherLevel = (sd.higher_level as string) || (sd.at_higher_levels as string) || ''

  return (
    <>
      <PageHeader
        title={spell.name}
        subtitle={`${levelLabel}${tags ? ` (${tags})` : ''} — ${spell.source === 'srd' ? 'SRD' : 'Homebrew'}`}
        styles={styles}
      />

      <View style={{ marginBottom: 8 }}>
        <Text style={styles.body}><Text style={styles.statLabel}>Casting Time: </Text>{(sd.casting_time as string) || spell.casting_time || '?'}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>Range: </Text>{(sd.range as string) || spell.range || '?'}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>Components: </Text>{(sd.components as string) || spell.components || '?'}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>Duration: </Text>{(sd.duration as string) || spell.duration || '?'}</Text>
        <Text style={styles.body}><Text style={styles.statLabel}>Classes: </Text>{spell.classes.join(', ') || '?'}</Text>
      </View>

      {desc && (
        <>
          <SectionHeading text="Description" styles={styles} />
          <Text style={styles.body}>{desc}</Text>
        </>
      )}

      {higherLevel && (
        <>
          <SectionHeading text="At Higher Levels" styles={styles} />
          <Text style={styles.body}>{higherLevel}</Text>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/export/pdf/MonsterPDF.tsx app/src/lib/export/pdf/SpellPDF.tsx
git commit -m "feat(pdf): add Monster and Spell PDF components"
```

---

## Task 6: NPC, PC, Item, Location, Handout, Battle PDFs

**Files:**
- Create: `src/lib/export/pdf/NPCPDF.tsx`
- Create: `src/lib/export/pdf/PCPDF.tsx`
- Create: `src/lib/export/pdf/ItemPDF.tsx`
- Create: `src/lib/export/pdf/LocationPDF.tsx`
- Create: `src/lib/export/pdf/HandoutPDF.tsx`
- Create: `src/lib/export/pdf/BattlePDF.tsx`

Each follows the same pattern as MonsterPDF/SpellPDF: a full `<Document>` export and a `Content` export for bundles. The implementer should read MonsterPDF.tsx and SpellPDF.tsx as templates, then create the remaining six PDFs.

- [ ] **Step 1: Create all six PDF components**

Create each file following the established pattern from Task 5. Each file exports:
- `{Type}PDF({ data, theme })` — full Document/Page wrapper
- `{Type}PDFContent({ data, styles })` — inner content for BundlePDF

**NPCPDF.tsx:** Render name, race/occupation, personality, appearance, stats (AC/HP), ability scores if stat_block exists, spells list, notes. Accept `npc: NPC` and `spellNames: string[]` props.

**PCPDF.tsx:** Render name, class/level/race/player_name, ability scores table, combat stats (HP/AC/Speed/Initiative), equipment list, spells list, class features, traits, backstory, notes. Accept `pc: PlayerCharacter`, `spellNames: string[]`, `inventory: string[]` props.

**ItemPDF.tsx:** Render name, type/rarity badge, description, properties (stackable, cost). Accept `item: Item` (use the Item type from `fetch-campaign-data.ts`).

**LocationPDF.tsx:** Render name, type, description, parent location reference, child locations list, notes. Accept `location: Location` and `allLocations: Location[]` (both from `fetch-campaign-data.ts`).

**HandoutPDF.tsx:** Render name, template type, content fields (body/title/subtitle from content JSON), seal info. Accept `handout: Handout`.

**BattlePDF.tsx:** Render name, battle type label, combatant table (Name, HP, AC, Initiative columns), notes. Accept `battle: Battle` (from `fetch-campaign-data.ts`).

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/NPCPDF.tsx app/src/lib/export/pdf/PCPDF.tsx app/src/lib/export/pdf/ItemPDF.tsx app/src/lib/export/pdf/LocationPDF.tsx app/src/lib/export/pdf/HandoutPDF.tsx app/src/lib/export/pdf/BattlePDF.tsx
git commit -m "feat(pdf): add NPC, PC, Item, Location, Handout, and Battle PDF components"
```

---

## Task 7: Session Prep PDF

**Files:**
- Create: `src/lib/export/pdf/SessionPrepPDF.tsx`

The most complex PDF. It assembles a full session prep sheet with embedded timeline content.

- [ ] **Step 1: Create SessionPrepPDF.tsx**

```tsx
// src/lib/export/pdf/SessionPrepPDF.tsx

import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Session, Monster, NPC, Spell } from '@/lib/types'
import type { TimelineBlock, Location } from '@/lib/export/fetch-campaign-data'
import type { PdfTheme, PdfStyles } from './styles'
import { getStyles } from './styles'
import { PageHeader, PageFooter, SectionHeading, Divider, StatBlockCard, SpellCardPrimitive, NPCCardPrimitive } from './primitives'

interface SessionPrepData {
  session: Session
  campaignName: string
  recap: string | null
  blocks: TimelineBlock[]
  resolvedMonsters: Map<string, Monster>
  resolvedNPCs: Map<string, NPC>
  resolvedSpells: Map<string, Spell>
  resolvedLocations: Map<string, Location>
  npcSpellNames: Map<string, string[]>
}

export function SessionPrepPDF({ data, theme }: { data: SessionPrepData; theme: PdfTheme }) {
  const s = getStyles(theme)
  const { session, campaignName, recap, blocks } = data

  const dateStr = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageHeader
          title={`Session ${session.session_number ?? '?'}: ${session.name}`}
          subtitle={`${campaignName}${dateStr ? ` — ${dateStr}` : ''}`}
          styles={s}
        />

        {recap && (
          <>
            <SectionHeading text="Last Session Recap" styles={s} />
            <View style={s.callout}>
              <Text style={s.body}>{recap}</Text>
            </View>
          </>
        )}

        {session.notes && (
          <>
            <SectionHeading text="Session Notes" styles={s} />
            <Text style={s.body}>{session.notes}</Text>
            <Divider styles={s} />
          </>
        )}

        {blocks.length > 0 && (
          <>
            <SectionHeading text="Timeline" styles={s} />
            {blocks.map((block) => (
              <View key={block.id} style={{ marginBottom: 8 }} wrap={false}>
                {renderBlock(block, data, s)}
              </View>
            ))}
          </>
        )}

        <PageFooter styles={s} />
      </Page>
    </Document>
  )
}

function renderBlock(block: TimelineBlock, data: SessionPrepData, s: PdfStyles) {
  const snap = block.content_snapshot || {}

  switch (block.block_type) {
    case 'scene':
    case 'note':
      return (
        <>
          <Text style={s.subheading}>{block.title}</Text>
          <Text style={s.body}>{(snap.content as string) || ''}</Text>
        </>
      )

    case 'battle': {
      const combatants = (snap.combatant_data as Array<{ name: string; hp_max?: number; armor_class?: number; initiative?: number }>) || []
      return (
        <>
          <Text style={s.subheading}>{block.title}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {combatants.map((c, i) => (
              <View key={i} style={{ width: '48%' }}>
                <StatBlockCard
                  name={c.name}
                  ac={c.armor_class}
                  hp={c.hp_max}
                  styles={s}
                />
              </View>
            ))}
          </View>
        </>
      )
    }

    case 'monster': {
      const monster = block.source_id ? data.resolvedMonsters.get(block.source_id) : null
      if (monster) {
        const speedStr = Object.entries(monster.speed).map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`).join(', ')
        const actions = (monster.stat_block?.actions as { name: string }[])?.map(a => a.name) || []
        return (
          <StatBlockCard
            name={monster.name}
            ac={monster.armor_class}
            hp={monster.hit_points}
            cr={monster.challenge_rating}
            speed={speedStr}
            actions={actions}
            styles={s}
          />
        )
      }
      return <StatBlockCard name={block.title} ac={snap.armor_class as number} hp={snap.hit_points as number} styles={s} />
    }

    case 'npc': {
      const npc = block.source_id ? data.resolvedNPCs.get(block.source_id) : null
      const spells = block.source_id ? data.npcSpellNames.get(block.source_id) : undefined
      if (npc) {
        return <NPCCardPrimitive name={npc.name} personality={npc.personality} ac={npc.stats?.ac} hp={npc.stats?.hp} spells={spells} styles={s} />
      }
      return <NPCCardPrimitive name={block.title} styles={s} />
    }

    case 'spell': {
      const spell = block.source_id ? data.resolvedSpells.get(block.source_id) : null
      if (spell) {
        const sd = spell.spell_data || {}
        const desc = (sd.desc as string) || (sd.description as string)
        return <SpellCardPrimitive name={spell.name} level={spell.level} school={spell.school} castingTime={spell.casting_time} range={spell.range} description={desc} styles={s} />
      }
      return <SpellCardPrimitive name={block.title} level={0} school={null} castingTime={null} range={null} styles={s} />
    }

    case 'location': {
      const loc = block.source_id ? data.resolvedLocations.get(block.source_id) : null
      return (
        <>
          <Text style={s.subheading}>{block.title}</Text>
          {loc?.description && <Text style={s.body}>{loc.description}</Text>}
        </>
      )
    }

    case 'handout':
      return (
        <>
          <Text style={s.subheading}>{block.title}</Text>
          <Text style={s.body}>{(snap.body as string) || (snap.content as string) || ''}</Text>
        </>
      )

    default:
      return <Text style={s.subheading}>{block.title}</Text>
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/SessionPrepPDF.tsx
git commit -m "feat(pdf): add session prep sheet PDF with embedded timeline content"
```

---

## Task 8: Bundle PDF

**Files:**
- Create: `src/lib/export/pdf/BundlePDF.tsx`

- [ ] **Step 1: Create BundlePDF.tsx**

```tsx
// src/lib/export/pdf/BundlePDF.tsx

import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Monster, Spell, PlayerCharacter, NPC, Handout } from '@/lib/types'
import type { Item, Location, Battle } from '@/lib/export/fetch-campaign-data'
import type { PdfTheme } from './styles'
import { getStyles } from './styles'
import { PageFooter } from './primitives'
import { MonsterPDFContent } from './MonsterPDF'
import { SpellPDFContent } from './SpellPDF'
import { NPCPDFContent } from './NPCPDF'
import { PCPDFContent } from './PCPDF'
import { ItemPDFContent } from './ItemPDF'
import { LocationPDFContent } from './LocationPDF'
import { HandoutPDFContent } from './HandoutPDF'
import { BattlePDFContent } from './BattlePDF'

export type BundleItem =
  | { type: 'monster'; data: Monster }
  | { type: 'spell'; data: Spell }
  | { type: 'npc'; data: NPC; spellNames: string[] }
  | { type: 'character'; data: PlayerCharacter; spellNames: string[]; inventory: string[] }
  | { type: 'item'; data: Item }
  | { type: 'location'; data: Location; allLocations: Location[] }
  | { type: 'handout'; data: Handout }
  | { type: 'battle'; data: Battle }

export function BundlePDF({ items, theme }: { items: BundleItem[]; theme: PdfTheme }) {
  const s = getStyles(theme)

  return (
    <Document>
      {items.map((item, i) => (
        <Page key={i} size="A4" style={s.page}>
          {renderItem(item, s)}
          <PageFooter styles={s} />
        </Page>
      ))}
    </Document>
  )
}

function renderItem(item: BundleItem, styles: ReturnType<typeof getStyles>) {
  switch (item.type) {
    case 'monster':
      return <MonsterPDFContent monster={item.data} styles={styles} />
    case 'spell':
      return <SpellPDFContent spell={item.data} styles={styles} />
    case 'npc':
      return <NPCPDFContent npc={item.data} spellNames={item.spellNames} styles={styles} />
    case 'character':
      return <PCPDFContent pc={item.data} spellNames={item.spellNames} inventory={item.inventory} styles={styles} />
    case 'item':
      return <ItemPDFContent item={item.data} styles={styles} />
    case 'location':
      return <LocationPDFContent location={item.data} allLocations={item.allLocations} styles={styles} />
    case 'handout':
      return <HandoutPDFContent handout={item.data} styles={styles} />
    case 'battle':
      return <BattlePDFContent battle={item.data} styles={styles} />
  }
}
```

Note: This task depends on the `*PDFContent` exports from each PDF component in Task 6. Make sure each of those files exports both the full Document version and the inner Content version, matching the pattern from MonsterPDF.tsx in Task 5.

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/BundlePDF.tsx
git commit -m "feat(pdf): add bundle PDF wrapper for multi-item print"
```

---

## Task 9: Generate Orchestrator

**Files:**
- Create: `src/lib/export/pdf/generate.ts`

- [ ] **Step 1: Create generate.ts**

```typescript
// src/lib/export/pdf/generate.ts

import { pdf } from '@react-pdf/renderer'
import { useToastStore } from '@/lib/toast'
import { slugify } from '@/lib/export/slugify'
import {
  fetchCampaign, fetchSessionById, fetchSessions, fetchTimelineBlocks,
  fetchResolvedTimelineContent, fetchRecapForSession,
  fetchPCSpells, fetchNPCSpells, fetchCharacterInventory,
} from '@/lib/export/fetch-campaign-data'
import type { Monster, Spell, NPC, PlayerCharacter, Handout } from '@/lib/types'
import type { Item, Location, Battle } from '@/lib/export/fetch-campaign-data'
import type { PdfTheme } from './styles'
import { MonsterPDF } from './MonsterPDF'
import { SpellPDF } from './SpellPDF'
import { NPCPDF } from './NPCPDF'
import { PCPDF } from './PCPDF'
import { ItemPDF } from './ItemPDF'
import { LocationPDF } from './LocationPDF'
import { HandoutPDF } from './HandoutPDF'
import { BattlePDF } from './BattlePDF'
import { SessionPrepPDF } from './SessionPrepPDF'
import { BundlePDF, type BundleItem } from './BundlePDF'

// ── Helper ──

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function renderAndDownload(component: React.ReactElement, filename: string): Promise<void> {
  const toast = useToastStore.getState()
  toast.addToast('info', 'Generating PDF...')
  try {
    const blob = await pdf(component).toBlob()
    triggerDownload(blob, filename)
    toast.addToast('success', 'PDF downloaded')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed'
    toast.addToast('error', msg)
    throw err
  }
}

// ── Public Generate Functions ──

export async function generateSessionPrepPDF(sessionId: string, campaignId: string, theme: PdfTheme): Promise<void> {
  const [session, campaign] = await Promise.all([
    fetchSessionById(sessionId),
    fetchCampaign(campaignId),
  ])

  const blocks = await fetchTimelineBlocks([sessionId])
  const recap = await fetchRecapForSession(session)
  const resolved = await fetchResolvedTimelineContent(blocks)

  const data = {
    session,
    campaignName: campaign.name,
    recap,
    blocks,
    resolvedMonsters: resolved.monsters,
    resolvedNPCs: resolved.npcs,
    resolvedSpells: resolved.spells,
    resolvedLocations: resolved.locations,
    npcSpellNames: resolved.npcSpellNames,
  }

  const num = String(session.session_number ?? 0).padStart(2, '0')
  const filename = `session-${num}-${slugify(session.name)}-prep.pdf`
  await renderAndDownload(<SessionPrepPDF data={data} theme={theme} />, filename)
}

export async function generateMonsterPDF(monster: Monster, theme: PdfTheme): Promise<void> {
  await renderAndDownload(<MonsterPDF monster={monster} theme={theme} />, `${slugify(monster.name)}.pdf`)
}

export async function generateSpellPDF(spell: Spell, theme: PdfTheme): Promise<void> {
  await renderAndDownload(<SpellPDF spell={spell} theme={theme} />, `${slugify(spell.name)}.pdf`)
}

export async function generateNPCPDF(npc: NPC, spellNames: string[], theme: PdfTheme): Promise<void> {
  await renderAndDownload(<NPCPDF npc={npc} spellNames={spellNames} theme={theme} />, `${slugify(npc.name)}.pdf`)
}

export async function generatePCPDF(pc: PlayerCharacter, spellNames: string[], inventory: string[], theme: PdfTheme): Promise<void> {
  await renderAndDownload(<PCPDF pc={pc} spellNames={spellNames} inventory={inventory} theme={theme} />, `${slugify(pc.name)}.pdf`)
}

export async function generateItemPDF(item: Item, theme: PdfTheme): Promise<void> {
  await renderAndDownload(<ItemPDF item={item} theme={theme} />, `${slugify(item.name)}.pdf`)
}

export async function generateLocationPDF(location: Location, allLocations: Location[], theme: PdfTheme): Promise<void> {
  await renderAndDownload(<LocationPDF location={location} allLocations={allLocations} theme={theme} />, `${slugify(location.name)}.pdf`)
}

export async function generateHandoutPDF(handout: Handout, theme: PdfTheme): Promise<void> {
  await renderAndDownload(<HandoutPDF handout={handout} theme={theme} />, `${slugify(handout.name)}.pdf`)
}

export async function generateBattlePDF(battle: Battle, theme: PdfTheme): Promise<void> {
  await renderAndDownload(<BattlePDF battle={battle} theme={theme} />, `${slugify(battle.name)}.pdf`)
}

export async function generateBundlePDF(items: BundleItem[], theme: PdfTheme, label?: string): Promise<void> {
  const filename = label ? `${slugify(label)}-bundle-${items.length}-items.pdf` : `bundle-${items.length}-items.pdf`
  await renderAndDownload(<BundlePDF items={items} theme={theme} />, filename)
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/pdf/generate.ts
git commit -m "feat(pdf): add generate orchestrator for all PDF types"
```

---

## Task 10: Print Select Store + Floating Bar

**Files:**
- Create: `src/lib/export/pdf/usePrintSelectStore.ts`
- Create: `src/components/ui/PrintSelectionBar.tsx`

- [ ] **Step 1: Create usePrintSelectStore.ts**

```typescript
// src/lib/export/pdf/usePrintSelectStore.ts

import { create } from 'zustand'

type ContentType = 'monster' | 'spell' | 'character' | 'location'
type PdfTheme = 'themed' | 'clean'

interface PrintSelectStore {
  active: boolean
  selectedIds: Set<string>
  contentType: ContentType
  theme: PdfTheme
  enterSelectMode: (contentType: ContentType) => void
  exitSelectMode: () => void
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setTheme: (theme: PdfTheme) => void
}

export const usePrintSelectStore = create<PrintSelectStore>((set) => ({
  active: false,
  selectedIds: new Set<string>(),
  contentType: 'monster',
  theme: 'themed',

  enterSelectMode: (contentType) => set({
    active: true,
    contentType,
    selectedIds: new Set<string>(),
  }),

  exitSelectMode: () => set({
    active: false,
    selectedIds: new Set<string>(),
  }),

  toggle: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { selectedIds: next }
  }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  setTheme: (theme) => set({ theme }),
}))
```

- [ ] **Step 2: Create PrintSelectionBar.tsx**

```tsx
// src/components/ui/PrintSelectionBar.tsx

import { AnimatePresence, motion } from '@/components/motion'
import { Button } from '@/components/ui/Button'
import { usePrintSelectStore } from '@/lib/export/pdf/usePrintSelectStore'

export function PrintSelectionBar({ onPrint }: { onPrint: () => void }) {
  const { active, selectedIds, theme, setTheme, exitSelectMode } = usePrintSelectStore()
  const count = selectedIds.size

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base border-t border-border px-6 py-3 flex items-center justify-between gap-4 max-md:flex-col max-md:gap-2"
        >
          <span className="text-sm text-text-body">
            <span className="font-medium text-text-heading">{count}</span> item{count !== 1 ? 's' : ''} selected
          </span>

          <div className="flex items-center gap-2">
            <div className="flex rounded-[--radius-md] border border-border overflow-hidden">
              <button
                onClick={() => setTheme('themed')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'themed'
                    ? 'bg-primary-ghost text-primary-light'
                    : 'bg-bg-base text-text-muted hover:bg-bg-raised'
                }`}
              >
                Themed
              </button>
              <button
                onClick={() => setTheme('clean')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'clean'
                    ? 'bg-primary-ghost text-primary-light'
                    : 'bg-bg-base text-text-muted hover:bg-bg-raised'
                }`}
              >
                Clean
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
              Cancel
            </Button>
            <Button size="sm" onClick={onPrint} disabled={count === 0}>
              Print {count} Item{count !== 1 ? 's' : ''}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/export/pdf/usePrintSelectStore.ts app/src/components/ui/PrintSelectionBar.tsx
git commit -m "feat(pdf): add print select store and floating selection bar"
```

---

## Task 11: Session Page — Print Prep Sheet Button

**Files:**
- Modify: `src/features/sessions/SessionPage.tsx`

- [ ] **Step 1: Add print button to session header**

Read `SessionPage.tsx` and add:
1. Import: `import { generateSessionPrepPDF } from '@/lib/export/pdf/generate'`
2. A `useState` for theme: `const [pdfTheme, setPdfTheme] = useState<'themed' | 'clean'>('themed')`
3. A "Print Prep Sheet" button in the session header area, alongside existing action buttons.

The button should call `generateSessionPrepPDF(sessionId, campaignId, pdfTheme)` on click.

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/sessions/SessionPage.tsx
git commit -m "feat(pdf): add Print Prep Sheet button to session page"
```

---

## Task 12: Bestiary Page — Print Buttons + Multi-Select

**Files:**
- Modify: `src/features/bestiary/BestiaryPage.tsx`

- [ ] **Step 1: Add print functionality to bestiary**

Read `BestiaryPage.tsx` (and its child components like MonsterLibrary if separate) and add:
1. Import `generateMonsterPDF` and `generateBundlePDF` from `@/lib/export/pdf/generate`
2. Import `usePrintSelectStore` and `PrintSelectionBar`
3. A "Select" toggle button in the page header
4. When select mode is active, checkboxes on each monster card
5. Individual print icon buttons on each monster card (visible when not in select mode)
6. The `<PrintSelectionBar>` component at the bottom with an `onPrint` handler that builds `BundleItem[]` from selected monsters and calls `generateBundlePDF`

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/bestiary/BestiaryPage.tsx
git commit -m "feat(pdf): add print buttons and multi-select to bestiary page"
```

---

## Task 13: Spellbook, Characters, Locations — Print Buttons + Multi-Select

**Files:**
- Modify: `src/features/spellbook/SpellbookPage.tsx`
- Modify: `src/features/characters/CharactersPage.tsx`
- Modify: `src/features/characters/PCSheet.tsx`
- Modify: `src/features/locations/LocationsPage.tsx`

- [ ] **Step 1: Add print to SpellbookPage**

Same pattern as bestiary: Select toggle, checkboxes in select mode, individual print buttons, `PrintSelectionBar` with bundle generation. Uses `generateSpellPDF` for individual and `generateBundlePDF` for bundles.

- [ ] **Step 2: Add print to CharactersPage + PCSheet**

CharactersPage: Select toggle for multi-select PCs, `PrintSelectionBar` for bundles using `generateBundlePDF`.
PCSheet: Add a "Print" button in the header that calls `generatePCPDF`.

For PCs, fetching spell names and inventory for the PDF: call `fetchPCSpells([pc.id])` and `fetchCharacterInventory([pc.id])` before generating.

- [ ] **Step 3: Add print to LocationsPage**

Same pattern: Select toggle, checkboxes, individual print buttons, `PrintSelectionBar` with bundle. Uses `generateLocationPDF` for individual and `generateBundlePDF` for bundles. Pass the full locations array for hierarchy references.

- [ ] **Step 4: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/src/features/spellbook/SpellbookPage.tsx app/src/features/characters/CharactersPage.tsx app/src/features/characters/PCSheet.tsx app/src/features/locations/LocationsPage.tsx
git commit -m "feat(pdf): add print buttons and multi-select to spellbook, characters, and locations"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Full type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Build check**

```bash
cd app && npx vite build
```

Expected: Successful build.

- [ ] **Step 3: Manual walkthrough**

```bash
cd app && npm run dev
```

Test:

1. **Session prep sheet:** Navigate to a session with timeline blocks. Click "Print Prep Sheet". Verify PDF downloads with session header, recap, and embedded timeline content (stat blocks, NPC cards, spell cards).
2. **Individual monster print:** Navigate to bestiary. Click print icon on a monster. Verify PDF with full stat block.
3. **Multi-select bundle:** On bestiary, click "Select", check 3 monsters, click "Print 3 Items". Verify PDF with each monster on its own page.
4. **Theme toggle:** In multi-select bar, switch to "Clean" and print again. Verify white background, no parchment styling.
5. **Spellbook print:** Print a spell individually and as a bundle.
6. **Character print:** Print a PC from PCSheet.
7. **Location print:** Print a location individually.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues from manual PDF verification"
```

(Only if needed.)
