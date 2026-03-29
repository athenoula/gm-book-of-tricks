import { Document, Page, View, Text } from '@react-pdf/renderer'
import type { Location } from '@/lib/export/fetch-campaign-data'
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
// LocationPDFContent — inner content, no Document/Page wrapper
// ---------------------------------------------------------------------------

interface LocationPDFContentProps {
  location: Location
  allLocations: Location[]
  styles: PdfStyles
}

export function LocationPDFContent({ location, allLocations, styles }: LocationPDFContentProps) {
  const subtitle = location.type ?? undefined

  const parentLocation = location.parent_location_id
    ? allLocations.find(l => l.id === location.parent_location_id)
    : null

  const childLocations = allLocations.filter(
    l => l.parent_location_id === location.id,
  )

  return (
    <View>
      <PageHeader title={location.name} subtitle={subtitle} styles={styles} />

      {/* Parent Reference */}
      {parentLocation && (
        <View style={{ ...styles.statRow, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Part of</Text>
            <Text style={styles.statValue}>{parentLocation.name}</Text>
          </View>
        </View>
      )}

      <Divider styles={styles} />

      {/* Description */}
      {location.description && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Description" styles={styles} />
          <Text style={styles.body}>{location.description}</Text>
        </View>
      )}

      {/* Child Locations */}
      {childLocations.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <SectionHeading text="Sub-locations" styles={styles} />
          {childLocations.map((child, i) => (
            <View key={i} style={{ marginBottom: 2 }}>
              <Text style={{ ...styles.body, fontWeight: 700 }}>
                {child.name}
                {child.type ? (
                  <Text style={{ ...styles.body, fontWeight: 400 }}>{` (${child.type})`}</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {location.notes && (
        <View style={{ marginTop: 6 }}>
          <SectionHeading text="Notes" styles={styles} />
          <View style={styles.callout}>
            <Text style={styles.body}>{location.notes}</Text>
          </View>
        </View>
      )}

      <PageFooter styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// LocationPDF — standalone Document/Page wrapper
// ---------------------------------------------------------------------------

interface LocationPDFProps {
  location: Location
  allLocations: Location[]
  theme: PdfTheme
}

export function LocationPDF({ location, allLocations, theme }: LocationPDFProps) {
  const styles = getStyles(theme) as PdfStyles

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <LocationPDFContent location={location} allLocations={allLocations} styles={styles} />
      </Page>
    </Document>
  )
}
