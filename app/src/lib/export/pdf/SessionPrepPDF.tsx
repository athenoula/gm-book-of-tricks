import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Session, Monster, NPC, Spell } from '@/lib/types'
import type { TimelineBlock, Location } from '@/lib/export/fetch-campaign-data'
import { getStyles } from './styles'
import type { PdfTheme } from './styles'
import {
  PageHeader,
  PageFooter,
  SectionHeading,
  Divider,
  StatBlockCard,
  SpellCardPrimitive,
  NPCCardPrimitive,
} from './primitives'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PdfStyles = Record<string, Record<string, unknown>>

export interface SessionPrepData {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoString: string | null): string {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function getStringField(
  data: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!data) return null
  for (const key of keys) {
    const val = data[key]
    if (typeof val === 'string' && val.trim().length > 0) return val
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
      return val.join('\n\n')
    }
  }
  return null
}

function formatSpeed(speed: Record<string, number>): string {
  return Object.entries(speed)
    .map(([k, v]) => (k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`))
    .join(', ')
}

interface CombatantData {
  name: string
  hp_max?: number
  armor_class?: number
  initiative?: number
  is_player?: boolean
}

function coerceCombatants(val: unknown): CombatantData[] {
  if (!Array.isArray(val)) return []
  return val.filter(
    (item): item is CombatantData =>
      typeof item === 'object' && item !== null && typeof (item as CombatantData).name === 'string',
  )
}

// ---------------------------------------------------------------------------
// Block Renderers
// ---------------------------------------------------------------------------

function SceneBlock({
  block,
  styles,
}: {
  block: TimelineBlock
  styles: PdfStyles
}) {
  const content = getStringField(block.content_snapshot, 'content')
  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <SectionHeading text={block.title || 'Scene'} styles={styles} />
      {content && <Text style={styles.body}>{content}</Text>}
    </View>
  )
}

function NoteBlock({
  block,
  styles,
}: {
  block: TimelineBlock
  styles: PdfStyles
}) {
  const content = getStringField(block.content_snapshot, 'content')
  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <SectionHeading text={block.title || 'Note'} styles={styles} />
      {content && (
        <View style={styles.callout}>
          <Text style={styles.body}>{content}</Text>
        </View>
      )}
    </View>
  )
}

function BattleBlock({
  block,
  styles,
}: {
  block: TimelineBlock
  styles: PdfStyles
}) {
  const combatants = coerceCombatants(block.content_snapshot.combatant_data)
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionHeading text={block.title || 'Battle'} styles={styles} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {combatants.map((c, i) => (
          <View key={i} style={{ flex: '1 1 45%' as unknown as number }}>
            <StatBlockCard
              name={c.name}
              ac={c.armor_class}
              hp={c.hp_max}
              styles={styles}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

function MonsterBlock({
  block,
  resolvedMonsters,
  styles,
}: {
  block: TimelineBlock
  resolvedMonsters: Map<string, Monster>
  styles: PdfStyles
}) {
  const monster = block.source_id ? resolvedMonsters.get(block.source_id) : null

  if (monster) {
    const speedStr = monster.speed ? formatSpeed(monster.speed) : undefined
    return (
      // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
      <View wrap={false} style={{ marginBottom: 16 }}>
        <StatBlockCard
          name={monster.name}
          ac={monster.armor_class}
          hp={monster.hit_points}
          cr={monster.challenge_rating ?? undefined}
          speed={speedStr}
          styles={styles}
        />
      </View>
    )
  }

  // Fallback: use snapshot data
  const name =
    getStringField(block.content_snapshot, 'name') ?? block.title ?? 'Monster'
  const ac = block.content_snapshot.armor_class
  const hp = block.content_snapshot.hit_points
  const cr = block.content_snapshot.challenge_rating

  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <StatBlockCard
        name={name}
        ac={typeof ac === 'number' ? ac : undefined}
        hp={typeof hp === 'number' ? hp : undefined}
        cr={typeof cr === 'string' || typeof cr === 'number' ? cr : undefined}
        styles={styles}
      />
    </View>
  )
}

function NPCBlock({
  block,
  resolvedNPCs,
  npcSpellNames,
  styles,
}: {
  block: TimelineBlock
  resolvedNPCs: Map<string, NPC>
  npcSpellNames: Map<string, string[]>
  styles: PdfStyles
}) {
  const npc = block.source_id ? resolvedNPCs.get(block.source_id) : null

  if (npc) {
    const spells = npcSpellNames.get(npc.id) ?? []
    return (
      // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
      <View wrap={false} style={{ marginBottom: 16 }}>
        <NPCCardPrimitive
          name={npc.name}
          personality={npc.personality ?? undefined}
          ac={npc.stats.ac}
          hp={npc.stats.hp}
          spells={spells.length > 0 ? spells : undefined}
          styles={styles}
        />
      </View>
    )
  }

  // Fallback: use snapshot data
  const name =
    getStringField(block.content_snapshot, 'name') ?? block.title ?? 'NPC'
  const personality = getStringField(block.content_snapshot, 'personality')
  const statsRaw = block.content_snapshot.stats
  const stats =
    typeof statsRaw === 'object' && statsRaw !== null
      ? (statsRaw as Record<string, unknown>)
      : {}

  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <NPCCardPrimitive
        name={name}
        personality={personality ?? undefined}
        ac={typeof stats.ac === 'number' ? stats.ac : undefined}
        hp={typeof stats.hp === 'number' ? stats.hp : undefined}
        styles={styles}
      />
    </View>
  )
}

function SpellBlock({
  block,
  resolvedSpells,
  styles,
}: {
  block: TimelineBlock
  resolvedSpells: Map<string, Spell>
  styles: PdfStyles
}) {
  const spell = block.source_id ? resolvedSpells.get(block.source_id) : null

  if (spell) {
    const description = getStringField(spell.spell_data, 'desc', 'description')
    return (
      // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
      <View wrap={false} style={{ marginBottom: 16 }}>
        <SpellCardPrimitive
          name={spell.name}
          level={spell.level}
          school={spell.school ?? ''}
          castingTime={spell.casting_time ?? ''}
          range={spell.range ?? ''}
          description={description ?? undefined}
          styles={styles}
        />
      </View>
    )
  }

  // Fallback: use snapshot data
  const name =
    getStringField(block.content_snapshot, 'name') ?? block.title ?? 'Spell'
  const level =
    typeof block.content_snapshot.level === 'number'
      ? block.content_snapshot.level
      : 0
  const school =
    typeof block.content_snapshot.school === 'string'
      ? block.content_snapshot.school
      : ''
  const castingTime =
    typeof block.content_snapshot.casting_time === 'string'
      ? block.content_snapshot.casting_time
      : ''
  const range =
    typeof block.content_snapshot.range === 'string'
      ? block.content_snapshot.range
      : ''

  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <SpellCardPrimitive
        name={name}
        level={level}
        school={school}
        castingTime={castingTime}
        range={range}
        styles={styles}
      />
    </View>
  )
}

function LocationBlock({
  block,
  resolvedLocations,
  styles,
}: {
  block: TimelineBlock
  resolvedLocations: Map<string, Location>
  styles: PdfStyles
}) {
  const location = block.source_id ? resolvedLocations.get(block.source_id) : null

  if (location) {
    return (
      // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
      <View wrap={false} style={{ marginBottom: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{location.name}</Text>
          {location.type && (
            <Text style={styles.label}>{location.type}</Text>
          )}
          {location.description && (
            <Text style={styles.body}>{location.description}</Text>
          )}
          {location.notes && (
            <Text style={{ ...styles.body, fontStyle: 'italic' }}>
              {location.notes}
            </Text>
          )}
        </View>
      </View>
    )
  }

  // Fallback: use snapshot data
  const name =
    getStringField(block.content_snapshot, 'name') ?? block.title ?? 'Location'
  const description = getStringField(
    block.content_snapshot,
    'description',
    'content',
  )

  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{name}</Text>
        {description && <Text style={styles.body}>{description}</Text>}
      </View>
    </View>
  )
}

function HandoutBlock({
  block,
  styles,
}: {
  block: TimelineBlock
  styles: PdfStyles
}) {
  const content = getStringField(block.content_snapshot, 'content', 'text')
  return (
    // @ts-expect-error — wrap prop not typed in all @react-pdf/renderer versions
    <View wrap={false} style={{ marginBottom: 16 }}>
      <SectionHeading text={block.title || 'Handout'} styles={styles} />
      {content && (
        <View style={styles.callout}>
          <Text style={styles.body}>{content}</Text>
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// TimelineSection — renders all blocks
// ---------------------------------------------------------------------------

interface TimelineSectionProps {
  blocks: TimelineBlock[]
  resolvedMonsters: Map<string, Monster>
  resolvedNPCs: Map<string, NPC>
  resolvedSpells: Map<string, Spell>
  resolvedLocations: Map<string, Location>
  npcSpellNames: Map<string, string[]>
  styles: PdfStyles
}

function TimelineSection({
  blocks,
  resolvedMonsters,
  resolvedNPCs,
  resolvedSpells,
  resolvedLocations,
  npcSpellNames,
  styles,
}: TimelineSectionProps) {
  if (blocks.length === 0) return null

  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeading text="Session Timeline" styles={styles} />
      <Divider styles={styles} />
      {blocks.map((block) => {
        switch (block.block_type) {
          case 'scene':
            return <SceneBlock key={block.id} block={block} styles={styles} />
          case 'note':
            return <NoteBlock key={block.id} block={block} styles={styles} />
          case 'battle':
            return <BattleBlock key={block.id} block={block} styles={styles} />
          case 'monster':
            return (
              <MonsterBlock
                key={block.id}
                block={block}
                resolvedMonsters={resolvedMonsters}
                styles={styles}
              />
            )
          case 'npc':
            return (
              <NPCBlock
                key={block.id}
                block={block}
                resolvedNPCs={resolvedNPCs}
                npcSpellNames={npcSpellNames}
                styles={styles}
              />
            )
          case 'spell':
            return (
              <SpellBlock
                key={block.id}
                block={block}
                resolvedSpells={resolvedSpells}
                styles={styles}
              />
            )
          case 'location':
            return (
              <LocationBlock
                key={block.id}
                block={block}
                resolvedLocations={resolvedLocations}
                styles={styles}
              />
            )
          case 'handout':
            return (
              <HandoutBlock key={block.id} block={block} styles={styles} />
            )
          default:
            return null
        }
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// SessionPrepPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface SessionPrepPDFContentProps {
  data: SessionPrepData
  styles: PdfStyles
}

export function SessionPrepPDFContent({ data, styles }: SessionPrepPDFContentProps) {
  const { session, campaignName, recap, blocks } = data

  const sessionLabel = session.session_number != null
    ? `Session ${session.session_number}: ${session.name}`
    : session.name

  const dateStr = formatDate(session.scheduled_at)
  const subtitle = [campaignName, dateStr].filter(Boolean).join(' · ')

  return (
    <View>
      <PageHeader title={sessionLabel} subtitle={subtitle} styles={styles} />

      {/* Recap */}
      {recap && (
        <View style={{ marginBottom: 16 }}>
          <SectionHeading text="Last Session Recap" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{recap}</Text>
          </View>
        </View>
      )}

      {/* Session Notes */}
      {session.notes && (
        <View style={{ marginBottom: 16 }}>
          <SectionHeading text="GM Notes" styles={styles} />
          <Text style={styles.body}>{session.notes}</Text>
        </View>
      )}

      {/* Timeline */}
      <TimelineSection
        blocks={blocks}
        resolvedMonsters={data.resolvedMonsters}
        resolvedNPCs={data.resolvedNPCs}
        resolvedSpells={data.resolvedSpells}
        resolvedLocations={data.resolvedLocations}
        npcSpellNames={data.npcSpellNames}
        styles={styles}
      />

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// SessionPrepPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface SessionPrepPDFProps {
  data: SessionPrepData
  theme: PdfTheme
}

export function SessionPrepPDF({ data, theme }: SessionPrepPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SessionPrepPDFContent data={data} styles={styles} />
      </Page>
    </Document>
  )
}
