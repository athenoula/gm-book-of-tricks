import type { Open5eSpell } from '@/lib/open5e'

export function SpellFullView({ data }: { data: Record<string, unknown> }) {
  const spellData = (data.spell_data ?? {}) as Partial<Open5eSpell>

  return (
    <div className="space-y-2 text-sm">
      {/* Level / School line */}
      <p className="text-xs text-info italic">
        {data.level === 0 ? 'Cantrip' : `${ordinal(data.level as number)}-level`}{' '}
        {(data.school as string)?.toLowerCase()}
        {data.concentration && ' (concentration)'}
        {data.ritual && ' (ritual)'}
      </p>

      <Separator />

      {/* Casting info grid */}
      <div className="grid grid-cols-2 gap-1.5 text-xs text-text-secondary">
        <div><span className="text-text-muted font-medium">Casting Time</span> {data.casting_time as string ?? spellData.casting_time}</div>
        <div><span className="text-text-muted font-medium">Range</span> {data.range as string ?? spellData.range}</div>
        <div><span className="text-text-muted font-medium">Duration</span> {data.duration as string ?? spellData.duration}</div>
        <div><span className="text-text-muted font-medium">Components</span> {data.components as string ?? formatComponents(spellData)}</div>
      </div>

      <Separator />

      {/* Full description */}
      {spellData.desc && (
        <p className="text-xs text-text-body whitespace-pre-line">{spellData.desc}</p>
      )}

      {/* At Higher Levels */}
      {spellData.higher_level && (
        <>
          <Separator />
          <div>
            <SectionHeader>At Higher Levels</SectionHeader>
            <p className="text-xs text-text-body whitespace-pre-line">{spellData.higher_level}</p>
          </div>
        </>
      )}

      {/* Classes */}
      {(data.classes as string[] | undefined)?.length ? (
        <>
          <Separator />
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted font-medium">Classes:</span> {(data.classes as string[]).join(', ')}
          </div>
        </>
      ) : spellData.dnd_class ? (
        <>
          <Separator />
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted font-medium">Classes:</span> {spellData.dnd_class}
          </div>
        </>
      ) : null}

      {/* GM Notes */}
      {data.notes && (
        <div>
          <SectionHeader>GM Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-info/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-info uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatComponents(spellData: Partial<Open5eSpell>): string {
  const parts: string[] = []
  if (spellData.requires_verbal_components) parts.push('V')
  if (spellData.requires_somatic_components) parts.push('S')
  if (spellData.requires_material_components) parts.push(`M (${spellData.material || '...'})`)
  return parts.join(', ') || '—'
}
