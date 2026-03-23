import { useState, useEffect } from 'react'
import { useTutorial } from '@/lib/tutorial'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { PortraitFrame } from '@/components/ui/PortraitFrame'
import { GiThreeFriends, GiHoodedFigure } from '@/components/ui/icons'
import { StaggerList, StaggerItem } from '@/components/motion'
import { getRacesForEdition, CLASSES } from '@/lib/data/editions'
import { useCampaign } from '@/features/campaigns/useCampaigns'
import { usePCs, useCreatePC, useNPCs, useCreateNPC, useDeleteNPC } from './useCharacters'
import { PCSheet } from './PCSheet'
import type { PlayerCharacter, NPC } from '@/lib/types'

export function CharactersPage({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<'pcs' | 'npcs'>('pcs')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiThreeFriends} size="xl" /> Characters</h2>
        <div className="flex gap-1 bg-bg-raised rounded-[--radius-md] p-0.5">
          <button
            onClick={() => setTab('pcs')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'pcs' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            Player Characters
          </button>
          <button
            onClick={() => setTab('npcs')}
            className={`px-3 py-1.5 text-sm rounded-[--radius-sm] transition-colors cursor-pointer ${tab === 'npcs' ? 'bg-bg-surface text-text-heading' : 'text-text-muted hover:text-text-body'}`}
          >
            NPCs
          </button>
        </div>
      </div>

      {tab === 'pcs' && <PCList campaignId={campaignId} />}
      {tab === 'npcs' && <NPCList campaignId={campaignId} />}
    </div>
  )
}

function PCList({ campaignId }: { campaignId: string }) {
  const { data: pcs, isLoading, error } = usePCs(campaignId)
  const createPC = useCreatePC()
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-tutorial="create-character">
          {showForm ? 'Cancel' : '+ Add PC'}
        </Button>
      </div>

      {showForm && (
        <PCCreateForm
          campaignId={campaignId}
          onSave={async (data) => {
            await createPC.mutateAsync(data)
            setShowForm(false)
          }}
          isPending={createPC.isPending}
        />
      )}

      {isLoading && <p className="text-text-muted text-sm py-4">Loading...</p>}

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-[--radius-md] p-4 text-center">
          <p className="text-danger text-sm">{error.message || 'Something went wrong'}</p>
          <p className="text-text-muted text-xs mt-1">Try refreshing the page</p>
        </div>
      )}

      {pcs && pcs.length === 0 && !showForm && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No player characters yet.</p>
        </div>
      )}

      <StaggerList className="space-y-4">
        {pcs?.map((pc) => (
          <StaggerItem key={pc.id}>
            <PCSheet pc={pc} campaignId={campaignId} />
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  )
}

function PCCreateForm({ campaignId, onSave, isPending }: {
  campaignId: string
  onSave: (data: Partial<PlayerCharacter> & { campaign_id: string; name: string }) => void
  isPending: boolean
}) {
  const { data: campaign } = useCampaign(campaignId)
  const races = getRacesForEdition(campaign?.game_system || '')

  const [name, setName] = useState('')
  const [race, setRace] = useState('')
  const [customRace, setCustomRace] = useState('')
  const [pcClass, setPcClass] = useState('')
  const [customClass, setCustomClass] = useState('')
  const [level, setLevel] = useState('1')
  const [hpMax, setHpMax] = useState('10')
  const [ac, setAc] = useState('10')
  const [playerName, setPlayerName] = useState('')
  const { prefillData, isActive } = useTutorial()

  useEffect(() => {
    if (isActive && prefillData) {
      if (prefillData.name) setName(prefillData.name as string)
      if (prefillData.class) setPcClass(prefillData.class as string)
      if (prefillData.level) setLevel(String(prefillData.level))
    }
  }, [isActive, prefillData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hp = parseInt(hpMax, 10) || 10
    const finalRace = race === 'other' ? customRace : race
    const finalClass = pcClass === 'other' ? customClass : pcClass
    onSave({
      campaign_id: campaignId,
      name,
      race: finalRace || null,
      class: finalClass || null,
      level: parseInt(level, 10) || 1,
      hp_max: hp,
      hp_current: hp,
      armor_class: parseInt(ac, 10) || 10,
      player_name: playerName || null,
    })
  }

  const selectClassName = "w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors"
  const customInputClassName = "w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors mt-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Character Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Optional" />
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Race</label>
          <select value={race} onChange={e => setRace(e.target.value)} className={selectClassName}>
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
              className={customInputClassName}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Class</label>
          <select value={pcClass} onChange={e => setPcClass(e.target.value)} className={selectClassName}>
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
              className={customInputClassName}
            />
          )}
        </div>
        <Input label="Level" type="number" value={level} onChange={(e) => setLevel(e.target.value)} min={1} max={20} />
        <Input label="HP" type="number" value={hpMax} onChange={(e) => setHpMax(e.target.value)} />
        <Input label="AC" type="number" value={ac} onChange={(e) => setAc(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending ? 'Saving...' : 'Add Character'}
        </Button>
      </div>
    </form>
  )
}

function NPCList({ campaignId }: { campaignId: string }) {
  const { data: npcs, isLoading, error } = useNPCs(campaignId)
  const createNPC = useCreateNPC()
  const deleteNPC = useDeleteNPC()
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add NPC'}
        </Button>
      </div>

      {showForm && (
        <NPCForm
          campaignId={campaignId}
          onSave={async (data) => {
            await createNPC.mutateAsync(data)
            setShowForm(false)
          }}
          isPending={createNPC.isPending}
        />
      )}

      {isLoading && <p className="text-text-muted text-sm py-4">Loading...</p>}

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-[--radius-md] p-4 text-center">
          <p className="text-danger text-sm">{error.message || 'Something went wrong'}</p>
          <p className="text-text-muted text-xs mt-1">Try refreshing the page</p>
        </div>
      )}

      {npcs && npcs.length === 0 && !showForm && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary text-sm">No NPCs yet. Add one or use the NPC Generator.</p>
        </div>
      )}

      <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {npcs?.map((npc) => (
          <StaggerItem key={npc.id}>
            <NPCCard npc={npc} onDelete={() => deleteNPC.mutate({ id: npc.id, campaignId })} />
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  )
}

function NPCCard({ npc, onDelete }: { npc: NPC; onDelete: () => void }) {
  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border p-4 group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <PortraitFrame
            imageUrl={npc.portrait_url}
            fallbackIcon={GiHoodedFigure}
            size="sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-text-heading font-medium">{npc.name}</h4>
              {npc.stat_block && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
                  Has Stat Block
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {[npc.race, npc.occupation].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>
      {npc.personality && (
        <p className="text-xs text-text-secondary mt-2 italic">"{npc.personality}"</p>
      )}
      {npc.appearance && (
        <p className="text-xs text-text-muted mt-1">{npc.appearance}</p>
      )}
      {npc.notes && (
        <p className="text-xs text-text-muted mt-1">{npc.notes}</p>
      )}
    </div>
  )
}

function NPCForm({ campaignId, onSave, isPending }: {
  campaignId: string
  onSave: (data: Partial<NPC> & { campaign_id: string; name: string }) => void
  isPending: boolean
}) {
  const { data: campaign } = useCampaign(campaignId)
  const races = getRacesForEdition(campaign?.game_system || '')

  const [name, setName] = useState('')
  const [race, setRace] = useState('')
  const [customRace, setCustomRace] = useState('')
  const [occupation, setOccupation] = useState('')
  const [personality, setPersonality] = useState('')
  const [appearance, setAppearance] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalRace = race === 'other' ? customRace : race
    onSave({
      campaign_id: campaignId,
      name,
      race: finalRace || null,
      occupation: occupation || null,
      personality: personality || null,
      appearance: appearance || null,
    })
  }

  const selectClassName = "w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors"
  const customInputClassName = "w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors mt-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-4 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary font-medium">Race</label>
          <select value={race} onChange={e => setRace(e.target.value)} className={selectClassName}>
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
              className={customInputClassName}
            />
          )}
        </div>
        <Input label="Occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Blacksmith" />
      </div>
      <Input label="Personality" value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="Gruff but kind-hearted" />
      <Input label="Appearance" value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="Soot-covered, muscular arms" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending ? 'Saving...' : 'Add NPC'}
        </Button>
      </div>
    </form>
  )
}
