import { Font, StyleSheet } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------

Font.register({
  family: 'Cinzel',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYo.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf',
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: 'Crimson Pro',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZzm18OA.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZKWp8OA.ttf',
      fontWeight: 700,
    },
  ],
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PdfTheme = 'themed' | 'clean';

export interface PdfStyles {
  page: Record<string, unknown>;
  heading: Record<string, unknown>;
  subheading: Record<string, unknown>;
  body: Record<string, unknown>;
  label: Record<string, unknown>;
  divider: Record<string, unknown>;
  callout: Record<string, unknown>;
  card: Record<string, unknown>;
  cardTitle: Record<string, unknown>;
  statRow: Record<string, unknown>;
  statLabel: Record<string, unknown>;
  statValue: Record<string, unknown>;
  table: Record<string, unknown>;
  tableHeader: Record<string, unknown>;
  tableRow: Record<string, unknown>;
  tableCell: Record<string, unknown>;
  footer: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Themed (parchment) stylesheet
// ---------------------------------------------------------------------------

const themedStyles = StyleSheet.create({
  page: {
    backgroundColor: '#f5f0e8',
    fontFamily: 'Crimson Pro',
    fontSize: 10,
    color: '#2c1810',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  heading: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Cinzel',
    fontSize: 12,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    color: '#4a3728',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#8b6f5e',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#c4a87c',
    borderBottomStyle: 'solid',
    opacity: 0.6,
    marginVertical: 8,
  },
  callout: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#c4a87c',
    borderLeftStyle: 'solid',
    paddingLeft: 8,
    paddingVertical: 6,
    marginVertical: 6,
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(196,168,124,0.4)',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Cinzel',
    fontSize: 11,
    fontWeight: 700,
    color: '#5c3d2e',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#8b6f5e',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#2c1810',
  },
  table: {
    width: '100%',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(196,168,124,0.2)',
    borderBottomWidth: 1,
    borderBottomColor: '#c4a87c',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(196,168,124,0.3)',
    borderBottomStyle: 'solid',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: '#4a3728',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: '#8b6f5e',
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Clean (printer-friendly) stylesheet
// ---------------------------------------------------------------------------

const cleanStyles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  heading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#555555',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    borderBottomStyle: 'solid',
    marginVertical: 8,
  },
  callout: {
    borderLeftWidth: 2,
    borderLeftColor: '#cccccc',
    borderLeftStyle: 'solid',
    paddingLeft: 8,
    paddingVertical: 6,
    marginVertical: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#555555',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  table: {
    width: '100%',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
    borderBottomStyle: 'solid',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: '#1a1a1a',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: '#999999',
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getStyles(theme: PdfTheme): PdfStyles {
  return theme === 'themed' ? themedStyles : cleanStyles;
}
