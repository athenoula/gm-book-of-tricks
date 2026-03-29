import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Monster } from '@/lib/types'
import { getStyles } from './styles'
import type { PdfTheme } from './styles'
import {
  PageHeader,
  PageFooter,
  SectionHeading,
  Divider,
  AbilityScoreRow,
} from './primitives'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PdfStyles = Record<string, Record<string, unknown>>

interface AbilityScores {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

interface NamedEntry {
  name?: string
  desc?: string
  damage_dice?: string
  attack_bonus?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSpeed(speed: Record<string, number>): string {
  return Object.entries(speed)
    .map(([k, v]) => (k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`))
    .join(', ')
}

function coerceAbilityScores(statBlock: Record<string, unknown>): AbilityScores | null {
  const keys: (keyof AbilityScores)[] = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ]
  for (const key of keys) {
    if (typeof statBlock[key] !== 'number') return null
  }
  return statBlock as unknown as AbilityScores
}

function coerceEntries(val: unknown): NamedEntry[] {
  if (!Array.isArray(val)) return []
  return val.filter(
    (item): item is NamedEntry => typeof item === 'object' && item !== null,
  )
}

// ---------------------------------------------------------------------------
// MonsterPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface MonsterPDFContentProps {
  monster: Monster
  styles: PdfStyles
}

export function MonsterPDFContent({ monster, styles }: MonsterPDFContentProps) {
  const subtitle = [monster.size, monster.type, monster.alignment, monster.source === 'homebrew' ? 'Homebrew' : 'SRD']
    .filter(Boolean)
    .join(' · ')

  const speedStr = monster.speed ? formatSpeed(monster.speed) : null
  const abilityScores = monster.stat_block ? coerceAbilityScores(monster.stat_block) : null
  const specialAbilities = monster.stat_block ? coerceEntries(monster.stat_block.special_abilities) : []
  const actions = monster.stat_block ? coerceEntries(monster.stat_block.actions) : []
  const legendaryActions = monster.stat_block ? coerceEntries(monster.stat_block.legendary_actions) : []

  return (
    <View>
      <PageHeader title={monster.name} subtitle={subtitle} styles={styles} />

      {/* Core Stats Row */}
      <View style={{ ...styles.statRow, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>AC</Text>
          <Text style={styles.statValue}>
            {monster.armor_class}
            {monster.armor_desc ? ` (${monster.armor_desc})` : ''}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>HP</Text>
          <Text style={styles.statValue}>
            {monster.hit_points}
            {monster.hit_dice ? ` (${monster.hit_dice})` : ''}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>CR</Text>
          <Text style={styles.statValue}>{monster.challenge_rating ?? '—'}</Text>
        </View>
        {speedStr && (
          <View style={{ flex: 2 }}>
            <Text style={styles.statLabel}>Speed</Text>
            <Text style={styles.statValue}>{speedStr}</Text>
          </View>
        )}
      </View>

      {/* Ability Scores */}
      {abilityScores && (
        <View style={{ marginBottom: 10 }}>
          <Divider styles={styles} />
          <AbilityScoreRow scores={abilityScores} styles={styles} />
          <Divider styles={styles} />
        </View>
      )}

      {/* Special Abilities */}
      {specialAbilities.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Special Abilities" styles={styles} />
          {specialAbilities.map((ability, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              {ability.name && (
                <Text style={{ ...styles.body, fontWeight: 700 }}>
                  {ability.name}
                  {ability.desc ? (
                    <Text style={{ ...styles.body, fontWeight: 400 }}>{'  '}{ability.desc}</Text>
                  ) : null}
                </Text>
              )}
              {!ability.name && ability.desc && (
                <Text style={styles.body}>{ability.desc}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Actions" styles={styles} />
          {actions.map((action, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              {action.name && (
                <Text style={{ ...styles.body, fontWeight: 700 }}>
                  {action.name}
                  {action.desc ? (
                    <Text style={{ ...styles.body, fontWeight: 400 }}>{'  '}{action.desc}</Text>
                  ) : null}
                </Text>
              )}
              {!action.name && action.desc && (
                <Text style={styles.body}>{action.desc}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Legendary Actions */}
      {legendaryActions.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Legendary Actions" styles={styles} />
          {legendaryActions.map((action, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              {action.name && (
                <Text style={{ ...styles.body, fontWeight: 700 }}>
                  {action.name}
                  {action.desc ? (
                    <Text style={{ ...styles.body, fontWeight: 400 }}>{'  '}{action.desc}</Text>
                  ) : null}
                </Text>
              )}
              {!action.name && action.desc && (
                <Text style={styles.body}>{action.desc}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {monster.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{monster.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// MonsterPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface MonsterPDFProps {
  monster: Monster
  theme: PdfTheme
}

export function MonsterPDF({ monster, theme }: MonsterPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MonsterPDFContent monster={monster} styles={styles} />
      </Page>
    </Document>
  )
}
