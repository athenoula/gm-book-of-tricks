import { Document, Page } from '@react-pdf/renderer'
import type { Monster, Spell, NPC, PlayerCharacter, Handout } from '@/lib/types'
import type { Item, Location, Battle } from '@/lib/export/fetch-campaign-data'
import { getStyles } from './styles'
import type { PdfTheme } from './styles'
import { MonsterPDFContent } from './MonsterPDF'
import { SpellPDFContent } from './SpellPDF'
import { NPCPDFContent } from './NPCPDF'
import { PCPDFContent } from './PCPDF'
import { ItemPDFContent } from './ItemPDF'
import { LocationPDFContent } from './LocationPDF'
import { HandoutPDFContent } from './HandoutPDF'
import { BattlePDFContent } from './BattlePDF'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PdfStyles = Record<string, Record<string, unknown>>

export type BundleItem =
  | { type: 'monster'; data: Monster }
  | { type: 'spell'; data: Spell }
  | { type: 'npc'; data: NPC; spellNames: string[] }
  | { type: 'character'; data: PlayerCharacter; spellNames: string[]; inventory: string[] }
  | { type: 'item'; data: Item }
  | { type: 'location'; data: Location; allLocations: Location[] }
  | { type: 'handout'; data: Handout }
  | { type: 'battle'; data: Battle }

// ---------------------------------------------------------------------------
// BundlePDF — multi-page Document, one page per item
// ---------------------------------------------------------------------------

interface BundlePDFProps {
  items: BundleItem[]
  theme: PdfTheme
}

export function BundlePDF({ items, theme }: BundlePDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      {items.map((item, index) => (
        <Page key={index} size="A4" style={styles.page}>
          {renderContent(item, styles)}
        </Page>
      ))}
    </Document>
  )
}

// ---------------------------------------------------------------------------
// renderContent — switch on item type to render the correct *PDFContent
// ---------------------------------------------------------------------------

function renderContent(item: BundleItem, styles: PdfStyles) {
  switch (item.type) {
    case 'monster':
      return <MonsterPDFContent monster={item.data} styles={styles} />
    case 'spell':
      return <SpellPDFContent spell={item.data} styles={styles} />
    case 'npc':
      return <NPCPDFContent npc={item.data} spellNames={item.spellNames} styles={styles} />
    case 'character':
      return (
        <PCPDFContent
          pc={item.data}
          spellNames={item.spellNames}
          inventory={item.inventory}
          styles={styles}
        />
      )
    case 'item':
      return <ItemPDFContent item={item.data} styles={styles} />
    case 'location':
      return (
        <LocationPDFContent
          location={item.data}
          allLocations={item.allLocations}
          styles={styles}
        />
      )
    case 'handout':
      return <HandoutPDFContent handout={item.data} styles={styles} />
    case 'battle':
      return <BattlePDFContent battle={item.data} styles={styles} />
  }
}
