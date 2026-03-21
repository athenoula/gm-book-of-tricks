import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { getClassIcon } from '@/components/ui/class-icons'
import { uploadImage } from '@/lib/storage'
import { abilityModifier, formatModifier } from '@/lib/dnd'
import { getRacesForEdition, CLASSES } from '@/lib/data/editions'
import { useCampaign } from '@/features/campaigns/useCampaigns'
import { useUpdatePC, useDeletePC, useUpdatePortrait } from './useCharacters'
import { SpellPicker } from './SpellPicker'
import type { PlayerCharacter, AbilityScores } from '@/lib/types'

const ABILITY_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const

export function PCSheet({ pc, campaignId }: { pc: PlayerCharacter; campaignId: string }) {
  const [editing, setEditing] = useState(false)
  const [showSpells, setShowSpells] = useState(false)
  const updatePC = useUpdatePC()
  const deletePC = useDeletePC()
  const scores = pc.ability_scores as AbilityScores
  const updatePortrait = useUpdatePortrait()
  const [uploadingPortrait, setUploadingPortrait] = useState(false)

  const handlePortraitUpload = async (file: File) => {
    setUploadingPortrait(true)
    try {
      const url = await uploadImage(campaignId, 'portraits', file)
      await updatePortrait.mutateAsync({ table: 'player_characters', id: pc.id, campaignId, url })
    } catch {
      // toast shown by mutation error handler
    } finally {
      setUploadingPortrait(false)
    }
  }

  const handleDelete = () => {
    if (window.confirm(`Delete ${pc.name}? This cannot be undone.`)) {
      deletePC.mutate({ id: pc.id, campaignId })
    }
  }

  if (editing) {
    return (
      <PCEditForm
        pc={pc}
        campaignId={campaignId}
        onSave={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="bg-bg-base rounded-[--radius-lg] border border-border ornamental-corners">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <PortraitFrame
              imageUrl={pc.portrait_url}
              fallbackIcon={getClassIcon(pc.class)}
              size="lg"
              uploading={uploadingPortrait}
              onUpload={handlePortraitUpload}
            />
            <div>
              <h4 className="text-lg text-text-heading">{pc.name}</h4>
              <p className="text-sm text-text-secondary">
                {[pc.race, pc.class && pc.subclass ? `${pc.class} (${pc.subclass})` : pc.class, pc.level ? `Level ${pc.level}` : null].filter(Boolean).join(' · ')}
              </p>
              {pc.player_name && (
                <p className="text-xs text-text-muted mt-1">
                  Player: {pc.player_name}
                  {pc.player_email && ` · ${pc.player_email}`}
                  {pc.player_discord && ` · ${pc.player_discord}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-danger hover:text-danger">Delete</Button>
          </div>
        </div>
      </div>

      {/* Combat stats */}
      <div className="grid grid-cols-5 gap-px bg-border">
        {[
          { label: 'HP', value: `${pc.hp_current}/${pc.hp_max}`, color: pc.hp_current < pc.hp_max / 2 ? 'text-danger' : 'text-success' },
          { label: 'AC', value: pc.armor_class, color: 'text-info' },
          { label: 'Speed', value: `${pc.speed}ft`, color: 'text-text-heading' },
          { label: 'Initiative', value: formatModifier(pc.initiative_bonus), color: 'text-text-heading' },
          { label: 'Prof', value: `+${pc.proficiency_bonus}`, color: 'text-primary-light' },
        ].map((stat) => (
          <div key={stat.label} className="bg-bg-base p-3 text-center">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</div>
            <div className={`text-lg font-mono font-semibold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Ability scores */}
      <div className="p-4">
        <div className="grid grid-cols-6 gap-2">
          {ABILITY_NAMES.map((ability) => {
            const score = scores[ability] ?? 10
            const mod = abilityModifier(score)
            return (
              <div key={ability} className="bg-bg-raised rounded-[--radius-md] p-2 text-center">
                <div className="text-[10px] text-text-muted uppercase">{ability.slice(0, 3)}</div>
                <div className="text-lg font-mono text-text-heading">{score}</div>
                <div className="text-xs text-text-secondary">{formatModifier(mod)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Roleplay info */}
      {(pc.personality_traits || pc.ideals || pc.bonds || pc.flaws || pc.backstory || pc.appearance || pc.notes) && (
        <div className="px-4 pb-4 space-y-2">
          {[
            { label: 'Personality', value: pc.personality_traits },
            { label: 'Ideals', value: pc.ideals },
            { label: 'Bonds', value: pc.bonds },
            { label: 'Flaws', value: pc.flaws },
            { label: 'Appearance', value: pc.appearance },
            { label: 'Backstory', value: pc.backstory },
            { label: 'Notes', value: pc.notes },
          ].filter((f) => f.value).map((field) => (
            <div key={field.label} className="text-sm">
              <span className="text-text-muted font-medium">{field.label}:</span>{' '}
              <span className="text-text-secondary">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Spells section */}
      <div className="border-t border-border p-4">
        <button
          onClick={() => setShowSpells(!showSpells)}
          className="text-sm text-text-secondary hover:text-text-body cursor-pointer flex items-center gap-1.5"
        >
          <span>{showSpells ? '▾' : '▸'}</span>
          Spells {pc.spellcasting_ability && `(${pc.spellcasting_ability})`}
        </button>
        {showSpells && (
          <div className="mt-3">
            <SpellPicker pcId={pc.id} campaignId={campaignId} />
          </div>
        )}
      </div>
    </div>
  )
}

function PCEditForm({ pc, campaignId, onSave, onCancel }: {
  pc: PlayerCharacter
  campaignId: string
  onSave: () => void
  onCancel: () => void
}) {
  const updatePC = useUpdatePC()
  const { data: campaign } = useCampaign(campaignId)
  const races = getRacesForEdition(campaign?.game_system || '')
  const scores = pc.ability_scores as AbilityScores

  // Determine if existing value is a known race/class or custom
  const knownRace = races.includes(pc.race ?? '') ? (pc.race ?? '') : (pc.race ? 'other' : '')
  const knownClass = CLASSES.includes(pc.class as typeof CLASSES[number]) ? (pc.class ?? '') : (pc.class ? 'other' : '')

  const [name, setName] = useState(pc.name)
  const [race, setRace] = useState(knownRace)
  const [customRace, setCustomRace] = useState(knownRace === 'other' ? (pc.race ?? '') : '')
  const [pcClass, setPcClass] = useState(knownClass)
  const [customClass, setCustomClass] = useState(knownClass === 'other' ? (pc.class ?? '') : '')
  const [subclass, setSubclass] = useState(pc.subclass ?? '')
  const [level, setLevel] = useState(String(pc.level))
  const [background, setBackground] = useState(pc.background ?? '')
  const [alignment, setAlignment] = useState(pc.alignment ?? '')
  const [hpMax, setHpMax] = useState(String(pc.hp_max))
  const [hpCurrent, setHpCurrent] = useState(String(pc.hp_current))
  const [ac, setAc] = useState(String(pc.armor_class))
  const [speed, setSpeed] = useState(String(pc.speed))
  const [initBonus, setInitBonus] = useState(String(pc.initiative_bonus))
  const [profBonus, setProfBonus] = useState(String(pc.proficiency_bonus))
  const [spellcastingAbility, setSpellcastingAbility] = useState(pc.spellcasting_ability ?? '')

  const [str, setStr] = useState(String(scores.strength ?? 10))
  const [dex, setDex] = useState(String(scores.dexterity ?? 10))
  const [con, setCon] = useState(String(scores.constitution ?? 10))
  const [int_, setInt] = useState(String(scores.intelligence ?? 10))
  const [wis, setWis] = useState(String(scores.wisdom ?? 10))
  const [cha, setCha] = useState(String(scores.charisma ?? 10))

  const [playerName, setPlayerName] = useState(pc.player_name ?? '')
  const [playerEmail, setPlayerEmail] = useState(pc.player_email ?? '')
  const [playerDiscord, setPlayerDiscord] = useState(pc.player_discord ?? '')

  const [personality, setPersonality] = useState(pc.personality_traits ?? '')
  const [ideals, setIdeals] = useState(pc.ideals ?? '')
  const [bonds, setBonds] = useState(pc.bonds ?? '')
  const [flaws, setFlaws] = useState(pc.flaws ?? '')
  const [appearance, setAppearance] = useState(pc.appearance ?? '')
  const [backstory, setBackstory] = useState(pc.backstory ?? '')
  const [notes, setNotes] = useState(pc.notes ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalRace = race === 'other' ? customRace : race
    const finalClass = pcClass === 'other' ? customClass : pcClass
    await updatePC.mutateAsync({
      id: pc.id,
      name,
      race: finalRace || null,
      class: finalClass || null,
      subclass: subclass || null,
      level: parseInt(level, 10) || 1,
      background: background || null,
      alignment: alignment || null,
      hp_max: parseInt(hpMax, 10) || 10,
      hp_current: parseInt(hpCurrent, 10) || 0,
      armor_class: parseInt(ac, 10) || 10,
      speed: parseInt(speed, 10) || 30,
      initiative_bonus: parseInt(initBonus, 10) || 0,
      proficiency_bonus: parseInt(profBonus, 10) || 2,
      spellcasting_ability: spellcastingAbility || null,
      ability_scores: {
        strength: parseInt(str, 10) || 10,
        dexterity: parseInt(dex, 10) || 10,
        constitution: parseInt(con, 10) || 10,
        intelligence: parseInt(int_, 10) || 10,
        wisdom: parseInt(wis, 10) || 10,
        charisma: parseInt(cha, 10) || 10,
      },
      player_name: playerName || null,
      player_email: playerEmail || null,
      player_discord: playerDiscord || null,
      personality_traits: personality || null,
      ideals: ideals || null,
      bonds: bonds || null,
      flaws: flaws || null,
      appearance: appearance || null,
      backstory: backstory || null,
      notes: notes || null,
    })
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 space-y-4">
      <h4 className="text-lg text-text-heading">Edit {pc.name}</h4>

      {/* Identity */}
      <fieldset className="space-y-3">
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Identity</legend>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Race</label>
            <select
              value={race}
              onChange={e => setRace(e.target.value)}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors"
            >
              <option value="">Select race...</option>
              {races.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="other">Other (custom)</option>
            </select>
            {race === 'other' && (
              <input
                type="text"
                value={customRace}
                onChange={e => setCustomRace(e.target.value)}
                placeholder="Enter custom race..."
                className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors mt-1.5"
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Class</label>
            <select
              value={pcClass}
              onChange={e => setPcClass(e.target.value)}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors"
            >
              <option value="">Select class...</option>
              {CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="other">Other (custom)</option>
            </select>
            {pcClass === 'other' && (
              <input
                type="text"
                value={customClass}
                onChange={e => setCustomClass(e.target.value)}
                placeholder="Enter custom class..."
                className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors mt-1.5"
              />
            )}
          </div>
          <Input label="Subclass" value={subclass} onChange={(e) => setSubclass(e.target.value)} />
          <Input label="Level" type="number" value={level} onChange={(e) => setLevel(e.target.value)} min={1} max={20} />
          <Input label="Background" value={background} onChange={(e) => setBackground(e.target.value)} />
        </div>
        <Input label="Alignment" value={alignment} onChange={(e) => setAlignment(e.target.value)} placeholder="Chaotic Good" />
      </fieldset>

      {/* Ability Scores */}
      <fieldset>
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Ability Scores</legend>
        <div className="grid grid-cols-6 gap-2">
          {[
            { label: 'STR', value: str, set: setStr },
            { label: 'DEX', value: dex, set: setDex },
            { label: 'CON', value: con, set: setCon },
            { label: 'INT', value: int_, set: setInt },
            { label: 'WIS', value: wis, set: setWis },
            { label: 'CHA', value: cha, set: setCha },
          ].map((a) => (
            <div key={a.label} className="text-center">
              <label className="text-[10px] text-text-muted uppercase block mb-1">{a.label}</label>
              <input
                type="number"
                value={a.value}
                onChange={(e) => a.set(e.target.value)}
                min={1}
                max={30}
                className="w-full px-1 py-1.5 text-center rounded-[--radius-md] bg-bg-raised border border-border text-text-body font-mono focus:outline-none focus:border-border-active transition-colors"
              />
              <div className="text-xs text-text-secondary mt-0.5">
                {formatModifier(abilityModifier(parseInt(a.value, 10) || 10))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Combat Stats */}
      <fieldset>
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Combat</legend>
        <div className="grid grid-cols-6 gap-3">
          <Input label="HP Max" type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value)} />
          <Input label="HP Current" type="number" value={hpCurrent} onChange={(e) => setHpCurrent(e.target.value)} />
          <Input label="AC" type="number" value={ac} onChange={(e) => setAc(e.target.value)} />
          <Input label="Speed" type="number" value={speed} onChange={(e) => setSpeed(e.target.value)} />
          <Input label="Init Bonus" type="number" value={initBonus} onChange={(e) => setInitBonus(e.target.value)} />
          <Input label="Prof Bonus" type="number" value={profBonus} onChange={(e) => setProfBonus(e.target.value)} />
        </div>
      </fieldset>

      {/* Spellcasting */}
      <fieldset>
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Spellcasting</legend>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Spellcasting Ability</label>
          <select
            value={spellcastingAbility}
            onChange={(e) => setSpellcastingAbility(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active transition-colors"
          >
            <option value="">None</option>
            <option value="Intelligence">Intelligence</option>
            <option value="Wisdom">Wisdom</option>
            <option value="Charisma">Charisma</option>
          </select>
        </div>
      </fieldset>

      {/* Player Info */}
      <fieldset>
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Player Info</legend>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <Input label="Email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} type="email" />
          <Input label="Discord" value={playerDiscord} onChange={(e) => setPlayerDiscord(e.target.value)} />
        </div>
      </fieldset>

      {/* Roleplay */}
      <fieldset className="space-y-3">
        <legend className="text-xs text-text-muted uppercase tracking-wider mb-2">Roleplay</legend>
        <TextArea label="Personality Traits" value={personality} onChange={setPersonality} />
        <div className="grid grid-cols-2 gap-3">
          <TextArea label="Ideals" value={ideals} onChange={setIdeals} />
          <TextArea label="Bonds" value={bonds} onChange={setBonds} />
        </div>
        <TextArea label="Flaws" value={flaws} onChange={setFlaws} />
        <TextArea label="Appearance" value={appearance} onChange={setAppearance} />
        <TextArea label="Backstory" value={backstory} onChange={setBackstory} rows={4} />
        <TextArea label="Notes" value={notes} onChange={setNotes} />
      </fieldset>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={updatePC.isPending || !name.trim()}>
          {updatePC.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}

function TextArea({ label, value, onChange, rows = 2 }: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-text-secondary font-medium">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors resize-none text-sm"
      />
    </div>
  )
}
