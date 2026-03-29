# Export & Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings page (profile, appearance, data export) and a campaign export engine that downloads markdown ZIPs.

**Architecture:** Client-side export using JSZip. Supabase queries in a utility module (not hooks). Zustand store for progress. Settings page as a new protected route with stacked sections. Gear icon in sidebar bottom area.

**Tech Stack:** React 19, Zustand, JSZip, Supabase client, TanStack Router, Tailwind CSS 4

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/export/slugify.ts` | Slug generation: lowercase, hyphens, dedup |
| `src/lib/export/markdown-formatters.ts` | One function per entity type → markdown string |
| `src/lib/export/campaign-exporter.ts` | Orchestrates: fetch all data, call formatters, build ZIP, trigger download |
| `src/features/settings/useExportStore.ts` | Zustand store for export progress/status |
| `src/features/settings/SettingsPage.tsx` | Main settings page with stacked sections |
| `src/features/settings/ProfileSection.tsx` | Change email / change password forms |
| `src/features/settings/AppearanceSection.tsx` | Light / Dark / System theme selector |
| `src/features/settings/DataExportSection.tsx` | Export All + per-campaign list with progress |

### Modified Files

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add gear icon linking to `/settings` in bottom actions |
| `src/routes/router.tsx` | Add `/settings` protected route |
| `src/features/campaigns/CampaignOverview.tsx` | Add "Export" button in campaign header |

### Dependencies

| Package | Purpose |
|---------|---------|
| `jszip` | ZIP file creation in browser |

---

## Task 1: Install JSZip

**Files:**
- Modify: `app/package.json`

- [ ] **Step 1: Install jszip**

```bash
cd app && npm install jszip
```

- [ ] **Step 2: Verify installation**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: add jszip dependency for campaign export"
```

---

## Task 2: Slugify Utility

**Files:**
- Create: `src/lib/export/slugify.ts`

- [ ] **Step 1: Create slugify.ts**

```typescript
// src/lib/export/slugify.ts

/**
 * Convert a string to a URL/filename-safe slug.
 * Lowercase, spaces to hyphens, strip special characters.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled'
}

/**
 * Generate unique slugs from a list of names.
 * Appends -2, -3, etc. for duplicates.
 */
export function uniqueSlugs(names: string[]): string[] {
  const counts = new Map<string, number>()
  return names.map((name) => {
    const base = slugify(name)
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count + 1}`
  })
}

/**
 * Zero-pad a session number for file ordering.
 */
export function padSessionNumber(n: number | null): string {
  return String(n ?? 0).padStart(2, '0')
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/slugify.ts
git commit -m "feat(export): add slugify utility for filename generation"
```

---

## Task 3: Markdown Formatters

**Files:**
- Create: `src/lib/export/markdown-formatters.ts`

This is the largest file — one pure function per entity type. Each takes typed data and returns a markdown string with YAML frontmatter.

- [ ] **Step 1: Create markdown-formatters.ts**

```typescript
// src/lib/export/markdown-formatters.ts

import type { Campaign, Session, PlayerCharacter, NPC, Monster, Spell, Handout } from '@/lib/types'

// Types imported from their hook files (not centralized in types.ts)
// We'll use inline types matching the DB shape for Location, Item, Battle, TimelineBlock

type TimelineBlock = {
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

type Location = {
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

type Item = {
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

type Battle = {
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

// ── Helpers ──

function frontmatter(fields: Record<string, unknown>): string {
  const lines = Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`
      return `${k}: ${v}`
    })
  return `---\n${lines.join('\n')}\n---`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

// ── Formatters ──

export function formatCampaign(
  campaign: Campaign,
  counts: { sessions: number; pcs: number; npcs: number; monsters: number; spells: number; locations: number }
): string {
  const fm = frontmatter({
    name: campaign.name,
    game_system: campaign.game_system,
    created: formatDate(campaign.created_at),
  })

  return `${fm}

# ${campaign.name}

## Description
${campaign.description || '_(no description)_'}

## Summary
- **Sessions:** ${counts.sessions}
- **PCs:** ${counts.pcs}
- **NPCs:** ${counts.npcs}
- **Monsters:** ${counts.monsters}
- **Spells:** ${counts.spells}
- **Locations:** ${counts.locations}
`
}

export function formatSession(
  session: Session,
  blocks: TimelineBlock[]
): string {
  const num = session.session_number ?? 0
  const fm = frontmatter({
    title: session.name,
    session_number: num,
    date: formatDate(session.scheduled_at),
    status: session.status,
  })

  let md = `${fm}

# Session ${num}: ${session.name}
`

  if (session.recap) {
    md += `\n## Recap\n${session.recap}\n`
  }

  if (session.notes) {
    md += `\n## Notes\n${session.notes}\n`
  }

  if (blocks.length > 0) {
    md += `\n## Timeline\n`
    for (const block of blocks) {
      md += `\n${formatTimelineBlock(block)}`
    }
  }

  return md
}

function formatTimelineBlock(block: TimelineBlock): string {
  const snap = block.content_snapshot || {}
  const type = block.block_type

  switch (type) {
    case 'scene':
    case 'note':
      return `### Scene: ${block.title}\n${(snap.content as string) || ''}\n`

    case 'battle': {
      const combatants = (snap.combatant_data as { name: string; hp_max?: number; armor_class?: number }[]) || []
      let text = `### Battle: ${block.title}\n**Combatants:**\n`
      for (const c of combatants) {
        text += `- ${c.name}${c.hp_max ? ` (HP: ${c.hp_max}` : ''}${c.armor_class ? `, AC: ${c.armor_class})` : ')'}\n`
      }
      return text
    }

    case 'handout':
      return `### Handout: ${block.title}\n${(snap.content as string) || (snap.body as string) || ''}\n`

    case 'monster':
    case 'npc':
    case 'spell':
    case 'location':
      return `### ${type.charAt(0).toUpperCase() + type.slice(1)}: ${block.title}\n${summarizeSnapshot(snap)}\n`

    default:
      return `### ${block.title}\n`
  }
}

function summarizeSnapshot(snap: Record<string, unknown>): string {
  const parts: string[] = []
  if (snap.hp || snap.hit_points) parts.push(`HP: ${snap.hp || snap.hit_points}`)
  if (snap.ac || snap.armor_class) parts.push(`AC: ${snap.ac || snap.armor_class}`)
  if (snap.level) parts.push(`Level: ${snap.level}`)
  if (snap.challenge_rating) parts.push(`CR: ${snap.challenge_rating}`)
  return parts.length > 0 ? parts.join(' | ') : ''
}

export function formatPC(
  pc: PlayerCharacter,
  spellNames: string[],
  inventoryItems: { name: string; quantity: number; equipped: boolean }[]
): string {
  const fm = frontmatter({
    name: pc.name,
    class: pc.class,
    level: pc.level,
    race: pc.race,
    player_name: pc.player_name,
  })

  const scores = pc.ability_scores
  const abilityTable = `| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| ${scores.strength} | ${scores.dexterity} | ${scores.constitution} | ${scores.intelligence} | ${scores.wisdom} | ${scores.charisma} |`

  let md = `${fm}

# ${pc.name}
**Level ${pc.level} ${pc.race || ''} ${pc.class || ''}**${pc.player_name ? ` — played by ${pc.player_name}` : ''}

## Ability Scores
${abilityTable}

## HP & Defense
- **HP:** ${pc.hp_current}/${pc.hp_max}${pc.hp_temp ? ` (+${pc.hp_temp} temp)` : ''}
- **AC:** ${pc.armor_class}
- **Speed:** ${pc.speed} ft.
- **Initiative:** +${pc.initiative_bonus}
`

  if (inventoryItems.length > 0) {
    md += `\n## Equipment\n`
    for (const item of inventoryItems) {
      md += `- ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}${item.equipped ? ' *(equipped)*' : ''}\n`
    }
  } else if (pc.equipment.length > 0) {
    md += `\n## Equipment\n`
    for (const e of pc.equipment) {
      md += `- ${e.name}${e.quantity && e.quantity > 1 ? ` (x${e.quantity})` : ''}\n`
    }
  }

  if (spellNames.length > 0) {
    md += `\n## Spells\n`
    for (const name of spellNames) {
      md += `- ${name}\n`
    }
  }

  if (pc.class_features.length > 0) {
    md += `\n## Class Features\n`
    for (const f of pc.class_features) {
      md += `- **${f.name}**${f.description ? ` — ${f.description}` : ''}\n`
    }
  }

  if (pc.traits.length > 0) {
    md += `\n## Traits\n`
    for (const t of pc.traits) {
      md += `- **${t.name}**${t.description ? ` — ${t.description}` : ''}\n`
    }
  }

  if (pc.backstory) {
    md += `\n## Backstory\n${pc.backstory}\n`
  }

  if (pc.notes) {
    md += `\n## Notes\n${pc.notes}\n`
  }

  return md
}

export function formatNPC(npc: NPC, spellNames: string[]): string {
  const fm = frontmatter({
    name: npc.name,
    source: 'homebrew',
  })

  let md = `${fm}

# ${npc.name}
`

  if (npc.race || npc.occupation) {
    md += `**${[npc.race, npc.occupation].filter(Boolean).join(' ')}**\n\n`
  }

  if (npc.personality) {
    md += `## Personality\n${npc.personality}\n\n`
  }

  if (npc.appearance) {
    md += `## Appearance\n${npc.appearance}\n\n`
  }

  const stats = npc.stats
  if (stats && (stats.hp || stats.ac)) {
    md += `## Stats\n`
    if (stats.ac) md += `- **AC:** ${stats.ac}\n`
    if (stats.hp) md += `- **HP:** ${stats.hp}\n`
    md += `\n`
  }

  if (npc.stat_block && Object.keys(npc.stat_block).length > 0) {
    md += `## Full Stat Block\n`
    md += formatStatBlockJSON(npc.stat_block)
    md += `\n`
  }

  if (spellNames.length > 0) {
    md += `## Spells\n`
    for (const name of spellNames) {
      md += `- ${name}\n`
    }
    md += `\n`
  }

  if (npc.notes) {
    md += `## Notes\n${npc.notes}\n`
  }

  return md
}

export function formatMonster(monster: Monster): string {
  const fm = frontmatter({
    name: monster.name,
    source: monster.source,
    srd_slug: monster.srd_slug,
    challenge_rating: monster.challenge_rating,
    source_book: monster.source_book,
  })

  const speedStr = Object.entries(monster.speed)
    .map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`)
    .join(', ')

  let md = `${fm}

# ${monster.name}
*${monster.size || ''} ${monster.type || ''}${monster.alignment ? `, ${monster.alignment}` : ''}*
${monster.source === 'srd' && monster.source_book ? `*Source: ${monster.source_book}*` : ''}

## Stats
- **AC:** ${monster.armor_class}${monster.armor_desc ? ` (${monster.armor_desc})` : ''}
- **HP:** ${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}
- **Speed:** ${speedStr}
- **Challenge Rating:** ${monster.challenge_rating || 'Unknown'}
`

  if (monster.stat_block && Object.keys(monster.stat_block).length > 0) {
    const sb = monster.stat_block

    // Ability scores
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    const hasAbilities = abilities.some((a) => sb[a] != null)
    if (hasAbilities) {
      md += `\n## Ability Scores\n`
      md += `| STR | DEX | CON | INT | WIS | CHA |\n|-----|-----|-----|-----|-----|-----|\n`
      md += `| ${abilities.map((a) => sb[a] ?? '-').join(' | ')} |\n`
    }

    // Actions
    const actions = sb.actions as { name: string; desc: string }[] | undefined
    if (actions && actions.length > 0) {
      md += `\n## Actions\n`
      for (const a of actions) {
        md += `- **${a.name}:** ${a.desc}\n`
      }
    }

    // Special abilities
    const specials = sb.special_abilities as { name: string; desc: string }[] | undefined
    if (specials && specials.length > 0) {
      md += `\n## Special Abilities\n`
      for (const a of specials) {
        md += `- **${a.name}:** ${a.desc}\n`
      }
    }

    // Legendary actions
    const legendary = sb.legendary_actions as { name: string; desc: string }[] | undefined
    if (legendary && legendary.length > 0) {
      md += `\n## Legendary Actions\n`
      for (const a of legendary) {
        md += `- **${a.name}:** ${a.desc}\n`
      }
    }
  }

  if (monster.notes) {
    md += `\n## Notes\n${monster.notes}\n`
  }

  return md
}

export function formatSpell(spell: Spell): string {
  const fm = frontmatter({
    name: spell.name,
    source: spell.source,
    level: spell.level,
    school: spell.school,
    classes: spell.classes,
    source_book: spell.source_book,
  })

  const levelLabel = spell.level === 0
    ? `${spell.school || ''} cantrip`
    : `${ordinal(spell.level)}-level ${spell.school || ''}`

  const tags = [
    spell.concentration ? 'Concentration' : null,
    spell.ritual ? 'Ritual' : null,
    spell.source === 'srd' ? 'SRD' : 'Homebrew',
  ].filter(Boolean).join(', ')

  // Prefer spell_data fields if available, fall back to columns
  const sd = spell.spell_data || {}

  let md = `${fm}

# ${spell.name}
*${levelLabel}* (${tags})

**Casting Time:** ${(sd.casting_time as string) || spell.casting_time || 'Unknown'}
**Range:** ${(sd.range as string) || spell.range || 'Unknown'}
**Components:** ${(sd.components as string) || spell.components || 'Unknown'}
**Duration:** ${(sd.duration as string) || spell.duration || 'Unknown'}
**Classes:** ${spell.classes.join(', ') || 'Unknown'}
`

  const desc = (sd.desc as string) || (sd.description as string)
  if (desc) {
    md += `\n${desc}\n`
  }

  const higherLevel = (sd.higher_level as string) || (sd.at_higher_levels as string)
  if (higherLevel) {
    md += `\n**At Higher Levels:** ${higherLevel}\n`
  }

  if (spell.notes) {
    md += `\n## Notes\n${spell.notes}\n`
  }

  return md
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function formatItem(item: Item): string {
  const fm = frontmatter({
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    source: item.source,
  })

  const typeLabel = item.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const tags = [
    item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : null,
    typeLabel,
    item.source === 'srd' ? 'SRD' : 'Homebrew',
  ].filter(Boolean).join(' ')

  let md = `${fm}

# ${item.name}
*${tags}*

## Description
${item.description || '_(no description)_'}

## Properties
- **Type:** ${typeLabel}
${item.rarity ? `- **Rarity:** ${item.rarity}\n` : ''}- **Stackable:** ${item.stackable ? 'Yes' : 'No'}
${item.cost ? `- **Cost:** ${item.cost}\n` : ''}`

  return md
}

export function formatLocation(
  location: Location,
  allLocations: Location[]
): string {
  const parent = location.parent_location_id
    ? allLocations.find((l) => l.id === location.parent_location_id)
    : null
  const children = allLocations.filter((l) => l.parent_location_id === location.id)

  const fm = frontmatter({
    name: location.name,
    type: location.type,
    parent: parent?.name || null,
  })

  let md = `${fm}

# ${location.name}
${location.type ? `*${location.type}*` : ''}
`

  if (parent) {
    md += `**Part of:** ${parent.name}\n\n`
  }

  if (location.description) {
    md += `## Description\n${location.description}\n\n`
  }

  if (children.length > 0) {
    md += `## Child Locations\n`
    for (const child of children) {
      md += `- ${child.name}\n`
    }
    md += `\n`
  }

  if (location.notes) {
    md += `## Notes\n${location.notes}\n`
  }

  return md
}

export function formatHandout(handout: Handout): string {
  const fm = frontmatter({
    name: handout.name,
    template: handout.template,
  })

  const content = handout.content || {}

  let md = `${fm}

# ${handout.name}
*Template: ${handout.template}*
`

  // Extract text content from the content JSON
  const body = (content.body as string) || (content.text as string) || (content.content as string)
  if (body) {
    md += `\n## Content\n${body}\n`
  }

  // Title, subtitle, etc.
  const title = content.title as string
  const subtitle = content.subtitle as string
  if (title && title !== handout.name) {
    md += `\n**Title:** ${title}\n`
  }
  if (subtitle) {
    md += `**Subtitle:** ${subtitle}\n`
  }

  if (handout.seal) {
    md += `\n## Seal\n`
    if (handout.seal.type === 'built') {
      md += `- **Ring Text:** ${handout.seal.ring_text}\n`
      md += `- **Shape:** ${handout.seal.shape}\n`
    } else {
      md += `*(Custom uploaded seal)*\n`
    }
  }

  return md
}

export function formatBattle(battle: Battle): string {
  const fm = frontmatter({
    name: battle.name,
    type: battle.type,
  })

  let md = `${fm}

# ${battle.name}
*${battle.type === 'template' ? 'Encounter Template' : 'Battle Save State'}*
`

  if (battle.combatant_data && battle.combatant_data.length > 0) {
    md += `\n## Combatants\n`
    md += `| Name | HP | AC | Initiative | Player? |\n`
    md += `|------|----|----|-----------|--------|\n`
    for (const c of battle.combatant_data) {
      md += `| ${c.name} | ${c.hp_max} | ${c.armor_class} | ${c.initiative} | ${c.is_player ? 'Yes' : 'No'} |\n`
    }
  }

  if (battle.notes) {
    md += `\n## Notes\n${battle.notes}\n`
  }

  return md
}

function formatStatBlockJSON(statBlock: Record<string, unknown>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(statBlock)) {
    if (value == null || value === '') continue
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    if (typeof value === 'object') {
      lines.push(`- **${label}:** ${JSON.stringify(value)}`)
    } else {
      lines.push(`- **${label}:** ${value}`)
    }
  }
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/markdown-formatters.ts
git commit -m "feat(export): add markdown formatters for all entity types"
```

---

## Task 4: Export Store (Zustand)

**Files:**
- Create: `src/features/settings/useExportStore.ts`

- [ ] **Step 1: Create useExportStore.ts**

```typescript
// src/features/settings/useExportStore.ts

import { create } from 'zustand'

interface ExportStore {
  status: 'idle' | 'exporting' | 'done' | 'error'
  progress: number
  currentStep: string
  error: string | null
  startExport: () => void
  setProgress: (progress: number, step: string) => void
  finish: () => void
  fail: (error: string) => void
  reset: () => void
}

export const useExportStore = create<ExportStore>((set) => ({
  status: 'idle',
  progress: 0,
  currentStep: '',
  error: null,

  startExport: () => set({
    status: 'exporting',
    progress: 0,
    currentStep: 'Starting export...',
    error: null,
  }),

  setProgress: (progress, step) => set({
    progress,
    currentStep: step,
  }),

  finish: () => set({
    status: 'done',
    progress: 100,
    currentStep: 'Export complete',
  }),

  fail: (error) => set({
    status: 'error',
    error,
    currentStep: 'Export failed',
  }),

  reset: () => set({
    status: 'idle',
    progress: 0,
    currentStep: '',
    error: null,
  }),
}))
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/settings/useExportStore.ts
git commit -m "feat(export): add Zustand store for export progress tracking"
```

---

## Task 5: Campaign Exporter (Core Engine)

**Files:**
- Create: `src/lib/export/campaign-exporter.ts`

This is the orchestrator. It fetches all data for a campaign, calls the formatters, builds the ZIP, and triggers a download.

- [ ] **Step 1: Create campaign-exporter.ts**

```typescript
// src/lib/export/campaign-exporter.ts

import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import { slugify, uniqueSlugs, padSessionNumber } from './slugify'
import {
  formatCampaign, formatSession, formatPC, formatNPC,
  formatMonster, formatSpell, formatItem, formatLocation,
  formatHandout, formatBattle,
} from './markdown-formatters'
import { useExportStore } from '@/features/settings/useExportStore'
import { useToastStore } from '@/lib/toast'
import type { Campaign } from '@/lib/types'

type ProgressCallback = (progress: number, step: string) => void

/**
 * Export a single campaign as a ZIP of markdown files and trigger download.
 */
export async function exportCampaign(campaignId: string, onProgress?: ProgressCallback): Promise<void> {
  const report = onProgress || useExportStore.getState().setProgress
  const zip = new JSZip()

  // 1. Fetch campaign
  report(5, 'Fetching campaign...')
  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  if (campErr || !campaign) throw new Error(campErr?.message || 'Campaign not found')

  const slug = slugify(campaign.name)
  const folder = zip.folder(slug)!

  // 2. Fetch all data in parallel
  report(10, 'Fetching campaign data...')
  const [
    { data: sessions },
    { data: pcs },
    { data: npcs },
    { data: monsters },
    { data: spells },
    { data: items },
    { data: locations },
    { data: handouts },
    { data: battles },
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('campaign_id', campaignId).order('session_number'),
    supabase.from('player_characters').select('*').eq('campaign_id', campaignId),
    supabase.from('npcs').select('*').eq('campaign_id', campaignId),
    supabase.from('monsters').select('*').eq('campaign_id', campaignId),
    supabase.from('spells').select('*').eq('campaign_id', campaignId),
    supabase.from('items').select('*').eq('campaign_id', campaignId),
    supabase.from('locations').select('*').eq('campaign_id', campaignId),
    supabase.from('handouts').select('*').eq('campaign_id', campaignId),
    supabase.from('battles').select('*').eq('campaign_id', campaignId),
  ])

  // 3. Campaign.md
  report(20, 'Building campaign overview...')
  folder.file('campaign.md', formatCampaign(campaign as Campaign, {
    sessions: sessions?.length ?? 0,
    pcs: pcs?.length ?? 0,
    npcs: npcs?.length ?? 0,
    monsters: monsters?.length ?? 0,
    spells: spells?.length ?? 0,
    locations: locations?.length ?? 0,
  }))

  // 4. Sessions (with timeline blocks)
  report(30, 'Exporting sessions...')
  if (sessions && sessions.length > 0) {
    const sessionsFolder = folder.folder('sessions')!
    // Fetch all timeline blocks for all sessions in one query
    const sessionIds = sessions.map((s: { id: string }) => s.id)
    const { data: allBlocks } = await supabase
      .from('timeline_blocks')
      .select('*')
      .in('session_id', sessionIds)
      .order('sort_order')

    for (const session of sessions) {
      const blocks = (allBlocks || []).filter((b: { session_id: string }) => b.session_id === session.id)
      const filename = `${padSessionNumber(session.session_number)}-${slugify(session.name)}.md`
      sessionsFolder.file(filename, formatSession(session, blocks))
    }
  }

  // 5. Characters (PCs with spells and inventory)
  report(45, 'Exporting characters...')
  if (pcs && pcs.length > 0) {
    const charsFolder = folder.folder('characters')!
    const pcIds = pcs.map((pc: { id: string }) => pc.id)

    const [{ data: pcSpells }, { data: inventory }] = await Promise.all([
      supabase.from('pc_spells').select('*, spells(name)').in('character_id', pcIds),
      supabase.from('character_inventory').select('*, items(name)').in('character_id', pcIds),
    ])

    const slugs = uniqueSlugs(pcs.map((pc: { name: string }) => pc.name))
    pcs.forEach((pc: { id: string; name: string }, i: number) => {
      const mySpells = (pcSpells || [])
        .filter((ps: { character_id: string }) => ps.character_id === pc.id)
        .map((ps: { spells: { name: string } | null }) => ps.spells?.name || 'Unknown')
      const myItems = (inventory || [])
        .filter((inv: { character_id: string }) => inv.character_id === pc.id)
        .map((inv: { items: { name: string } | null; quantity: number; equipped: boolean }) => ({
          name: inv.items?.name || 'Unknown',
          quantity: inv.quantity || 1,
          equipped: inv.equipped || false,
        }))
      charsFolder.file(`${slugs[i]}.md`, formatPC(pc as any, mySpells, myItems))
    })
  }

  // 6. NPCs (with spells)
  report(55, 'Exporting NPCs...')
  if (npcs && npcs.length > 0) {
    const npcsFolder = folder.folder('npcs')!
    const npcIds = npcs.map((n: { id: string }) => n.id)
    const { data: npcSpells } = await supabase
      .from('npc_spells')
      .select('*, spells(name)')
      .in('npc_id', npcIds)

    const slugs = uniqueSlugs(npcs.map((n: { name: string }) => n.name))
    npcs.forEach((npc: { id: string }, i: number) => {
      const mySpells = (npcSpells || [])
        .filter((ns: { npc_id: string }) => ns.npc_id === npc.id)
        .map((ns: { spells: { name: string } | null }) => ns.spells?.name || 'Unknown')
      npcsFolder.file(`${slugs[i]}.md`, formatNPC(npc as any, mySpells))
    })
  }

  // 7. Monsters
  report(65, 'Exporting monsters...')
  if (monsters && monsters.length > 0) {
    const monstersFolder = folder.folder('monsters')!
    const slugs = uniqueSlugs(monsters.map((m: { name: string }) => m.name))
    monsters.forEach((monster: any, i: number) => {
      monstersFolder.file(`${slugs[i]}.md`, formatMonster(monster))
    })
  }

  // 8. Spells
  report(72, 'Exporting spells...')
  if (spells && spells.length > 0) {
    const spellsFolder = folder.folder('spells')!
    const slugs = uniqueSlugs(spells.map((s: { name: string }) => s.name))
    spells.forEach((spell: any, i: number) => {
      spellsFolder.file(`${slugs[i]}.md`, formatSpell(spell))
    })
  }

  // 9. Items
  report(78, 'Exporting items...')
  if (items && items.length > 0) {
    const itemsFolder = folder.folder('items')!
    const slugs = uniqueSlugs(items.map((it: { name: string }) => it.name))
    items.forEach((item: any, i: number) => {
      itemsFolder.file(`${slugs[i]}.md`, formatItem(item))
    })
  }

  // 10. Locations
  report(84, 'Exporting locations...')
  if (locations && locations.length > 0) {
    const locsFolder = folder.folder('locations')!
    const slugs = uniqueSlugs(locations.map((l: { name: string }) => l.name))
    locations.forEach((loc: any, i: number) => {
      locsFolder.file(`${slugs[i]}.md`, formatLocation(loc, locations as any[]))
    })
  }

  // 11. Handouts
  report(90, 'Exporting handouts...')
  if (handouts && handouts.length > 0) {
    const handoutsFolder = folder.folder('handouts')!
    const slugs = uniqueSlugs(handouts.map((h: { name: string }) => h.name))
    handouts.forEach((handout: any, i: number) => {
      handoutsFolder.file(`${slugs[i]}.md`, formatHandout(handout))
    })
  }

  // 12. Battles
  report(95, 'Exporting battles...')
  if (battles && battles.length > 0) {
    const battlesFolder = folder.folder('battles')!
    const slugs = uniqueSlugs(battles.map((b: { name: string }) => b.name))
    battles.forEach((battle: any, i: number) => {
      battlesFolder.file(`${slugs[i]}.md`, formatBattle(battle))
    })
  }

  // 13. Generate and download
  report(98, 'Building ZIP...')
  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, `${slug}-export.zip`)
}

/**
 * Export all campaigns into a single ZIP.
 */
export async function exportAllCampaigns(): Promise<void> {
  const store = useExportStore.getState()
  store.startExport()

  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('name')

    if (error || !campaigns) throw new Error(error?.message || 'Failed to fetch campaigns')
    if (campaigns.length === 0) throw new Error('No campaigns to export')

    const zip = new JSZip()
    const total = campaigns.length

    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i]
      const campaignProgress = (progress: number, step: string) => {
        const overallProgress = Math.round(((i + progress / 100) / total) * 100)
        store.setProgress(overallProgress, `${campaign.name} (${i + 1}/${total}) — ${step}`)
      }

      // Build campaign ZIP content into a subfolder
      const innerZip = new JSZip()
      // We need to export into innerZip, then copy to main zip
      // Simpler approach: build each campaign the same way but into a subfolder
      await exportCampaignToFolder(zip, campaign.id, campaignProgress)
    }

    store.setProgress(98, 'Building ZIP...')
    const blob = await zip.generateAsync({ type: 'blob' })
    triggerDownload(blob, 'book-of-tricks-export.zip')
    store.finish()
    useToastStore.getState().addToast('success', 'All campaigns exported')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    store.fail(msg)
    useToastStore.getState().addToast('error', msg)
  }
}

/**
 * Export a single campaign into a folder within an existing JSZip instance.
 * Used by exportAllCampaigns to nest campaigns in one ZIP.
 */
async function exportCampaignToFolder(zip: JSZip, campaignId: string, onProgress: ProgressCallback): Promise<void> {
  // Same logic as exportCampaign but writes to the provided zip instead of creating a new one
  onProgress(5, 'Fetching campaign...')
  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  if (campErr || !campaign) throw new Error(campErr?.message || 'Campaign not found')

  const slug = slugify(campaign.name)
  const folder = zip.folder(slug)!

  onProgress(10, 'Fetching data...')
  const [
    { data: sessions },
    { data: pcs },
    { data: npcs },
    { data: monsters },
    { data: spells },
    { data: items },
    { data: locations },
    { data: handouts },
    { data: battles },
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('campaign_id', campaignId).order('session_number'),
    supabase.from('player_characters').select('*').eq('campaign_id', campaignId),
    supabase.from('npcs').select('*').eq('campaign_id', campaignId),
    supabase.from('monsters').select('*').eq('campaign_id', campaignId),
    supabase.from('spells').select('*').eq('campaign_id', campaignId),
    supabase.from('items').select('*').eq('campaign_id', campaignId),
    supabase.from('locations').select('*').eq('campaign_id', campaignId),
    supabase.from('handouts').select('*').eq('campaign_id', campaignId),
    supabase.from('battles').select('*').eq('campaign_id', campaignId),
  ])

  onProgress(20, 'Building markdown...')
  folder.file('campaign.md', formatCampaign(campaign as Campaign, {
    sessions: sessions?.length ?? 0,
    pcs: pcs?.length ?? 0,
    npcs: npcs?.length ?? 0,
    monsters: monsters?.length ?? 0,
    spells: spells?.length ?? 0,
    locations: locations?.length ?? 0,
  }))

  // Sessions with timeline blocks
  if (sessions && sessions.length > 0) {
    const sessionsFolder = folder.folder('sessions')!
    const sessionIds = sessions.map((s: { id: string }) => s.id)
    const { data: allBlocks } = await supabase
      .from('timeline_blocks')
      .select('*')
      .in('session_id', sessionIds)
      .order('sort_order')

    for (const session of sessions) {
      const blocks = (allBlocks || []).filter((b: { session_id: string }) => b.session_id === session.id)
      const filename = `${padSessionNumber(session.session_number)}-${slugify(session.name)}.md`
      sessionsFolder.file(filename, formatSession(session, blocks))
    }
  }

  onProgress(40, 'Exporting characters...')
  if (pcs && pcs.length > 0) {
    const charsFolder = folder.folder('characters')!
    const pcIds = pcs.map((pc: { id: string }) => pc.id)
    const [{ data: pcSpells }, { data: inventory }] = await Promise.all([
      supabase.from('pc_spells').select('*, spells(name)').in('character_id', pcIds),
      supabase.from('character_inventory').select('*, items(name)').in('character_id', pcIds),
    ])
    const slugs = uniqueSlugs(pcs.map((pc: { name: string }) => pc.name))
    pcs.forEach((pc: { id: string; name: string }, i: number) => {
      const mySpells = (pcSpells || [])
        .filter((ps: { character_id: string }) => ps.character_id === pc.id)
        .map((ps: { spells: { name: string } | null }) => ps.spells?.name || 'Unknown')
      const myItems = (inventory || [])
        .filter((inv: { character_id: string }) => inv.character_id === pc.id)
        .map((inv: { items: { name: string } | null; quantity: number; equipped: boolean }) => ({
          name: inv.items?.name || 'Unknown',
          quantity: inv.quantity || 1,
          equipped: inv.equipped || false,
        }))
      charsFolder.file(`${slugs[i]}.md`, formatPC(pc as any, mySpells, myItems))
    })
  }

  onProgress(55, 'Exporting NPCs...')
  if (npcs && npcs.length > 0) {
    const npcsFolder = folder.folder('npcs')!
    const npcIds = npcs.map((n: { id: string }) => n.id)
    const { data: npcSpells } = await supabase
      .from('npc_spells').select('*, spells(name)').in('npc_id', npcIds)
    const slugs = uniqueSlugs(npcs.map((n: { name: string }) => n.name))
    npcs.forEach((npc: { id: string }, i: number) => {
      const mySpells = (npcSpells || [])
        .filter((ns: { npc_id: string }) => ns.npc_id === npc.id)
        .map((ns: { spells: { name: string } | null }) => ns.spells?.name || 'Unknown')
      npcsFolder.file(`${slugs[i]}.md`, formatNPC(npc as any, mySpells))
    })
  }

  onProgress(70, 'Exporting content library...')
  if (monsters && monsters.length > 0) {
    const monstersFolder = folder.folder('monsters')!
    const slugs = uniqueSlugs(monsters.map((m: { name: string }) => m.name))
    monsters.forEach((m: any, i: number) => monstersFolder.file(`${slugs[i]}.md`, formatMonster(m)))
  }
  if (spells && spells.length > 0) {
    const spellsFolder = folder.folder('spells')!
    const slugs = uniqueSlugs(spells.map((s: { name: string }) => s.name))
    spells.forEach((s: any, i: number) => spellsFolder.file(`${slugs[i]}.md`, formatSpell(s)))
  }
  if (items && items.length > 0) {
    const itemsFolder = folder.folder('items')!
    const slugs = uniqueSlugs(items.map((it: { name: string }) => it.name))
    items.forEach((it: any, i: number) => itemsFolder.file(`${slugs[i]}.md`, formatItem(it)))
  }

  onProgress(85, 'Exporting locations & handouts...')
  if (locations && locations.length > 0) {
    const locsFolder = folder.folder('locations')!
    const slugs = uniqueSlugs(locations.map((l: { name: string }) => l.name))
    locations.forEach((l: any, i: number) => locsFolder.file(`${slugs[i]}.md`, formatLocation(l, locations as any[])))
  }
  if (handouts && handouts.length > 0) {
    const handoutsFolder = folder.folder('handouts')!
    const slugs = uniqueSlugs(handouts.map((h: { name: string }) => h.name))
    handouts.forEach((h: any, i: number) => handoutsFolder.file(`${slugs[i]}.md`, formatHandout(h)))
  }
  if (battles && battles.length > 0) {
    const battlesFolder = folder.folder('battles')!
    const slugs = uniqueSlugs(battles.map((b: { name: string }) => b.name))
    battles.forEach((b: any, i: number) => battlesFolder.file(`${slugs[i]}.md`, formatBattle(b)))
  }

  onProgress(100, 'Done')
}

/**
 * Export a single campaign with toast-based progress (for quick export from campaign menu).
 */
export async function exportCampaignWithToasts(campaignId: string, campaignName: string): Promise<void> {
  const toast = useToastStore.getState()
  toast.addToast('info', `Exporting ${campaignName}...`)

  try {
    await exportCampaign(campaignId, (_progress, step) => {
      // Toasts are fire-and-forget, we just show the final result
    })
    toast.addToast('success', `${campaignName} exported`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    toast.addToast('error', `Export failed: ${msg}`)
  }
}

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
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

Fix any type errors. Common issues will be around the Supabase `.select('*')` return types — use `as any` casts at the boundaries since we're working outside the typed hook layer.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/export/campaign-exporter.ts
git commit -m "feat(export): add campaign exporter engine with ZIP generation"
```

---

## Task 6: Settings Page — Shell + Route

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`
- Modify: `src/routes/router.tsx`

- [ ] **Step 1: Create SettingsPage.tsx**

```tsx
// src/features/settings/SettingsPage.tsx

import { FadeIn } from '@/components/motion'
import { OrnamentalDivider } from '@/components/ui/OrnamentalDivider'
import { ProfileSection } from './ProfileSection'
import { AppearanceSection } from './AppearanceSection'
import { DataExportSection } from './DataExportSection'

export function SettingsPage() {
  return (
    <div className="min-h-dvh bg-bg-deep">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <FadeIn>
          <h1 className="text-3xl gold-foil mb-2">Settings</h1>
          <p className="text-text-secondary mb-10">Manage your account, appearance, and data.</p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <ProfileSection />
        </FadeIn>

        <OrnamentalDivider />

        <FadeIn delay={0.1}>
          <AppearanceSection />
        </FadeIn>

        <OrnamentalDivider />

        <FadeIn delay={0.15}>
          <DataExportSection />
        </FadeIn>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route to router.tsx**

Add import at top of `src/routes/router.tsx`:

```typescript
import { SettingsPage } from '@/features/settings/SettingsPage'
```

Add route definition after `reportRoute`:

```typescript
// Protected: Settings
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
  beforeLoad: () => {
    const { user, loading } = useAuth.getState()
    if (!loading && !user) {
      throw redirect({ to: '/login' })
    }
  },
})
```

Add `settingsRoute` to the route tree:

```typescript
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  featureRoute,
  homeRoute,
  feedbackRoute,
  reportRoute,
  settingsRoute,
  campaignRoute.addChildren([
    // ... existing children
  ]),
])
```

- [ ] **Step 3: Create placeholder section components** (so the page renders)

Create `src/features/settings/ProfileSection.tsx`:

```tsx
export function ProfileSection() {
  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Profile</h2>
      <p className="text-text-muted text-sm mb-6">Update your email and password.</p>
      <p className="text-text-secondary text-sm">Coming soon.</p>
    </section>
  )
}
```

Create `src/features/settings/AppearanceSection.tsx`:

```tsx
export function AppearanceSection() {
  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Appearance</h2>
      <p className="text-text-muted text-sm mb-6">Choose your theme.</p>
      <p className="text-text-secondary text-sm">Coming soon.</p>
    </section>
  )
}
```

Create `src/features/settings/DataExportSection.tsx`:

```tsx
export function DataExportSection() {
  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Data & Export</h2>
      <p className="text-text-muted text-sm mb-6">Download your campaign data.</p>
      <p className="text-text-secondary text-sm">Coming soon.</p>
    </section>
  )
}
```

- [ ] **Step 4: Type-check and verify**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/src/features/settings/ app/src/routes/router.tsx
git commit -m "feat(settings): add settings page shell with route and placeholder sections"
```

---

## Task 7: Sidebar Gear Icon

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add GiCog import**

In `Sidebar.tsx`, add `GiCog` to the existing icon import:

```typescript
import {
  GiCrossedSwords, GiThreeFriends, GiSpikedDragonHead, GiSparkles,
  GiPositionMarker, GiRollingDices, GiNotebook, GiScrollUnfurled, GiCastle,
  GiOpenBook, GiChatBubble, GiBugNet, GiSun, GiMoonBats, GiQuillInk, GiCog,
} from '@/components/ui/icons'
```

- [ ] **Step 2: Add Settings link in bottom actions**

In the `{/* Bottom actions */}` section of the Sidebar, add a Settings link **before** the "All Campaigns" link. Add this block:

```tsx
        <Link
          to="/settings"
          className={`
            flex items-center gap-3 rounded-[--radius-md] min-h-[44px]
            transition-colors duration-[--duration-fast]
            ${expanded ? 'px-3' : 'justify-center'}
            ${currentPath === '/settings'
              ? 'bg-primary-ghost text-primary-light'
              : 'text-text-muted hover:text-text-body hover:bg-bg-raised'
            }
          `}
          title={expanded ? undefined : 'Settings'}
        >
          <GameIcon icon={GiCog} size="base" />
          {expanded && <span className="text-sm font-medium">Settings</span>}
        </Link>
```

- [ ] **Step 3: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Visual verification**

```bash
cd app && npm run dev
```

Open the app, navigate to a campaign. The gear icon should appear in the sidebar bottom area. Clicking it should navigate to `/settings` and show the placeholder settings page.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/layout/Sidebar.tsx
git commit -m "feat(settings): add gear icon to sidebar linking to settings page"
```

---

## Task 8: Profile Section (Email + Password)

**Files:**
- Modify: `src/features/settings/ProfileSection.tsx`

- [ ] **Step 1: Implement ProfileSection**

Replace the placeholder with the full implementation:

```tsx
// src/features/settings/ProfileSection.tsx

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToastStore } from '@/lib/toast'

export function ProfileSection() {
  const user = useAuth((s) => s.user)
  const [email, setEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleUpdateEmail = async () => {
    if (!email || email === user?.email) return
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setEmailLoading(false)
    if (error) {
      useToastStore.getState().addToast('error', error.message)
    } else {
      useToastStore.getState().addToast('success', 'Confirmation email sent to your new address')
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      useToastStore.getState().addToast('error', 'Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      useToastStore.getState().addToast('error', error.message)
    } else {
      setNewPassword('')
      useToastStore.getState().addToast('success', 'Password updated')
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Profile</h2>
      <p className="text-text-muted text-sm mb-6">Update your email and password.</p>

      <div className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm text-text-body mb-1.5">Email</label>
          <div className="flex gap-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleUpdateEmail}
              disabled={emailLoading || email === user?.email}
            >
              {emailLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-text-body mb-1.5">New Password</label>
          <div className="flex gap-3">
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="Enter new password"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleUpdatePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/src/features/settings/ProfileSection.tsx
git commit -m "feat(settings): implement profile section with email and password change"
```

---

## Task 9: Appearance Section (Theme Toggle)

**Files:**
- Modify: `src/features/settings/AppearanceSection.tsx`

- [ ] **Step 1: Implement AppearanceSection**

Replace the placeholder:

```tsx
// src/features/settings/AppearanceSection.tsx

import { useTheme } from '@/lib/theme'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiSun, GiMoonBats, GiCog } from '@/components/ui/icons'

type ThemeOption = { value: 'light' | 'dark' | 'system'; label: string; icon: typeof GiSun }

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: GiSun },
  { value: 'dark', label: 'Dark', icon: GiMoonBats },
  { value: 'system', label: 'System', icon: GiCog },
]

export function AppearanceSection() {
  const preference = useTheme((s) => s.preference)
  const setPreference = useTheme((s) => s.setPreference)

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Appearance</h2>
      <p className="text-text-muted text-sm mb-6">Choose your theme.</p>

      <div className="flex gap-2">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPreference(opt.value)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-[--radius-md]
              text-sm font-medium transition-all duration-[--duration-fast] cursor-pointer
              border
              ${preference === opt.value
                ? 'bg-primary-ghost text-primary-light border-primary/30'
                : 'bg-bg-base text-text-muted border-border hover:text-text-body hover:bg-bg-raised hover:border-border-hover'
              }
            `}
          >
            <GameIcon icon={opt.icon} size="sm" />
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Visual verification**

Open the settings page. Click through Light/Dark/System. The theme should change immediately and persist on page reload.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/settings/AppearanceSection.tsx
git commit -m "feat(settings): implement appearance section with theme toggle"
```

---

## Task 10: Data Export Section

**Files:**
- Modify: `src/features/settings/DataExportSection.tsx`

- [ ] **Step 1: Implement DataExportSection**

Replace the placeholder:

```tsx
// src/features/settings/DataExportSection.tsx

import { useCampaigns } from '@/features/campaigns/useCampaigns'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled } from '@/components/ui/icons'
import { GAME_SYSTEMS } from '@/lib/types'
import { useExportStore } from './useExportStore'
import { exportCampaign, exportAllCampaigns } from '@/lib/export/campaign-exporter'
import { useToastStore } from '@/lib/toast'

export function DataExportSection() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { status, progress, currentStep } = useExportStore()
  const isExporting = status === 'exporting'

  const handleExportAll = () => {
    exportAllCampaigns()
  }

  const handleExportSingle = async (campaignId: string, campaignName: string) => {
    const store = useExportStore.getState()
    store.startExport()
    try {
      await exportCampaign(campaignId)
      store.finish()
      useToastStore.getState().addToast('success', `${campaignName} exported`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      store.fail(msg)
      useToastStore.getState().addToast('error', msg)
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Data & Export</h2>
      <p className="text-text-muted text-sm mb-6">Download your campaign data as markdown files in a ZIP archive.</p>

      {/* Progress bar */}
      {isExporting && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>{currentStep}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-bg-base rounded-full border border-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Export All */}
      <div className="mb-8">
        <Button onClick={handleExportAll} disabled={isExporting || !campaigns?.length}>
          {isExporting ? 'Exporting...' : 'Export All Campaigns'}
        </Button>
      </div>

      {/* Per-campaign list */}
      <div>
        <h3 className="text-sm text-text-muted uppercase tracking-wider mb-3">Individual Campaigns</h3>
        {isLoading ? (
          <p className="text-text-muted text-sm">Loading campaigns...</p>
        ) : !campaigns?.length ? (
          <p className="text-text-muted text-sm">No campaigns found.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => {
              const system = GAME_SYSTEMS.find((s) => s.value === campaign.game_system)
              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-bg-base rounded-[--radius-md] border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GameIcon icon={GiScrollUnfurled} size="sm" className="text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-body truncate">{campaign.name}</p>
                      <p className="text-xs text-text-muted">{system?.label ?? campaign.game_system}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExportSingle(campaign.id, campaign.name)}
                    disabled={isExporting}
                  >
                    Export
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Visual verification**

Open the settings page. The Data & Export section should list all campaigns with export buttons, plus an "Export All Campaigns" button. Click an export button — it should show the progress bar and trigger a ZIP download.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/settings/DataExportSection.tsx
git commit -m "feat(settings): implement data export section with progress bar"
```

---

## Task 11: Campaign Quick Export (Overview Page)

**Files:**
- Modify: `src/features/campaigns/CampaignOverview.tsx`

- [ ] **Step 1: Add export button to campaign header**

In `CampaignOverview.tsx`, add the import:

```typescript
import { exportCampaignWithToasts } from '@/lib/export/campaign-exporter'
```

Add an "Export" button in the campaign header area, next to the game system badge. Find this section:

```tsx
<div className="flex items-start justify-between gap-4 mb-2">
  <h2 className="text-2xl gold-foil">{campaign.name}</h2>
  <span className="text-xs text-text-muted bg-bg-raised px-2.5 py-1 rounded-[--radius-sm] border border-border whitespace-nowrap mt-1">
    {system?.label ?? campaign.game_system}
  </span>
</div>
```

Replace with:

```tsx
<div className="flex items-start justify-between gap-4 mb-2">
  <h2 className="text-2xl gold-foil">{campaign.name}</h2>
  <div className="flex items-center gap-2 mt-1">
    <Button
      size="sm"
      variant="ghost"
      onClick={() => exportCampaignWithToasts(campaign.id, campaign.name)}
    >
      Export
    </Button>
    <span className="text-xs text-text-muted bg-bg-raised px-2.5 py-1 rounded-[--radius-sm] border border-border whitespace-nowrap">
      {system?.label ?? campaign.game_system}
    </span>
  </div>
</div>
```

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Visual verification**

Navigate to a campaign overview page. An "Export" button should appear in the header. Clicking it should show a toast and trigger a ZIP download.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/campaigns/CampaignOverview.tsx
git commit -m "feat(export): add quick export button to campaign overview header"
```

---

## Task 12: Remove Theme Toggle from Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

Now that theme lives in the Settings page, remove the old theme toggle button from the sidebar bottom to avoid duplication.

- [ ] **Step 1: Remove theme toggle button from Sidebar**

In `Sidebar.tsx`, remove the theme toggle button block (the `<button onClick={toggleTheme} ...>` block in the bottom actions section). Also remove the `resolved` and `toggleTheme` lines from the component body:

```typescript
const resolved = useTheme((s) => s.resolved)
const toggleTheme = useTheme((s) => s.toggle)
```

And remove `GiSun, GiMoonBats` from the import if they're no longer used elsewhere in the file. Also remove the `useTheme` import if no longer needed.

- [ ] **Step 2: Type-check**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 3: Verify sidebar still works**

Open the app. The sidebar should no longer have the sun/moon theme toggle, but the gear icon (Settings) and other buttons should still be there.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/layout/Sidebar.tsx
git commit -m "refactor(sidebar): move theme toggle to settings page, remove from sidebar"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Full type-check**

```bash
cd app && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Build check**

```bash
cd app && npx vite build
```

Expected: Successful build with no errors.

- [ ] **Step 3: Manual walkthrough**

```bash
cd app && npm run dev
```

Test the following:

1. **Sidebar:** Gear icon visible in bottom actions → navigates to `/settings`
2. **Settings page:** Three sections visible — Profile, Appearance, Data & Export
3. **Profile:** Email field pre-filled, password field empty. Update buttons work.
4. **Appearance:** Light/Dark/System buttons. Clicking changes theme immediately and persists on reload.
5. **Data Export:** Campaign list loads. "Export" per-campaign triggers ZIP download. "Export All" triggers combined ZIP download. Progress bar shows during export.
6. **Campaign Overview:** "Export" button in header triggers toast-based export + ZIP download.
7. **ZIP contents:** Unzip a downloaded file. Verify folder structure matches spec: campaign.md, sessions/, characters/, npcs/, monsters/, spells/, items/, locations/, handouts/, battles/
8. **Markdown quality:** Open a few markdown files. Verify YAML frontmatter, readable formatting, source tags on SRD content.

- [ ] **Step 4: Commit any fixes from verification**

```bash
git add -A
git commit -m "fix: address issues from manual verification"
```

(Only if needed.)
