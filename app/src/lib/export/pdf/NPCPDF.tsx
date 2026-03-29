import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { NPC } from '@/lib/types'
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function coerceAbilityScores(stats: NPC['stats']): AbilityScores | null {
  const { strength, dexterity, constitution, intelligence, wisdom, charisma } = stats
  if (
    typeof strength !== 'number' ||
    typeof dexterity !== 'number' ||
    typeof constitution !== 'number' ||
    typeof intelligence !== 'number' ||
    typeof wisdom !== 'number' ||
    typeof charisma !== 'number'
  ) {
    return null
  }
  return { strength, dexterity, constitution, intelligence, wisdom, charisma }
}

// ---------------------------------------------------------------------------
// NPCPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface NPCPDFContentProps {
  npc: NPC
  spellNames: string[]
  styles: PdfStyles
}

export function NPCPDFContent({ npc, spellNames, styles }: NPCPDFContentProps) {
  const subtitle = [npc.race, npc.occupation].filter(Boolean).join(' · ')
  const abilityScores = coerceAbilityScores(npc.stats)

  return (
    <View>
      <PageHeader title={npc.name} subtitle={subtitle || undefined} styles={styles} />

      {/* Combat Stats */}
      {(npc.stats.ac !== undefined || npc.stats.hp !== undefined) && (
        <View style={{ ...styles.statRow, marginBottom: 10 }}>
          {npc.stats.ac !== undefined && (
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>AC</Text>
              <Text style={styles.statValue}>{npc.stats.ac}</Text>
            </View>
          )}
          {npc.stats.hp !== undefined && (
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>HP</Text>
              <Text style={styles.statValue}>{npc.stats.hp}</Text>
            </View>
          )}
        </View>
      )}

      {/* Ability Scores */}
      {abilityScores && (
        <View style={{ marginBottom: 10 }}>
          <Divider styles={styles} />
          <AbilityScoreRow scores={abilityScores} styles={styles} />
          <Divider styles={styles} />
        </View>
      )}

      {/* Personality */}
      {npc.personality && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Personality" styles={styles} />
          <Text style={{ ...styles.body, fontStyle: 'italic' }}>{npc.personality}</Text>
        </View>
      )}

      {/* Appearance */}
      {npc.appearance && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Appearance" styles={styles} />
          <Text style={styles.body}>{npc.appearance}</Text>
        </View>
      )}

      {/* Spells */}
      {spellNames.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Spells" styles={styles} />
          <Text style={styles.body}>{spellNames.join(', ')}</Text>
        </View>
      )}

      {/* Notes */}
      {npc.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{npc.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// NPCPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface NPCPDFProps {
  npc: NPC
  spellNames: string[]
  theme: PdfTheme
}

export function NPCPDF({ npc, spellNames, theme }: NPCPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <NPCPDFContent npc={npc} spellNames={spellNames} styles={styles} />
      </Page>
    </Document>
  )
}
