import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Spell } from '@/lib/types'
import { getStyles } from './styles'
import type { PdfTheme } from './styles'
import {
  PageHeader,
  PageFooter,
  SectionHeading,
  Divider,
} from './primitives'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PdfStyles = Record<string, Record<string, unknown>>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function levelLabel(level: number): string {
  return level === 0 ? 'Cantrip' : `Level ${level}`
}

function getStringField(
  data: Record<string, unknown> | null,
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

// ---------------------------------------------------------------------------
// SpellPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface SpellPDFContentProps {
  spell: Spell
  styles: PdfStyles
}

export function SpellPDFContent({ spell, styles }: SpellPDFContentProps) {
  const tags: string[] = []
  if (spell.ritual) tags.push('Ritual')
  if (spell.concentration) tags.push('Concentration')

  const subtitle = [
    levelLabel(spell.level),
    spell.school,
    ...tags,
  ]
    .filter(Boolean)
    .join(' · ')

  const description = getStringField(spell.spell_data, 'desc', 'description')
  const higherLevel = getStringField(
    spell.spell_data,
    'higher_level',
    'at_higher_levels',
  )

  return (
    <View>
      <PageHeader title={spell.name} subtitle={subtitle} styles={styles} />

      {/* Casting Details Grid */}
      <View style={{ ...styles.statRow, marginBottom: 10 }}>
        {spell.casting_time && (
          <View style={{ flex: 2 }}>
            <Text style={styles.statLabel}>Casting Time</Text>
            <Text style={styles.statValue}>{spell.casting_time}</Text>
          </View>
        )}
        {spell.range && (
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Range</Text>
            <Text style={styles.statValue}>{spell.range}</Text>
          </View>
        )}
        {spell.duration && (
          <View style={{ flex: 2 }}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {spell.concentration ? 'Concentration, ' : ''}
              {spell.duration}
            </Text>
          </View>
        )}
      </View>

      {/* Components + Classes */}
      <View style={{ ...styles.statRow, marginBottom: 8 }}>
        {spell.components && (
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Components</Text>
            <Text style={styles.statValue}>{spell.components}</Text>
          </View>
        )}
        {spell.classes && spell.classes.length > 0 && (
          <View style={{ flex: 3 }}>
            <Text style={styles.statLabel}>Classes</Text>
            <Text style={styles.statValue}>{spell.classes.join(', ')}</Text>
          </View>
        )}
      </View>

      <Divider styles={styles} />

      {/* Description */}
      {description && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Description" styles={styles} />
          <Text style={styles.body}>{description}</Text>
        </View>
      )}

      {/* At Higher Levels */}
      {higherLevel && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="At Higher Levels" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{higherLevel}</Text>
          </View>
        </View>
      )}

      {/* Notes */}
      {spell.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{spell.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// SpellPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface SpellPDFProps {
  spell: Spell
  theme: PdfTheme
}

export function SpellPDF({ spell, theme }: SpellPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SpellPDFContent spell={spell} styles={styles} />
      </Page>
    </Document>
  )
}
