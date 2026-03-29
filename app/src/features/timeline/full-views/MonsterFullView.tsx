import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Open5eMonster } from '@/lib/open5e'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export function MonsterFullView({ data }: { data: Record<string, unknown> }) {
  const sb = (data.stat_block ?? data) as Open5eMonster

  return (
    <div className="space-y-2 text-sm">
      {/* Type line */}
      <p className="text-xs text-text-secondary italic">
        {data.size as string} {data.type as string}{sb.alignment ? `, ${sb.alignment}` : ''}
      </p>

      <Separator />

      {/* Core stats */}
      <div className="space-y-0.5 text-xs text-text-secondary">
        <div>
          <span className="text-text-muted font-medium">Armor Class</span>{' '}
          {data.armor_class as number}{data.armor_desc ? ` (${data.armor_desc as string})` : sb.armor_desc ? ` (${sb.armor_desc})` : ''}
        </div>
        <div>
          <span className="text-text-muted font-medium">Hit Points</span>{' '}
          {data.hit_points as number}{data.hit_dice ? ` (${data.hit_dice as string})` : sb.hit_dice ? ` (${sb.hit_dice})` : ''}
        </div>
        {(data.speed || sb.speed) && (
          <div>
            <span className="text-text-muted font-medium">Speed</span>{' '}
            {formatSpeed(data.speed as Record<string, number> ?? sb.speed)}
          </div>
        )}
      </div>

      <Separator />

      {/* Ability scores */}
      {sb.strength && (
        <div className="grid grid-cols-6 gap-1">
          {ABILITIES.map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
              <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-xs font-mono text-text-heading">{sb[ability]}</div>
              <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(sb[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Secondary stats */}
      <div className="space-y-0.5 text-xs text-text-secondary">
        {sb.saving_throws && Object.keys(sb.saving_throws).length > 0 && (
          <div>
            <span className="text-text-muted font-medium">Saving Throws</span>{' '}
            {Object.entries(sb.saving_throws).map(([k, v]) => `${capitalize(k)} ${formatModifier(v)}`).join(', ')}
          </div>
        )}
        {sb.skills && Object.keys(sb.skills).length > 0 && (
          <div>
            <span className="text-text-muted font-medium">Skills</span>{' '}
            {Object.entries(sb.skills).map(([k, v]) => `${capitalize(k)} ${formatModifier(v)}`).join(', ')}
          </div>
        )}
        {sb.damage_vulnerabilities && (
          <div><span className="text-text-muted font-medium">Damage Vulnerabilities</span> {sb.damage_vulnerabilities}</div>
        )}
        {sb.damage_resistances && (
          <div><span className="text-text-muted font-medium">Damage Resistances</span> {sb.damage_resistances}</div>
        )}
        {sb.damage_immunities && (
          <div><span className="text-text-muted font-medium">Damage Immunities</span> {sb.damage_immunities}</div>
        )}
        {sb.condition_immunities && (
          <div><span className="text-text-muted font-medium">Condition Immunities</span> {sb.condition_immunities}</div>
        )}
        {sb.senses && (
          <div><span className="text-text-muted font-medium">Senses</span> {sb.senses}</div>
        )}
        {sb.languages && (
          <div><span className="text-text-muted font-medium">Languages</span> {sb.languages}</div>
        )}
        <div>
          <span className="text-text-muted font-medium">Challenge</span> {data.challenge_rating as string}
        </div>
      </div>

      <Separator />

      {/* Special Abilities */}
      {sb.special_abilities?.length > 0 && (
        <AbilitySection title="Special Abilities" items={sb.special_abilities} />
      )}

      {/* Actions */}
      {sb.actions?.length > 0 && (
        <AbilitySection title="Actions" items={sb.actions} />
      )}

      {/* Reactions */}
      {typeof sb.reactions === 'string' && sb.reactions && (
        <div>
          <SectionHeader>Reactions</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{sb.reactions}</p>
        </div>
      )}
      {Array.isArray(sb.reactions) && sb.reactions.length > 0 && (
        <AbilitySection title="Reactions" items={sb.reactions} />
      )}

      {/* Legendary Actions */}
      {sb.legendary_actions?.length > 0 && (
        <div>
          <SectionHeader>Legendary Actions</SectionHeader>
          {sb.legendary_desc && (
            <p className="text-xs text-text-secondary italic mb-1">{sb.legendary_desc}</p>
          )}
          {sb.legendary_actions.map((a, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
            </p>
          ))}
        </div>
      )}

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
  return <div className="border-t-2 border-danger/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-danger uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}

function AbilitySection({ title, items }: { title: string; items: { name: string; desc: string }[] }) {
  return (
    <div>
      <SectionHeader>{title}</SectionHeader>
      {items.map((a, i) => (
        <p key={i} className="text-xs text-text-body mb-1">
          <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
        </p>
      ))}
    </div>
  )
}

function formatSpeed(speed: Record<string, number>): string {
  return Object.entries(speed).map(([k, v]) => k === 'walk' ? `${v} ft.` : `${k} ${v} ft.`).join(', ')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
