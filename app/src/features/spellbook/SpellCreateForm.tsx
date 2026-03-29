import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SlideUp } from '@/components/motion'
import { SPELL_SCHOOLS, SPELL_CLASSES } from '@/lib/types'
import type { Spell } from '@/lib/types'
import { useCreateSpell, useUpdateSpell } from './useSpells'

export function SpellCreateForm({
  campaignId,
  spell,
  onClose,
}: {
  campaignId: string
  spell?: Spell
  onClose: () => void
}) {
  const isEdit = !!spell
  const spellData = (spell?.spell_data ?? {}) as Record<string, unknown>

  const [name, setName] = useState(spell?.name ?? '')
  const [level, setLevel] = useState(spell?.level ?? 0)
  const [school, setSchool] = useState(spell?.school ?? '')
  const [castingTime, setCastingTime] = useState(spell?.casting_time ?? '')
  const [range, setRange] = useState(spell?.range ?? '')
  const [duration, setDuration] = useState(spell?.duration ?? '')
  const [components, setComponents] = useState(spell?.components ?? '')
  const [concentration, setConcentration] = useState(spell?.concentration ?? false)
  const [ritual, setRitual] = useState(spell?.ritual ?? false)
  const [classes, setClasses] = useState<string[]>(spell?.classes ?? [])
  const [desc, setDesc] = useState((spellData.desc as string) ?? '')
  const [higherLevel, setHigherLevel] = useState((spellData.higher_level as string) ?? '')
  const [notes, setNotes] = useState(spell?.notes ?? '')

  const createSpell = useCreateSpell()
  const updateSpell = useUpdateSpell()

  function toggleClass(cls: string) {
    setClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      campaignId,
      name: name.trim(),
      level,
      school,
      casting_time: castingTime,
      range,
      duration,
      concentration,
      ritual,
      components,
      classes,
      desc,
      higher_level: higherLevel,
      notes,
    }

    if (isEdit && spell) {
      updateSpell.mutate({ ...payload, id: spell.id }, { onSuccess: () => onClose() })
    } else {
      createSpell.mutate(payload, { onSuccess: () => onClose() })
    }
  }

  const isPending = createSpell.isPending || updateSpell.isPending

  const selectClass =
    'w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30'

  return (
    <SlideUp>
      <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg text-text-heading">
            {isEdit ? 'Edit Spell' : 'Create Custom Spell'}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Name + Level + School */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className={selectClass}
            >
              <option value={0}>Cantrip</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary font-medium">School</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className={selectClass}
            >
              <option value="">—</option>
              {SPELL_SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Casting Mechanics */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Casting Time" value={castingTime} onChange={(e) => setCastingTime(e.target.value)} placeholder="e.g. 1 action" />
          <Input label="Range" value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. 120 feet" />
          <Input label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. Instantaneous" />
          <Input label="Components" value={components} onChange={(e) => setComponents(e.target.value)} placeholder="e.g. V, S, M (bat guano)" />
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-text-body cursor-pointer">
            <input
              type="checkbox"
              checked={concentration}
              onChange={(e) => setConcentration(e.target.checked)}
              className="rounded border-border"
            />
            Concentration
          </label>
          <label className="flex items-center gap-2 text-sm text-text-body cursor-pointer">
            <input
              type="checkbox"
              checked={ritual}
              onChange={(e) => setRitual(e.target.checked)}
              className="rounded border-border"
            />
            Ritual
          </label>
        </div>

        {/* Classes */}
        <div>
          <label className="text-sm text-text-secondary font-medium block mb-2">Classes</label>
          <div className="flex flex-wrap gap-2">
            {SPELL_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => toggleClass(cls)}
                className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${
                  classes.includes(cls)
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-text-muted hover:text-text-body hover:border-border-active'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="What does this spell do?"
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* At Higher Levels */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">At Higher Levels</label>
          <textarea
            value={higherLevel}
            onChange={(e) => setHigherLevel(e.target.value)}
            rows={2}
            placeholder="Optional: how does this spell scale?"
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* GM Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">GM Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Private notes about this spell..."
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? 'Saving...' : isEdit ? 'Save Spell' : 'Create Spell'}
          </Button>
        </div>
      </form>
    </SlideUp>
  )
}
