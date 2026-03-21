import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SlideUp } from '@/components/motion'
import { MONSTER_SIZES, MONSTER_TYPES, CHALLENGE_RATINGS } from '@/lib/data/editions'
import { abilityModifier } from '@/lib/dnd'
import { useCreateMonster, useUpdateMonster } from './useMonsters'
import type { Monster } from '@/lib/types'

const ABILITY_SCORES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
const SPEED_TYPES = ['walk', 'fly', 'swim', 'burrow', 'climb'] as const

// CR -> proficiency bonus mapping
const CR_PROF_BONUS: Record<string, number> = {
  '0': 2, '1/8': 2, '1/4': 2, '1/2': 2,
  '1': 2, '2': 2, '3': 2, '4': 2,
  '5': 3, '6': 3, '7': 3, '8': 3,
  '9': 4, '10': 4, '11': 4, '12': 4,
  '13': 5, '14': 5, '15': 5, '16': 5,
  '17': 6, '18': 6, '19': 6, '20': 6,
  '21': 7, '22': 7, '23': 7, '24': 7,
  '25': 8, '26': 8, '27': 8, '28': 8,
  '29': 9, '30': 9,
}

interface NameDesc {
  name: string
  desc: string
}

function parseStatBlockAbilities(sb: Record<string, unknown>, key: string): NameDesc[] {
  const arr = sb[key] as Array<{ name: string; desc: string }> | undefined
  if (!arr?.length) return [{ name: '', desc: '' }]
  return arr.map(a => ({ name: a.name || '', desc: a.desc || '' }))
}

function parseStatBlockSaves(sb: Record<string, unknown>): Record<string, boolean> {
  const saves: Record<string, boolean> = {}
  for (const ability of ABILITY_SCORES) {
    saves[ability] = sb[`${ability}_save`] != null
  }
  return saves
}

function parseStatBlockSpeed(sb: Record<string, unknown>): Record<string, string> {
  const speed = sb.speed as Record<string, unknown> | undefined
  const result: Record<string, string> = {}
  if (speed) {
    for (const t of SPEED_TYPES) {
      const val = speed[t]
      if (val != null) result[t] = String(val)
    }
  }
  return result
}

function parseSkillsToString(sb: Record<string, unknown>): string {
  const skills = sb.skills as Record<string, number> | undefined
  if (!skills) return ''
  return Object.entries(skills).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ')
}

export function MonsterCreateForm({
  campaignId,
  monster,
  onClose,
}: {
  campaignId: string
  monster?: Monster
  onClose: () => void
}) {
  const isEdit = !!monster
  const sb = (monster?.stat_block ?? {}) as Record<string, unknown>

  // Header
  const [name, setName] = useState(monster?.name ?? '')
  const [size, setSize] = useState(monster?.size ?? 'Medium')
  const [monsterType, setMonsterType] = useState(monster?.type ?? 'Beast')
  const [alignment, setAlignment] = useState(monster?.alignment ?? '')
  const [cr, setCr] = useState(monster?.challenge_rating ?? '1')

  // Defense
  const [ac, setAc] = useState(monster?.armor_class ?? 10)
  const [hp, setHp] = useState(monster?.hit_points ?? 10)
  const [hitDice, setHitDice] = useState(monster?.hit_dice ?? '')
  const [speeds, setSpeeds] = useState<Record<string, string>>(() =>
    isEdit ? parseStatBlockSpeed(sb) : { walk: '30 ft.' }
  )

  // Ability Scores
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {}
    for (const a of ABILITY_SCORES) {
      defaults[a] = (sb[a] as number) ?? 10
    }
    return defaults
  })

  // Proficiencies
  const [saveProficiencies, setSaveProficiencies] = useState<Record<string, boolean>>(() =>
    isEdit ? parseStatBlockSaves(sb) : {}
  )
  const [skills, setSkills] = useState(() => isEdit ? parseSkillsToString(sb) : '')

  // Traits
  const [dmgResistances, setDmgResistances] = useState((sb.damage_resistances as string) ?? '')
  const [dmgImmunities, setDmgImmunities] = useState((sb.damage_immunities as string) ?? '')
  const [dmgVulnerabilities, setDmgVulnerabilities] = useState((sb.damage_vulnerabilities as string) ?? '')
  const [conditionImmunities, setConditionImmunities] = useState((sb.condition_immunities as string) ?? '')
  const [senses, setSenses] = useState((sb.senses as string) ?? '')
  const [languages, setLanguages] = useState((sb.languages as string) ?? '')

  // Repeatable sections
  const [abilities, setAbilities] = useState<NameDesc[]>(() =>
    parseStatBlockAbilities(sb, 'special_abilities')
  )
  const [actions, setActions] = useState<NameDesc[]>(() =>
    parseStatBlockAbilities(sb, 'actions')
  )
  const [legendaryActions, setLegendaryActions] = useState<NameDesc[]>(() =>
    parseStatBlockAbilities(sb, 'legendary_actions')
  )
  const [showLegendary, setShowLegendary] = useState(() =>
    (sb.legendary_actions as unknown[])?.length > 0 ?? false
  )

  const createMonster = useCreateMonster()
  const updateMonster = useUpdateMonster()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const profBonus = CR_PROF_BONUS[cr] ?? 2

    // Build speed object
    const speedObj: Record<string, string> = {}
    for (const [k, v] of Object.entries(speeds)) {
      if (v.trim()) speedObj[k] = v.trim()
    }

    // Build saves
    const saveFields: Record<string, number | null> = {}
    for (const ability of ABILITY_SCORES) {
      saveFields[`${ability}_save`] = saveProficiencies[ability]
        ? abilityModifier(scores[ability]) + profBonus
        : null
    }

    // Parse skills text into an object
    const skillsObj: Record<string, number> = {}
    if (skills.trim()) {
      for (const part of skills.split(',')) {
        const trimmed = part.trim()
        const match = trimmed.match(/^(.+?)\s+([+-]?\d+)$/)
        if (match) {
          skillsObj[match[1].trim()] = parseInt(match[2], 10)
        }
      }
    }

    const statBlock: Record<string, unknown> = {
      ...Object.fromEntries(ABILITY_SCORES.map(a => [a, scores[a]])),
      armor_class: ac,
      hit_points: hp,
      hit_dice: hitDice,
      speed: speedObj,
      ...saveFields,
      skills: Object.keys(skillsObj).length > 0 ? skillsObj : {},
      damage_resistances: dmgResistances,
      damage_immunities: dmgImmunities,
      damage_vulnerabilities: dmgVulnerabilities,
      condition_immunities: conditionImmunities,
      senses,
      languages,
      special_abilities: abilities.filter(a => a.name.trim()).map(a => ({ name: a.name, desc: a.desc })),
      actions: actions.filter(a => a.name.trim()).map(a => ({ name: a.name, desc: a.desc })),
      legendary_actions: legendaryActions.filter(a => a.name.trim()).map(a => ({ name: a.name, desc: a.desc })),
      // Include fields for MonsterCard display compatibility
      name,
      size,
      type: monsterType,
      alignment,
      challenge_rating: cr,
    }

    const payload = {
      campaignId,
      name: name.trim(),
      size,
      type: monsterType,
      alignment,
      challenge_rating: cr,
      armor_class: ac,
      hit_points: hp,
      hit_dice: hitDice,
      speed: speedObj,
      stat_block: statBlock,
    }

    if (isEdit && monster) {
      updateMonster.mutate({ ...payload, id: monster.id }, { onSuccess: () => onClose() })
    } else {
      createMonster.mutate(payload, { onSuccess: () => onClose() })
    }
  }

  const isPending = createMonster.isPending || updateMonster.isPending

  const selectClass = 'w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30'

  return (
    <SlideUp>
      <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-text-heading">
            {isEdit ? 'Edit Monster' : 'Create Monster'}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Header */}
        <section className="space-y-3">
          <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">Header</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-2">
              <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Size</label>
              <select value={size} onChange={e => setSize(e.target.value)} className={selectClass}>
                {MONSTER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Type</label>
              <select value={monsterType} onChange={e => setMonsterType(e.target.value)} className={selectClass}>
                {MONSTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">CR</label>
              <select value={cr} onChange={e => setCr(e.target.value)} className={selectClass}>
                {CHALLENGE_RATINGS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Input label="Alignment" value={alignment} onChange={e => setAlignment(e.target.value)} placeholder="e.g. Chaotic Evil" />
        </section>

        {/* Defense */}
        <section className="space-y-3">
          <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">Defense</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input label="AC" type="number" value={ac} onChange={e => setAc(Number(e.target.value))} />
            <Input label="HP" type="number" value={hp} onChange={e => setHp(Number(e.target.value))} />
            <Input label="Hit Dice" value={hitDice} onChange={e => setHitDice(e.target.value)} placeholder="e.g. 4d10+8" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SPEED_TYPES.map(st => (
              <Input
                key={st}
                label={st.charAt(0).toUpperCase() + st.slice(1)}
                value={speeds[st] ?? ''}
                onChange={e => setSpeeds(prev => ({ ...prev, [st]: e.target.value }))}
                placeholder="30 ft."
              />
            ))}
          </div>
        </section>

        {/* Ability Scores */}
        <section className="space-y-3">
          <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">Ability Scores</h4>
          <div className="grid grid-cols-6 gap-2">
            {ABILITY_SCORES.map((a, i) => (
              <div key={a} className="text-center">
                <label className="text-xs text-text-muted uppercase block mb-1">{ABILITY_LABELS[i]}</label>
                <input
                  type="number"
                  value={scores[a]}
                  onChange={e => setScores(prev => ({ ...prev, [a]: Number(e.target.value) }))}
                  className="w-full text-center px-1 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active"
                  min={1}
                  max={30}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Proficiencies */}
        <section className="space-y-3">
          <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">Proficiencies</h4>
          <div>
            <label className="text-sm text-text-secondary font-medium block mb-2">Saving Throws</label>
            <div className="flex flex-wrap gap-3">
              {ABILITY_SCORES.map((a, i) => (
                <label key={a} className="flex items-center gap-1.5 text-sm text-text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!saveProficiencies[a]}
                    onChange={e => setSaveProficiencies(prev => ({ ...prev, [a]: e.target.checked }))}
                    className="rounded border-border"
                  />
                  {ABILITY_LABELS[i]}
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Skills"
            value={skills}
            onChange={e => setSkills(e.target.value)}
            placeholder="e.g. Perception +5, Stealth +4"
          />
        </section>

        {/* Traits */}
        <section className="space-y-3">
          <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">Traits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Damage Resistances" value={dmgResistances} onChange={e => setDmgResistances(e.target.value)} />
            <Input label="Damage Immunities" value={dmgImmunities} onChange={e => setDmgImmunities(e.target.value)} />
            <Input label="Damage Vulnerabilities" value={dmgVulnerabilities} onChange={e => setDmgVulnerabilities(e.target.value)} />
            <Input label="Condition Immunities" value={conditionImmunities} onChange={e => setConditionImmunities(e.target.value)} />
            <Input label="Senses" value={senses} onChange={e => setSenses(e.target.value)} placeholder="e.g. darkvision 60 ft." />
            <Input label="Languages" value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. Common, Draconic" />
          </div>
        </section>

        {/* Special Abilities */}
        <RepeatableSection
          label="Special Abilities"
          items={abilities}
          onChange={setAbilities}
          addLabel="Add Ability"
        />

        {/* Actions */}
        <RepeatableSection
          label="Actions"
          items={actions}
          onChange={setActions}
          addLabel="Add Action"
        />

        {/* Legendary Actions */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowLegendary(!showLegendary)}
            className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wider font-label cursor-pointer hover:text-text-body transition-colors"
          >
            <span>{showLegendary ? '▾' : '▸'}</span>
            Legendary Actions
          </button>
          {showLegendary && (
            <RepeatableSection
              label=""
              items={legendaryActions}
              onChange={setLegendaryActions}
              addLabel="Add Legendary Action"
            />
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : isEdit ? 'Update Monster' : 'Create Monster'}
          </Button>
        </div>
      </form>
    </SlideUp>
  )
}

function RepeatableSection({
  label,
  items,
  onChange,
  addLabel,
}: {
  label: string
  items: NameDesc[]
  onChange: (items: NameDesc[]) => void
  addLabel: string
}) {
  function updateItem(index: number, field: 'name' | 'desc', value: string) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      onChange([{ name: '', desc: '' }])
    } else {
      onChange(items.filter((_, i) => i !== index))
    }
  }

  function addItem() {
    onChange([...items, { name: '', desc: '' }])
  }

  return (
    <section className="space-y-3">
      {label && <h4 className="text-xs text-text-muted uppercase tracking-wider font-label">{label}</h4>}
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Name"
              value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
            />
            <textarea
              placeholder="Description"
              value={item.desc}
              onChange={e => updateItem(i, 'desc', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="mt-2 text-text-muted hover:text-danger transition-colors cursor-pointer text-lg leading-none"
            title="Remove"
          >
            &times;
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        {addLabel}
      </Button>
    </section>
  )
}
