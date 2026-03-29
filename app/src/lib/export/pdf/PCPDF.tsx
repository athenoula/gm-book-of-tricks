import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { PlayerCharacter } from '@/lib/types'
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatModifier(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`
}

// ---------------------------------------------------------------------------
// PCPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface PCPDFContentProps {
  pc: PlayerCharacter
  spellNames: string[]
  inventory: string[]
  styles: PdfStyles
}

export function PCPDFContent({ pc, spellNames, inventory, styles }: PCPDFContentProps) {
  const subtitleParts: string[] = []
  if (pc.class) subtitleParts.push(pc.class)
  if (pc.subclass) subtitleParts.push(pc.subclass)
  if (pc.level) subtitleParts.push(`Level ${pc.level}`)
  if (pc.race) subtitleParts.push(pc.race)
  if (pc.player_name) subtitleParts.push(`(${pc.player_name})`)
  const subtitle = subtitleParts.join(' · ')

  return (
    <View>
      <PageHeader title={pc.name} subtitle={subtitle || undefined} styles={styles} />

      {/* Ability Scores */}
      {pc.ability_scores && (
        <View style={{ marginBottom: 10 }}>
          <AbilityScoreRow scores={pc.ability_scores} styles={styles} />
          <Divider styles={styles} />
        </View>
      )}

      {/* Combat Stats */}
      <View style={{ ...styles.statRow, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>HP</Text>
          <Text style={styles.statValue}>
            {pc.hp_current}/{pc.hp_max}
            {pc.hp_temp > 0 ? ` (+${pc.hp_temp})` : ''}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>AC</Text>
          <Text style={styles.statValue}>{pc.armor_class}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>Speed</Text>
          <Text style={styles.statValue}>{pc.speed} ft.</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>Initiative</Text>
          <Text style={styles.statValue}>{formatModifier(pc.initiative_bonus)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>Prof. Bonus</Text>
          <Text style={styles.statValue}>{formatModifier(pc.proficiency_bonus)}</Text>
        </View>
      </View>

      {/* Equipment */}
      {(pc.equipment.length > 0 || inventory.length > 0) && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Equipment" styles={styles} />
          {pc.equipment.map((item, i) => (
            <View key={i} style={{ marginBottom: 2 }}>
              <Text style={styles.body}>
                {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}
                <Text style={{ ...styles.body, fontWeight: 700 }}>{item.name}</Text>
                {item.description ? ` — ${item.description}` : ''}
              </Text>
            </View>
          ))}
          {inventory.length > 0 && (
            <Text style={styles.body}>{inventory.join(', ')}</Text>
          )}
        </View>
      )}

      {/* Spells */}
      {spellNames.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Spells" styles={styles} />
          <Text style={styles.body}>{spellNames.join(', ')}</Text>
        </View>
      )}

      {/* Class Features */}
      {pc.class_features.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Class Features" styles={styles} />
          {pc.class_features.map((feature, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={{ ...styles.body, fontWeight: 700 }}>
                {feature.name}
                {feature.description ? (
                  <Text style={{ ...styles.body, fontWeight: 400 }}>{'  '}{feature.description}</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Traits */}
      {pc.traits.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Traits" styles={styles} />
          {pc.traits.map((trait, i) => (
            <View key={i} style={{ marginBottom: 4 }}>
              <Text style={{ ...styles.body, fontWeight: 700 }}>
                {trait.name}
                {trait.description ? (
                  <Text style={{ ...styles.body, fontWeight: 400 }}>{'  '}{trait.description}</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Backstory */}
      {pc.backstory && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Backstory" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{pc.backstory}</Text>
          </View>
        </View>
      )}

      {/* Notes */}
      {pc.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{pc.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// PCPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface PCPDFProps {
  pc: PlayerCharacter
  spellNames: string[]
  inventory: string[]
  theme: PdfTheme
}

export function PCPDF({ pc, spellNames, inventory, theme }: PCPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PCPDFContent pc={pc} spellNames={spellNames} inventory={inventory} styles={styles} />
      </Page>
    </Document>
  )
}
