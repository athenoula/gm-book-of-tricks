# Timeline Inline Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "expanded" state to timeline block cards that shows the full content of library items (monsters, NPCs, locations, handouts, spells) inline on the timeline.

**Architecture:** Three-state cycle (collapsed → compact → expanded) driven by title click. Expanded state is local React state. Full-view components render all data from enriched `content_snapshot` JSONB. No DB migration needed.

**Tech Stack:** React 19, Tailwind CSS 4, motion/react (Framer Motion v12), existing design tokens from `index.css`

---

### Task 1: Enrich ContentDrawer Snapshots

**Files:**
- Modify: `app/src/features/timeline/ContentDrawer.tsx:111-138` (addPC, addNPC functions)
- Modify: `app/src/features/timeline/ContentDrawer.tsx:169-178` (MonsterItems snapshot)
- Modify: `app/src/features/timeline/ContentDrawer.tsx:206-211` (SpellItems snapshot)
- Modify: `app/src/features/timeline/ContentDrawer.tsx:239-240` (LocationItems snapshot)
- Modify: `app/src/features/timeline/ContentDrawer.tsx:312-314` (HandoutItems snapshot)

- [ ] **Step 1: Enrich the NPC snapshot in `addNPC`**

In `ContentDrawer.tsx`, find the `addNPC` function (line 128). Replace the `content_snapshot` object:

```tsx
const addNPC = (npc: NPC) => {
  onAdd({
    block_type: 'npc',
    source_id: npc.id,
    title: `${npc.name}${npc.occupation ? ` — ${npc.occupation}` : ''}`,
    content_snapshot: {
      name: npc.name, race: npc.race, occupation: npc.occupation,
      personality: npc.personality, appearance: npc.appearance,
      notes: npc.notes, stats: npc.stats,
      portrait_url: npc.portrait_url, stat_block: npc.stat_block,
    },
  })
}
```

- [ ] **Step 2: Enrich the PC-as-NPC snapshot in `addPC`**

In `ContentDrawer.tsx`, find the `addPC` function (line 111). Replace the `content_snapshot` object:

```tsx
const addPC = (pc: PlayerCharacter) => {
  const scores = pc.ability_scores as AbilityScores
  onAdd({
    block_type: 'npc',
    source_id: pc.id,
    title: `${pc.name} — ${[pc.race, pc.class].filter(Boolean).join(' ')} Lvl ${pc.level}`,
    content_snapshot: {
      name: pc.name, race: pc.race, class: pc.class, level: pc.level,
      hp_current: pc.hp_current, hp_max: pc.hp_max, armor_class: pc.armor_class,
      speed: pc.speed, initiative_bonus: pc.initiative_bonus,
      ability_scores: scores,
      personality_traits: pc.personality_traits, notes: pc.notes,
      player_name: pc.player_name, is_pc: true,
      portrait_url: pc.portrait_url, subclass: pc.subclass,
      background: pc.background, alignment: pc.alignment,
      proficiency_bonus: pc.proficiency_bonus,
      saving_throw_proficiencies: pc.saving_throw_proficiencies,
      skill_proficiencies: pc.skill_proficiencies,
      equipment: pc.equipment, class_features: pc.class_features,
      traits: pc.traits, ideals: pc.ideals, bonds: pc.bonds,
      flaws: pc.flaws, backstory: pc.backstory, appearance: pc.appearance,
      spellcasting_ability: pc.spellcasting_ability,
    },
  })
}
```

- [ ] **Step 3: Enrich the Monster snapshot**

In `ContentDrawer.tsx`, find the `MonsterItems` onAdd call (line 169). Add `armor_desc` and `notes`:

```tsx
onAdd={() => onAdd({
  block_type: 'monster',
  source_id: m.id,
  title: `${m.name} — CR ${m.challenge_rating}`,
  content_snapshot: {
    name: m.name, size: m.size, type: m.type, alignment: m.alignment,
    challenge_rating: m.challenge_rating, armor_class: m.armor_class,
    hit_points: m.hit_points, hit_dice: m.hit_dice, speed: m.speed,
    stat_block: m.stat_block,
    armor_desc: m.armor_desc, notes: m.notes,
  },
})}
```

- [ ] **Step 4: Enrich the Spell snapshot**

In `ContentDrawer.tsx`, find the `SpellItems` onAdd call (line 206). Add `classes` and `notes`:

```tsx
onAdd={() => onAdd({
  block_type: 'spell',
  source_id: s.id,
  title: `${s.name} — ${s.level === 0 ? 'Cantrip' : `Level ${s.level}`}`,
  content_snapshot: {
    name: s.name, level: s.level, school: s.school,
    casting_time: s.casting_time, range: s.range, duration: s.duration,
    concentration: s.concentration, ritual: s.ritual, components: s.components,
    spell_data: s.spell_data,
    classes: s.classes, notes: s.notes,
  },
})}
```

- [ ] **Step 5: Enrich the Location snapshot**

In `ContentDrawer.tsx`, find the `LocationItems` onAdd call (line 239). Add `image_url` and `map_url`:

```tsx
onAdd={() => onAdd({
  block_type: 'location',
  source_id: l.id,
  title: l.name,
  content_snapshot: {
    name: l.name, type: l.type, description: l.description, notes: l.notes,
    image_url: l.image_url, map_url: l.map_url,
  },
})}
```

- [ ] **Step 6: Enrich the Handout snapshot**

In `ContentDrawer.tsx`, find the `HandoutItems` onAdd call (line 312). Add `image_url`:

```tsx
onAdd={() => onAdd({
  block_type: 'handout',
  source_id: h.id,
  title: h.name,
  content_snapshot: {
    template: h.template,
    content: h.content,
    style: h.style,
    seal: h.seal,
    image_url: h.image_url,
  },
})}
```

- [ ] **Step 7: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add app/src/features/timeline/ContentDrawer.tsx
git commit -m "feat(timeline): enrich content snapshots with full data for expanded views"
```

---

### Task 2: Three-State Logic in TimelineBlockCard

**Files:**
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx:30-35` (Props interface)
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx:37-50` (component state + toggleCollapse)
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx:77-110` (card wrapper + header rendering)
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx:143-160` (content area)

- [ ] **Step 1: Add `isExpanded` and `onToggleExpand` props**

In `TimelineBlockCard.tsx`, update the `Props` interface and component signature:

```tsx
interface Props {
  block: TimelineBlock
  dragHandleProps?: Record<string, unknown>
  onPin?: () => void
  isPinned?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function TimelineBlockCard({ block, dragHandleProps, onPin, isPinned, isExpanded, onToggleExpand }: Props) {
```

- [ ] **Step 2: Replace `toggleCollapse` with three-state `handleTitleClick`**

Replace the `toggleCollapse` function (line 48-50) with:

```tsx
const handleTitleClick = () => {
  if (block.is_collapsed) {
    // collapsed → compact
    updateBlock.mutate({ id: block.id, is_collapsed: false })
  } else if (!isExpanded) {
    // compact → expanded
    onToggleExpand?.()
  } else {
    // expanded → collapsed
    onToggleExpand?.()
    updateBlock.mutate({ id: block.id, is_collapsed: true })
  }
}
```

- [ ] **Step 3: Update the card wrapper with expanded visual cues**

Replace the outer `<div>` (line 78) with:

```tsx
<div className={`bg-bg-base rounded-[--radius-lg] border border-l-3 ${style.borderColor} ornamental-corners ${
  isExpanded
    ? 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
    : 'border-border'
}`}>
```

- [ ] **Step 4: Update the header with expanded background and chevron**

Replace the header `<div>` (line 80) with:

```tsx
<div className={`flex items-center gap-2 px-4 py-3 border-b border-border ${isExpanded ? 'bg-bg-raised' : ''}`}>
```

Then update the title button (line 98-110) — replace `onClick={toggleCollapse}` with `onClick={handleTitleClick}` and update the chevron:

```tsx
<button
  onClick={handleTitleClick}
  className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
>
  <GameIcon icon={style.icon} size="sm" />
  <span className="text-sm font-medium text-text-heading truncate flex-1">
    {block.title}
  </span>
  <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
    {style.label}
  </span>
  <span className={`text-xs ${isExpanded ? 'text-amber-500' : 'text-text-muted'}`}>
    {block.is_collapsed ? '▸' : isExpanded ? '▼' : '▾'}
  </span>
</button>
```

- [ ] **Step 5: Update the content area to render expanded views**

Replace the content section (lines 143-160) with:

```tsx
{/* Content: compact view */}
{!block.is_collapsed && !isExpanded && !editingNote && (
  <div className="px-4 py-3">
    {block.block_type === 'monster' && <MonsterSnapshot data={snapshot} />}
    {block.block_type === 'npc' && <NPCSnapshot data={snapshot} />}
    {block.block_type === 'spell' && <SpellSnapshot data={snapshot} />}
    {block.block_type === 'location' && <LocationSnapshot data={snapshot} />}
    {block.block_type === 'handout' && <HandoutSnapshot data={snapshot} />}
    {block.block_type === 'battle' && !editingBattle && <InlineBattle block={block} />}
  </div>
)}

{/* Content: note editing (always visible when editing) */}
{!block.is_collapsed && block.block_type === 'note' && (
  <div className="px-4 py-3">
    <SceneEditor
      content={editingNote ? editContent : (snapshot.content as string) || ''}
      editable={editingNote}
      onChange={(json) => setEditContent(json)}
    />
  </div>
)}

{/* Content: expanded full view */}
{isExpanded && !block.is_collapsed && (
  <div className="px-4 py-3">
    {block.block_type === 'monster' && <MonsterFullView data={snapshot} />}
    {block.block_type === 'npc' && <NPCFullView data={snapshot} />}
    {block.block_type === 'spell' && <SpellFullView data={snapshot} />}
    {block.block_type === 'location' && <LocationFullView data={snapshot} />}
    {block.block_type === 'handout' && <HandoutFullView data={snapshot} />}
    {block.block_type === 'battle' && !editingBattle && <InlineBattle block={block} />}
  </div>
)}
```

- [ ] **Step 6: Add imports for full-view components**

At the top of `TimelineBlockCard.tsx`, add:

```tsx
import { MonsterFullView } from './full-views/MonsterFullView'
import { NPCFullView } from './full-views/NPCFullView'
import { SpellFullView } from './full-views/SpellFullView'
import { LocationFullView } from './full-views/LocationFullView'
import { HandoutFullView } from './full-views/HandoutFullView'
```

Note: These files don't exist yet — they'll be created in Tasks 4-8. For now, the app won't compile. That's expected. If you want to verify intermediate progress, you can create stub files first (see Step 7).

- [ ] **Step 7: Create stub full-view components so the app compiles**

Create five stub files so the app compiles while we build the real components in later tasks:

`app/src/features/timeline/full-views/MonsterFullView.tsx`:
```tsx
export function MonsterFullView({ data }: { data: Record<string, unknown> }) {
  return <div className="text-sm text-text-muted italic">Full monster view (coming soon)</div>
}
```

`app/src/features/timeline/full-views/NPCFullView.tsx`:
```tsx
export function NPCFullView({ data }: { data: Record<string, unknown> }) {
  return <div className="text-sm text-text-muted italic">Full NPC view (coming soon)</div>
}
```

`app/src/features/timeline/full-views/SpellFullView.tsx`:
```tsx
export function SpellFullView({ data }: { data: Record<string, unknown> }) {
  return <div className="text-sm text-text-muted italic">Full spell view (coming soon)</div>
}
```

`app/src/features/timeline/full-views/LocationFullView.tsx`:
```tsx
export function LocationFullView({ data }: { data: Record<string, unknown> }) {
  return <div className="text-sm text-text-muted italic">Full location view (coming soon)</div>
}
```

`app/src/features/timeline/full-views/HandoutFullView.tsx`:
```tsx
export function HandoutFullView({ data }: { data: Record<string, unknown> }) {
  return <div className="text-sm text-text-muted italic">Full handout view (coming soon)</div>
}
```

- [ ] **Step 8: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add app/src/features/timeline/TimelineBlockCard.tsx app/src/features/timeline/full-views/
git commit -m "feat(timeline): add three-state title click cycle and expanded view scaffolding"
```

---

### Task 3: Wire Up Expanded State in SessionTimeline

**Files:**
- Modify: `app/src/features/timeline/SessionTimeline.tsx:1` (imports)
- Modify: `app/src/features/timeline/SessionTimeline.tsx:23-31` (state)
- Modify: `app/src/features/timeline/SessionTimeline.tsx:182-187` (pinned block rendering)
- Modify: `app/src/features/timeline/SessionTimeline.tsx:220-225` (timeline block rendering)

- [ ] **Step 1: Add `expandedBlockIds` state**

In `SessionTimeline.tsx`, after the `pinnedItemId` state (line 31), add:

```tsx
const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())

const toggleExpand = (blockId: string) => {
  setExpandedBlockIds((prev) => {
    const next = new Set(prev)
    if (next.has(blockId)) {
      next.delete(blockId)
    } else {
      next.add(blockId)
    }
    return next
  })
}
```

- [ ] **Step 2: Pass expanded props to pinned TimelineBlockCard**

In the pinned item section (line 182-187), update the `TimelineBlockCard` rendering:

```tsx
<TimelineBlockCard
  block={pinned.data}
  dragHandleProps={undefined}
  isPinned={true}
  onPin={() => handlePin(pinned.data.id)}
  isExpanded={expandedBlockIds.has(pinned.data.id)}
  onToggleExpand={() => toggleExpand(pinned.data.id)}
/>
```

- [ ] **Step 3: Pass expanded props to timeline TimelineBlockCard**

In the main timeline list (line 220-225), update the `TimelineBlockCard` rendering:

```tsx
<TimelineBlockCard
  block={item.data}
  dragHandleProps={provided.dragHandleProps ?? undefined}
  onPin={() => handlePin(item.data.id)}
  isPinned={pinnedItemId === item.data.id}
  isExpanded={expandedBlockIds.has(item.data.id)}
  onToggleExpand={() => toggleExpand(item.data.id)}
/>
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/timeline/SessionTimeline.tsx
git commit -m "feat(timeline): wire expanded state management through SessionTimeline"
```

---

### Task 4: MonsterFullView Component

**Files:**
- Create: `app/src/features/timeline/full-views/MonsterFullView.tsx` (replace stub)

- [ ] **Step 1: Implement MonsterFullView**

Replace the stub in `app/src/features/timeline/full-views/MonsterFullView.tsx` with the full implementation:

```tsx
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Open5eMonster } from '@/lib/open5e'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export function MonsterFullView({ data }: { data: Record<string, unknown> }) {
  const sb = (data.stat_block ?? data) as Open5eMonster

  return (
    <div className="space-y-2 text-sm">
      {/* Type line */}
      <p className="text-xs text-text-secondary italic">
        {data.size as string} {data.type as string}{sb.alignment ? `, ${sb.alignment}` : ''}
      </p>

      <Separator />

      {/* Core stats */}
      <div className="space-y-0.5 text-xs text-text-secondary">
        <div>
          <span className="text-text-muted font-medium">Armor Class</span>{' '}
          {data.armor_class as number}{data.armor_desc ? ` (${data.armor_desc as string})` : sb.armor_desc ? ` (${sb.armor_desc})` : ''}
        </div>
        <div>
          <span className="text-text-muted font-medium">Hit Points</span>{' '}
          {data.hit_points as number}{data.hit_dice ? ` (${data.hit_dice as string})` : sb.hit_dice ? ` (${sb.hit_dice})` : ''}
        </div>
        {(data.speed || sb.speed) && (
          <div>
            <span className="text-text-muted font-medium">Speed</span>{' '}
            {formatSpeed(data.speed as Record<string, number> ?? sb.speed)}
          </div>
        )}
      </div>

      <Separator />

      {/* Ability scores */}
      {sb.strength && (
        <div className="grid grid-cols-6 gap-1">
          {ABILITIES.map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
              <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-xs font-mono text-text-heading">{sb[ability]}</div>
              <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(sb[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Secondary stats */}
      <div className="space-y-0.5 text-xs text-text-secondary">
        {sb.saving_throws && Object.keys(sb.saving_throws).length > 0 && (
          <div>
            <span className="text-text-muted font-medium">Saving Throws</span>{' '}
            {Object.entries(sb.saving_throws).map(([k, v]) => `${capitalize(k)} ${formatModifier(v)}`).join(', ')}
          </div>
        )}
        {sb.skills && Object.keys(sb.skills).length > 0 && (
          <div>
            <span className="text-text-muted font-medium">Skills</span>{' '}
            {Object.entries(sb.skills).map(([k, v]) => `${capitalize(k)} ${formatModifier(v)}`).join(', ')}
          </div>
        )}
        {sb.damage_vulnerabilities && (
          <div><span className="text-text-muted font-medium">Damage Vulnerabilities</span> {sb.damage_vulnerabilities}</div>
        )}
        {sb.damage_resistances && (
          <div><span className="text-text-muted font-medium">Damage Resistances</span> {sb.damage_resistances}</div>
        )}
        {sb.damage_immunities && (
          <div><span className="text-text-muted font-medium">Damage Immunities</span> {sb.damage_immunities}</div>
        )}
        {sb.condition_immunities && (
          <div><span className="text-text-muted font-medium">Condition Immunities</span> {sb.condition_immunities}</div>
        )}
        {sb.senses && (
          <div><span className="text-text-muted font-medium">Senses</span> {sb.senses}</div>
        )}
        {sb.languages && (
          <div><span className="text-text-muted font-medium">Languages</span> {sb.languages}</div>
        )}
        <div>
          <span className="text-text-muted font-medium">Challenge</span> {data.challenge_rating as string}
        </div>
      </div>

      <Separator />

      {/* Special Abilities */}
      {sb.special_abilities?.length > 0 && (
        <AbilitySection title="Special Abilities" items={sb.special_abilities} />
      )}

      {/* Actions */}
      {sb.actions?.length > 0 && (
        <AbilitySection title="Actions" items={sb.actions} />
      )}

      {/* Reactions */}
      {typeof sb.reactions === 'string' && sb.reactions && (
        <div>
          <SectionHeader>Reactions</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{sb.reactions}</p>
        </div>
      )}
      {Array.isArray(sb.reactions) && sb.reactions.length > 0 && (
        <AbilitySection title="Reactions" items={sb.reactions} />
      )}

      {/* Legendary Actions */}
      {sb.legendary_actions?.length > 0 && (
        <div>
          <SectionHeader>Legendary Actions</SectionHeader>
          {sb.legendary_desc && (
            <p className="text-xs text-text-secondary italic mb-1">{sb.legendary_desc}</p>
          )}
          {sb.legendary_actions.map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

      {/* GM Notes */}
      {data.notes && (
        <div>
          <SectionHeader>GM Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-danger/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-danger uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}

function AbilitySection({ title, items }: { title: string; items: { name: string; desc: string }[] }) {
  return (
    <div>
      <SectionHeader>{title}</SectionHeader>
      {items.map((a, i) => (
        <p key={i} className="text-xs text-text-body mb-1">
          <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
        </p>
      ))}
    </div>
  )
}

function formatSpeed(speed: Record<string, number>): string {
  return Object.entries(speed).map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`).join(', ')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/full-views/MonsterFullView.tsx
git commit -m "feat(timeline): implement MonsterFullView with complete stat block rendering"
```

---

### Task 5: NPCFullView Component

**Files:**
- Create: `app/src/features/timeline/full-views/NPCFullView.tsx` (replace stub)

- [ ] **Step 1: Implement NPCFullView**

Replace the stub in `app/src/features/timeline/full-views/NPCFullView.tsx` with:

```tsx
import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { GiHoodedFigure } from '@/components/ui/icons'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Open5eMonster } from '@/lib/open5e'
import type { AbilityScores } from '@/lib/types'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export function NPCFullView({ data }: { data: Record<string, unknown> }) {
  if (data.is_pc) {
    return <PCFullView data={data} />
  }
  return <NPCDetailView data={data} />
}

function NPCDetailView({ data }: { data: Record<string, unknown> }) {
  const stats = data.stats as { hp?: number; ac?: number; strength?: number; dexterity?: number; constitution?: number; intelligence?: number; wisdom?: number; charisma?: number } | null
  const statBlock = data.stat_block as Open5eMonster | null

  return (
    <div className="space-y-3 text-sm">
      {/* Header with portrait */}
      <div className="flex gap-3 items-start">
        {data.portrait_url && (
          <PortraitFrame imageUrl={data.portrait_url as string} fallbackIcon={GiHoodedFigure} size="md" />
        )}
        <div className="flex-1">
          <p className="text-xs text-text-secondary">
            {[data.race, data.occupation].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Personality */}
      {data.personality && (
        <p className="text-xs text-text-secondary italic border-l-2 border-amber-500/50 pl-2">
          "{data.personality as string}"
        </p>
      )}

      <Separator />

      {/* Appearance */}
      {data.appearance && (
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.appearance as string}</p>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}

      {/* Stats section */}
      {stats && (stats.strength || stats.hp || stats.ac) && (
        <>
          <Separator />
          <SectionHeader>Stats</SectionHeader>

          {(stats.hp || stats.ac) && (
            <div className="flex gap-4 text-xs text-text-secondary mb-2">
              {stats.hp != null && <span><span className="text-text-muted">HP</span> {stats.hp}</span>}
              {stats.ac != null && <span><span className="text-text-muted">AC</span> {stats.ac}</span>}
            </div>
          )}

          {stats.strength && (
            <div className="grid grid-cols-6 gap-1">
              {ABILITIES.map((ability) => {
                const score = stats[ability]
                if (score == null) return <div key={ability} />
                return (
                  <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
                    <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                    <div className="text-xs font-mono text-text-heading">{score}</div>
                    <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(score))}</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Full stat block if NPC has one (like a monster) */}
      {statBlock && statBlock.strength && (
        <>
          <Separator />
          <SectionHeader>Stat Block</SectionHeader>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {ABILITIES.map((ability) => (
              <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
                <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                <div className="text-xs font-mono text-text-heading">{statBlock[ability]}</div>
                <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(statBlock[ability]))}</div>
              </div>
            ))}
          </div>

          {statBlock.special_abilities?.length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Special Abilities</div>
              {statBlock.special_abilities.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}

          {statBlock.actions?.length > 0 && (
            <div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Actions</div>
              {statBlock.actions.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PCFullView({ data }: { data: Record<string, unknown> }) {
  const scores = data.ability_scores as AbilityScores | null
  const savingThrows = data.saving_throw_proficiencies as string[] | null
  const skillProfs = data.skill_proficiencies as string[] | null
  const equipment = data.equipment as { name: string; quantity?: number; description?: string }[] | null
  const classFeatures = data.class_features as { name: string; description: string }[] | null
  const traits = data.traits as { name: string; description: string }[] | null

  return (
    <div className="space-y-3 text-sm">
      {/* Header with portrait */}
      <div className="flex gap-3 items-start">
        {data.portrait_url && (
          <PortraitFrame imageUrl={data.portrait_url as string} fallbackIcon={GiHoodedFigure} size="md" />
        )}
        <div className="flex-1">
          <p className="text-xs text-text-secondary">
            {[data.race, [data.class, data.subclass].filter(Boolean).join(' / ')].filter(Boolean).join(' · ')}{data.level ? ` · Level ${data.level}` : ''}
          </p>
          {(data.background || data.alignment) && (
            <p className="text-xs text-text-muted mt-0.5">
              {[data.background, data.alignment].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Personality section */}
      {(data.personality_traits || data.ideals || data.bonds || data.flaws) && (
        <div className="space-y-1.5">
          {data.personality_traits && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Personality </span>
              <span className="text-xs text-text-body">{data.personality_traits as string}</span>
            </div>
          )}
          {data.ideals && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Ideals </span>
              <span className="text-xs text-text-body">{data.ideals as string}</span>
            </div>
          )}
          {data.bonds && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Bonds </span>
              <span className="text-xs text-text-body">{data.bonds as string}</span>
            </div>
          )}
          {data.flaws && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Flaws </span>
              <span className="text-xs text-text-body">{data.flaws as string}</span>
            </div>
          )}
        </div>
      )}

      {/* Appearance & Backstory */}
      {data.appearance && (
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.appearance as string}</p>
        </div>
      )}
      {data.backstory && (
        <div>
          <SectionHeader>Backstory</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.backstory as string}</p>
        </div>
      )}

      <Separator />

      {/* Combat stats */}
      <div className="flex gap-4 text-xs text-text-secondary flex-wrap">
        {data.hp_max != null && <span><span className="text-text-muted">HP</span> {data.hp_current as number}/{data.hp_max as number}</span>}
        {data.armor_class != null && <span><span className="text-text-muted">AC</span> {data.armor_class as number}</span>}
        {data.speed != null && <span><span className="text-text-muted">Speed</span> {data.speed as number} ft.</span>}
        {data.proficiency_bonus != null && <span><span className="text-text-muted">Prof</span> {formatModifier(data.proficiency_bonus as number)}</span>}
      </div>

      {/* Ability scores */}
      {scores && (
        <div className="grid grid-cols-6 gap-1">
          {ABILITIES.map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
              <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-xs font-mono text-text-heading">{scores[ability]}</div>
              <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(scores[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      {/* Saving throws */}
      {savingThrows && savingThrows.length > 0 && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Saving Throws:</span> {savingThrows.join(', ')}
        </div>
      )}

      {/* Skills */}
      {skillProfs && skillProfs.length > 0 && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Skills:</span> {skillProfs.join(', ')}
        </div>
      )}

      {/* Spellcasting */}
      {data.spellcasting_ability && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Spellcasting:</span> {data.spellcasting_ability as string}
        </div>
      )}

      {/* Equipment */}
      {equipment && equipment.length > 0 && (
        <div>
          <SectionHeader>Equipment</SectionHeader>
          <div className="text-xs text-text-body space-y-0.5">
            {equipment.map((item, i) => (
              <div key={i}>
                {item.name}{item.quantity && item.quantity > 1 ? ` (×${item.quantity})` : ''}
                {item.description && <span className="text-text-muted"> — {item.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class features */}
      {classFeatures && classFeatures.length > 0 && (
        <div>
          <SectionHeader>Class Features</SectionHeader>
          {classFeatures.map((f, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{f.name}.</span> {f.description}
            </p>
          ))}
        </div>
      )}

      {/* Racial/other traits */}
      {traits && traits.length > 0 && (
        <div>
          <SectionHeader>Traits</SectionHeader>
          {traits.map((t, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{t.name}.</span> {t.description}
            </p>
          ))}
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-amber-500/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/full-views/NPCFullView.tsx
git commit -m "feat(timeline): implement NPCFullView with portrait, stats, and PC support"
```

---

### Task 6: SpellFullView Component

**Files:**
- Create: `app/src/features/timeline/full-views/SpellFullView.tsx` (replace stub)

- [ ] **Step 1: Implement SpellFullView**

Replace the stub in `app/src/features/timeline/full-views/SpellFullView.tsx` with:

```tsx
import type { Open5eSpell } from '@/lib/open5e'

export function SpellFullView({ data }: { data: Record<string, unknown> }) {
  const spellData = (data.spell_data ?? {}) as Partial<Open5eSpell>

  return (
    <div className="space-y-2 text-sm">
      {/* Level / School line */}
      <p className="text-xs text-info italic">
        {data.level === 0 ? 'Cantrip' : `${ordinal(data.level as number)}-level`}{' '}
        {(data.school as string)?.toLowerCase()}
        {data.concentration && ' (concentration)'}
        {data.ritual && ' (ritual)'}
      </p>

      <Separator />

      {/* Casting info grid */}
      <div className="grid grid-cols-2 gap-1.5 text-xs text-text-secondary">
        <div><span className="text-text-muted font-medium">Casting Time</span> {data.casting_time as string ?? spellData.casting_time}</div>
        <div><span className="text-text-muted font-medium">Range</span> {data.range as string ?? spellData.range}</div>
        <div><span className="text-text-muted font-medium">Duration</span> {data.duration as string ?? spellData.duration}</div>
        <div><span className="text-text-muted font-medium">Components</span> {data.components as string ?? formatComponents(spellData)}</div>
      </div>

      <Separator />

      {/* Full description */}
      {spellData.desc && (
        <p className="text-xs text-text-body whitespace-pre-line">{spellData.desc}</p>
      )}

      {/* At Higher Levels */}
      {spellData.higher_level && (
        <>
          <Separator />
          <div>
            <SectionHeader>At Higher Levels</SectionHeader>
            <p className="text-xs text-text-body whitespace-pre-line">{spellData.higher_level}</p>
          </div>
        </>
      )}

      {/* Classes */}
      {(data.classes as string[] | undefined)?.length ? (
        <>
          <Separator />
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted font-medium">Classes:</span> {(data.classes as string[]).join(', ')}
          </div>
        </>
      ) : spellData.dnd_class ? (
        <>
          <Separator />
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted font-medium">Classes:</span> {spellData.dnd_class}
          </div>
        </>
      ) : null}

      {/* GM Notes */}
      {data.notes && (
        <div>
          <SectionHeader>GM Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-info/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-info uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatComponents(spellData: Partial<Open5eSpell>): string {
  const parts: string[] = []
  if (spellData.requires_verbal_components) parts.push('V')
  if (spellData.requires_somatic_components) parts.push('S')
  if (spellData.requires_material_components) parts.push(`M (${spellData.material || '...'})`)
  return parts.join(', ') || '—'
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/full-views/SpellFullView.tsx
git commit -m "feat(timeline): implement SpellFullView with full description and higher levels"
```

---

### Task 7: LocationFullView Component

**Files:**
- Create: `app/src/features/timeline/full-views/LocationFullView.tsx` (replace stub)

- [ ] **Step 1: Implement LocationFullView**

Replace the stub in `app/src/features/timeline/full-views/LocationFullView.tsx` with:

```tsx
export function LocationFullView({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      {/* Banner image */}
      {data.image_url && (
        <div className="rounded-[--radius-md] overflow-hidden border border-border">
          <img
            src={data.image_url as string}
            alt={data.name as string}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Type badge */}
      {data.type && (
        <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-[--radius-sm]">
          {data.type as string}
        </span>
      )}

      <Separator />

      {/* Description */}
      {data.description && (
        <div>
          <SectionHeader>Description</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.description as string}</p>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}

      {/* Map */}
      {data.map_url && (
        <>
          <Separator />
          <div>
            <SectionHeader>Map</SectionHeader>
            <div className="rounded-[--radius-md] overflow-hidden border border-border">
              <img
                src={data.map_url as string}
                alt={`Map of ${data.name as string}`}
                className="w-full max-h-60 object-contain bg-bg-raised"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-success/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-success uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/full-views/LocationFullView.tsx
git commit -m "feat(timeline): implement LocationFullView with image, map, and full text"
```

---

### Task 8: HandoutFullView Component

**Files:**
- Create: `app/src/features/timeline/full-views/HandoutFullView.tsx` (replace stub)

- [ ] **Step 1: Implement HandoutFullView**

Replace the stub in `app/src/features/timeline/full-views/HandoutFullView.tsx` with:

```tsx
import { HandoutPreview } from '@/features/handouts/HandoutPreview'
import type { Handout } from '@/lib/types'

export function HandoutFullView({ data }: { data: Record<string, unknown> }) {
  const template = data.template as Handout['template']
  const content = (data.content ?? {}) as Record<string, unknown>
  const style = (data.style ?? {}) as Handout['style']
  const seal = (data.seal ?? null) as Handout['seal']
  const imageUrl = (data.image_url as string) ?? null

  return (
    <div className="flex justify-center py-2">
      <HandoutPreview
        template={template}
        content={content}
        style={style}
        seal={seal}
        imageUrl={imageUrl}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/features/timeline/full-views/HandoutFullView.tsx
git commit -m "feat(timeline): implement HandoutFullView using existing HandoutPreview"
```

---

### Task 9: Visual Polish and Animation

**Files:**
- Modify: `app/src/features/timeline/TimelineBlockCard.tsx` (add motion animation to content area)

- [ ] **Step 1: Add motion import**

At the top of `TimelineBlockCard.tsx`, add:

```tsx
import { motion, AnimatePresence } from 'motion/react'
```

- [ ] **Step 2: Wrap the expanded content area with AnimatePresence**

In `TimelineBlockCard.tsx`, find the expanded content `<div>` (the one rendering `*FullView` components). Wrap it:

```tsx
{/* Content: expanded full view */}
<AnimatePresence>
  {isExpanded && !block.is_collapsed && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-4 py-3">
        {block.block_type === 'monster' && <MonsterFullView data={snapshot} />}
        {block.block_type === 'npc' && <NPCFullView data={snapshot} />}
        {block.block_type === 'spell' && <SpellFullView data={snapshot} />}
        {block.block_type === 'location' && <LocationFullView data={snapshot} />}
        {block.block_type === 'handout' && <HandoutFullView data={snapshot} />}
        {block.block_type === 'battle' && !editingBattle && <InlineBattle block={block} />}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/timeline/TimelineBlockCard.tsx
git commit -m "feat(timeline): add expand/collapse animation with motion/react"
```

---

### Task 10: Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 2: Run build**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Run dev server and smoke test**

Run: `cd "/Users/athenoula/claude things/V2 book of tricks/app" && npm run dev`

Manual verification checklist:
1. Navigate to a session timeline
2. Add a monster from library → card appears in compact view
3. Click title → expands to full stat block with ability scores, saves, skills, actions, legendary actions
4. Click title again → collapses to title only
5. Click title again → shows compact preview
6. Repeat with NPC (should show portrait, personality, appearance, notes, stats)
7. Repeat with location (should show image, description, notes, map)
8. Repeat with spell (should show full description, higher levels, classes)
9. Repeat with handout (should show full rendered template with seal)
10. Pin an item → expand it while pinned → verify it works
11. Expanded card should have amber glow border
12. Animation should be smooth on expand/collapse
