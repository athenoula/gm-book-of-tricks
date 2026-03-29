import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Battle } from '@/lib/export/fetch-campaign-data'
import { getStyles } from './styles'
import type { PdfTheme } from './styles'
import {
  PageHeader,
  PageFooter,
  SectionHeading,
} from './primitives'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PdfStyles = Record<string, Record<string, unknown>>

// ---------------------------------------------------------------------------
// BattlePDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface BattlePDFContentProps {
  battle: Battle
  styles: PdfStyles
}

export function BattlePDFContent({ battle, styles }: BattlePDFContentProps) {
  const subtitle = battle.type === 'template' ? 'Battle Template' : 'Saved Battle'

  const combatants = [...battle.combatant_data].sort((a, b) => b.initiative - a.initiative)

  return (
    <View>
      <PageHeader title={battle.name} subtitle={subtitle} styles={styles} />

      {/* Combatant Table */}
      {combatants.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Combatants" styles={styles} />
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableCell, flex: 3, fontWeight: 700 }}>Name</Text>
              <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700 }}>HP</Text>
              <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700 }}>AC</Text>
              <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700 }}>Init</Text>
              <Text style={{ ...styles.tableCell, flex: 1, fontWeight: 700 }}>PC?</Text>
            </View>
            {/* Rows */}
            {combatants.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ ...styles.tableCell, flex: 3 }}>{c.name}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{c.hp_max}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{c.armor_class}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{c.initiative}</Text>
                <Text style={{ ...styles.tableCell, flex: 1 }}>{c.is_player ? 'Yes' : 'No'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      {battle.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{battle.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// BattlePDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface BattlePDFProps {
  battle: Battle
  theme: PdfTheme
}

export function BattlePDF({ battle, theme }: BattlePDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <BattlePDFContent battle={battle} styles={styles} />
      </Page>
    </Document>
  )
}
