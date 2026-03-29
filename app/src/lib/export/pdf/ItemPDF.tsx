import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Item } from '@/lib/export/fetch-campaign-data'
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

function formatItemType(type: Item['type']): string {
  const labels: Record<Item['type'], string> = {
    weapon: 'Weapon',
    armor: 'Armor',
    magic_item: 'Magic Item',
    equipment: 'Equipment',
    consumable: 'Consumable',
    other: 'Item',
  }
  return labels[type] ?? type
}

// ---------------------------------------------------------------------------
// ItemPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface ItemPDFContentProps {
  item: Item
  styles: PdfStyles
}

export function ItemPDFContent({ item, styles }: ItemPDFContentProps) {
  const subtitleParts: string[] = [formatItemType(item.type)]
  if (item.rarity) subtitleParts.push(item.rarity)
  if (item.source === 'homebrew') subtitleParts.push('Homebrew')
  const subtitle = subtitleParts.join(' · ')

  return (
    <View>
      <PageHeader title={item.name} subtitle={subtitle} styles={styles} />

      {/* Properties */}
      <View style={{ ...styles.statRow, marginBottom: 10 }}>
        {item.cost && (
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={styles.statValue}>{item.cost}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>Stackable</Text>
          <Text style={styles.statValue}>{item.stackable ? 'Yes' : 'No'}</Text>
        </View>
      </View>

      <Divider styles={styles} />

      {/* Description */}
      {item.description && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Description" styles={styles} />
          <Text style={styles.body}>{item.description}</Text>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// ItemPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface ItemPDFProps {
  item: Item
  theme: PdfTheme
}

export function ItemPDF({ item, theme }: ItemPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ItemPDFContent item={item} styles={styles} />
      </Page>
    </Document>
  )
}
