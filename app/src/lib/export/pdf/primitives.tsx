import { View, Text } from '@react-pdf/renderer'

// ---------------------------------------------------------------------------
// Type: PdfStyles
// ---------------------------------------------------------------------------
// styles.ts does not exist yet — use a permissive record type so this file
// stays compatible when styles.ts is added later.
type PdfStyles = Record<string, Record<string, unknown>>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

// ---------------------------------------------------------------------------
// 1. PageHeader
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  title: string
  subtitle?: string
  styles: PdfStyles
}

export function PageHeader({ title, subtitle, styles }: PageHeaderProps) {
  return (
    <View>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.label}>{subtitle}</Text> : null}
      <Divider styles={styles} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// 2. SectionHeading
// ---------------------------------------------------------------------------

interface SectionHeadingProps {
  text: string
  styles: PdfStyles
}

export function SectionHeading({ text, styles }: SectionHeadingProps) {
  return <Text style={styles.subheading}>{text}</Text>
}

// ---------------------------------------------------------------------------
// 3. Divider
// ---------------------------------------------------------------------------

interface DividerProps {
  styles: PdfStyles
}

export function Divider({ styles }: DividerProps) {
  return <View style={styles.divider} />
}

// ---------------------------------------------------------------------------
// 4. AbilityScoreRow
// ---------------------------------------------------------------------------

interface AbilityScores {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

interface AbilityScoreRowProps {
  scores: AbilityScores
  styles: PdfStyles
}

const ABILITY_LABELS: [keyof AbilityScores, string][] = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
]

export function AbilityScoreRow({ scores, styles }: AbilityScoreRowProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {ABILITY_LABELS.map(([key, label]) => (
        <View key={key} style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.statValue}>{scores[key]}</Text>
          <Text style={styles.statLabel}>{calcModifier(scores[key])}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 5. StatBlockCard
// ---------------------------------------------------------------------------

interface StatBlockCardProps {
  name: string
  ac?: string | number
  hp?: string | number
  cr?: string | number
  speed?: string
  actions?: string[]
  styles: PdfStyles
}

export function StatBlockCard({ name, ac, hp, cr, speed, actions, styles }: StatBlockCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      <View style={{ flexDirection: 'row', gap: 8, ...styles.statRow }}>
        {ac !== undefined && (
          <Text style={styles.statLabel}>
            AC <Text style={styles.statValue}>{ac}</Text>
          </Text>
        )}
        {hp !== undefined && (
          <Text style={styles.statLabel}>
            HP <Text style={styles.statValue}>{hp}</Text>
          </Text>
        )}
        {cr !== undefined && (
          <Text style={styles.statLabel}>
            CR <Text style={styles.statValue}>{cr}</Text>
          </Text>
        )}
      </View>
      {speed ? <Text style={styles.body}>Speed: {speed}</Text> : null}
      {actions && actions.length > 0 ? (
        <Text style={styles.body}>Actions: {actions.join(', ')}</Text>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 6. SpellCardPrimitive
// ---------------------------------------------------------------------------

interface SpellCardPrimitiveProps {
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  description?: string
  styles: PdfStyles
}

export function SpellCardPrimitive({
  name,
  level,
  school,
  castingTime,
  range,
  description,
  styles,
}: SpellCardPrimitiveProps) {
  const levelLabel = level === 0 ? 'Cantrip' : `Level ${level}`

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={styles.label}>
        {levelLabel} · {school}
      </Text>
      <Text style={styles.statLabel}>
        {castingTime} · {range}
      </Text>
      {description ? (
        <Text style={styles.body}>{truncate(description, 200)}</Text>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 7. NPCCardPrimitive
// ---------------------------------------------------------------------------

interface NPCCardPrimitiveProps {
  name: string
  personality?: string
  ac?: string | number
  hp?: string | number
  spells?: string[]
  styles: PdfStyles
}

export function NPCCardPrimitive({ name, personality, ac, hp, spells, styles }: NPCCardPrimitiveProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{name}</Text>
      {personality ? (
        <Text style={{ ...styles.body, fontStyle: 'italic' }}>
          {truncate(personality, 150)}
        </Text>
      ) : null}
      {(ac !== undefined || hp !== undefined) && (
        <View style={{ flexDirection: 'row', gap: 8, ...styles.statRow }}>
          {ac !== undefined && (
            <Text style={styles.statLabel}>
              AC <Text style={styles.statValue}>{ac}</Text>
            </Text>
          )}
          {hp !== undefined && (
            <Text style={styles.statLabel}>
              HP <Text style={styles.statValue}>{hp}</Text>
            </Text>
          )}
        </View>
      )}
      {spells && spells.length > 0 ? (
        <Text style={styles.body}>Spells: {spells.join(', ')}</Text>
      ) : null}
    </View>
  )
}

// ---------------------------------------------------------------------------
// 8. PageFooter
// ---------------------------------------------------------------------------

interface PageFooterProps {
  styles: PdfStyles
}

export function PageFooter({ styles }: PageFooterProps) {
  return (
    // @ts-expect-error — @react-pdf/renderer View accepts a `fixed` prop not typed in all versions
    <View fixed style={styles.footer}>
      <Text>Generated by Book of Tricks</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  )
}
