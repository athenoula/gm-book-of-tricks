import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Handout } from '@/lib/types'
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

function getStringContent(content: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = content[key]
    if (typeof val === 'string' && val.trim().length > 0) return val
  }
  return null
}

function formatTemplate(template: Handout['template']): string {
  const labels: Record<Handout['template'], string> = {
    scroll: 'Scroll',
    wanted: 'Wanted Poster',
    decree: 'Decree',
    map_note: 'Map Note',
    tavern: 'Tavern Notice',
    broadsheet: 'Broadsheet',
    invitation: 'Invitation',
    blank: 'Handout',
  }
  return labels[template] ?? template
}

// ---------------------------------------------------------------------------
// HandoutPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface HandoutPDFContentProps {
  handout: Handout
  styles: PdfStyles
}

export function HandoutPDFContent({ handout, styles }: HandoutPDFContentProps) {
  const subtitle = formatTemplate(handout.template)
  const content = handout.content

  // Extract title/subtitle from content fields
  const contentTitle = getStringContent(content, 'title')
  const contentSubtitle = getStringContent(content, 'subtitle')

  // Extract body text from common content field names
  const bodyText = getStringContent(content, 'body', 'text', 'content', 'description')

  return (
    <View>
      <PageHeader title={handout.name} subtitle={subtitle} styles={styles} />

      {/* Content Title / Subtitle */}
      {(contentTitle || contentSubtitle) && (
        <View style={{ marginBottom: 8 }}>
          {contentTitle && (
            <Text style={{ ...styles.body, fontWeight: 700, fontSize: 12 }}>{contentTitle}</Text>
          )}
          {contentSubtitle && (
            <Text style={{ ...styles.body, fontStyle: 'italic' }}>{contentSubtitle}</Text>
          )}
        </View>
      )}

      <Divider styles={styles} />

      {/* Body */}
      {bodyText && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Content" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{bodyText}</Text>
          </View>
        </View>
      )}

      {/* Seal Info */}
      {handout.seal && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Seal" styles={styles} />
          {handout.seal.type === 'built' ? (
            <View style={styles.statRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.statLabel}>Ring Text</Text>
                <Text style={styles.statValue}>{handout.seal.ring_text}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Shape</Text>
                <Text style={styles.statValue}>{handout.seal.shape}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.body}>Custom seal image attached.</Text>
          )}
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// HandoutPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface HandoutPDFProps {
  handout: Handout
  theme: PdfTheme
}

export function HandoutPDF({ handout, theme }: HandoutPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HandoutPDFContent handout={handout} styles={styles} />
      </Page>
    </Document>
  )
}
