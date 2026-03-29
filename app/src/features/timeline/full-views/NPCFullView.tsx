import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { GiHoodedFigure } from '@/components/ui/icons'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import type { Open5eMonster } from '@/lib/open5e'
import type { AbilityScores } from '@/lib/types'

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export function NPCFullView({ data }: { data: Record<string, unknown> }) {
  if (data.is_pc) {
    return <PCFullView data={data} />
  }
  return <NPCDetailView data={data} />
}

function NPCDetailView({ data }: { data: Record<string, unknown> }) {
  const stats = data.stats as { hp?: number; ac?: number; strength?: number; dexterity?: number; constitution?: number; intelligence?: number; wisdom?: number; charisma?: number } | null
  const statBlock = data.stat_block as Open5eMonster | null

  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-3 items-start">
        {data.portrait_url && (
          <PortraitFrame imageUrl={data.portrait_url as string} fallbackIcon={GiHoodedFigure} size="md" />
        )}
        <div className="flex-1">
          <p className="text-xs text-text-secondary">
            {[data.race, data.occupation].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {data.personality && (
        <p className="text-xs text-text-secondary italic border-l-2 border-amber-500/50 pl-2">
          "{data.personality as string}"
        </p>
      )}

      <Separator />

      {data.appearance && (
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.appearance as string}</p>
        </div>
      )}

      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}

      {stats && (stats.strength || stats.hp || stats.ac) && (
        <>
          <Separator />
          <SectionHeader>Stats</SectionHeader>

          {(stats.hp || stats.ac) && (
            <div className="flex gap-4 text-xs text-text-secondary mb-2">
              {stats.hp != null && <span><span className="text-text-muted">HP</span> {stats.hp}</span>}
              {stats.ac != null && <span><span className="text-text-muted">AC</span> {stats.ac}</span>}
            </div>
          )}

          {stats.strength && (
            <div className="grid grid-cols-6 gap-1">
              {ABILITIES.map((ability) => {
                const score = stats[ability]
                if (score == null) return <div key={ability} />
                return (
                  <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
                    <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                    <div className="text-xs font-mono text-text-heading">{score}</div>
                    <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(score))}</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {statBlock && statBlock.strength && (
        <>
          <Separator />
          <SectionHeader>Stat Block</SectionHeader>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {ABILITIES.map((ability) => (
              <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
                <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                <div className="text-xs font-mono text-text-heading">{statBlock[ability]}</div>
                <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(statBlock[ability]))}</div>
              </div>
            ))}
          </div>

          {statBlock.special_abilities?.length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Special Abilities</div>
              {statBlock.special_abilities.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}

          {statBlock.actions?.length > 0 && (
            <div>
              <div className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Actions</div>
              {statBlock.actions.map((a, i) => (
                <p key={i} className="text-xs text-text-body mb-1">
                  <span className="font-medium text-text-heading italic">{a.name}.</span> {a.desc}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PCFullView({ data }: { data: Record<string, unknown> }) {
  const scores = data.ability_scores as AbilityScores | null
  const savingThrows = data.saving_throw_proficiencies as string[] | null
  const skillProfs = data.skill_proficiencies as string[] | null
  const equipment = data.equipment as { name: string; quantity?: number; description?: string }[] | null
  const classFeatures = data.class_features as { name: string; description: string }[] | null
  const traits = data.traits as { name: string; description: string }[] | null

  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-3 items-start">
        {data.portrait_url && (
          <PortraitFrame imageUrl={data.portrait_url as string} fallbackIcon={GiHoodedFigure} size="md" />
        )}
        <div className="flex-1">
          <p className="text-xs text-text-secondary">
            {[data.race, [data.class, data.subclass].filter(Boolean).join(' / ')].filter(Boolean).join(' · ')}{data.level ? ` · Level ${data.level}` : ''}
          </p>
          {(data.background || data.alignment) && (
            <p className="text-xs text-text-muted mt-0.5">
              {[data.background, data.alignment].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {(data.personality_traits || data.ideals || data.bonds || data.flaws) && (
        <div className="space-y-1.5">
          {data.personality_traits && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Personality </span>
              <span className="text-xs text-text-body">{data.personality_traits as string}</span>
            </div>
          )}
          {data.ideals && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Ideals </span>
              <span className="text-xs text-text-body">{data.ideals as string}</span>
            </div>
          )}
          {data.bonds && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Bonds </span>
              <span className="text-xs text-text-body">{data.bonds as string}</span>
            </div>
          )}
          {data.flaws && (
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider">Flaws </span>
              <span className="text-xs text-text-body">{data.flaws as string}</span>
            </div>
          )}
        </div>
      )}

      {data.appearance && (
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.appearance as string}</p>
        </div>
      )}
      {data.backstory && (
        <div>
          <SectionHeader>Backstory</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.backstory as string}</p>
        </div>
      )}

      <Separator />

      <div className="flex gap-4 text-xs text-text-secondary flex-wrap">
        {data.hp_max != null && <span><span className="text-text-muted">HP</span> {data.hp_current as number}/{data.hp_max as number}</span>}
        {data.armor_class != null && <span><span className="text-text-muted">AC</span> {data.armor_class as number}</span>}
        {data.speed != null && <span><span className="text-text-muted">Speed</span> {data.speed as number} ft.</span>}
        {data.proficiency_bonus != null && <span><span className="text-text-muted">Prof</span> {formatModifier(data.proficiency_bonus as number)}</span>}
      </div>

      {scores && (
        <div className="grid grid-cols-6 gap-1">
          {ABILITIES.map((ability) => (
            <div key={ability} className="bg-bg-raised rounded-[--radius-sm] p-1.5 text-center">
              <div className="text-[8px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
              <div className="text-xs font-mono text-text-heading">{scores[ability]}</div>
              <div className="text-[9px] text-text-secondary">{formatModifier(abilityModifier(scores[ability]))}</div>
            </div>
          ))}
        </div>
      )}

      {savingThrows && savingThrows.length > 0 && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Saving Throws:</span> {savingThrows.join(', ')}
        </div>
      )}

      {skillProfs && skillProfs.length > 0 && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Skills:</span> {skillProfs.join(', ')}
        </div>
      )}

      {data.spellcasting_ability && (
        <div className="text-xs text-text-secondary">
          <span className="text-text-muted font-medium">Spellcasting:</span> {data.spellcasting_ability as string}
        </div>
      )}

      {equipment && equipment.length > 0 && (
        <div>
          <SectionHeader>Equipment</SectionHeader>
          <div className="text-xs text-text-body space-y-0.5">
            {equipment.map((item, i) => (
              <div key={i}>
                {item.name}{item.quantity && item.quantity > 1 ? ` (×${item.quantity})` : ''}
                {item.description && <span className="text-text-muted"> — {item.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {classFeatures && classFeatures.length > 0 && (
        <div>
          <SectionHeader>Class Features</SectionHeader>
          {classFeatures.map((f, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{f.name}.</span> {f.description}
            </p>
          ))}
        </div>
      )}

      {traits && traits.length > 0 && (
        <div>
          <SectionHeader>Traits</SectionHeader>
          {traits.map((t, i) => (
            <p key={i} className="text-xs text-text-body mb-1">
              <span className="font-medium text-text-heading">{t.name}.</span> {t.description}
            </p>
          ))}
        </div>
      )}

      {data.notes && (
        <div>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-text-body whitespace-pre-line">{data.notes as string}</p>
        </div>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t-2 border-amber-500/30 my-1" />
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold mb-1">
      {children}
    </div>
  )
}
