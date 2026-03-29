import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiPositionMarker, GiQuillInk } from '@/components/ui/icons'
import { StaggerList, StaggerItem } from '@/components/motion'
import { uploadImage } from '@/lib/storage'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useLocationNPCs, useLinkNPC, useUnlinkNPC, useUpdateLocationImage } from './useLocations'
import { useNPCs } from '@/features/characters/useCharacters'
import type { Location } from './useLocations'
import { generateLocationPDF, generateBundlePDF } from '@/lib/export/pdf/generate'
import { usePrintSelectStore } from '@/lib/export/pdf/usePrintSelectStore'
import { PrintSelectionBar } from '@/components/ui/PrintSelectionBar'
import type { BundleItem } from '@/lib/export/pdf/BundlePDF'

const LOCATION_TYPES = ['City', 'Town', 'Village', 'Dungeon', 'Wilderness', 'Building', 'Region', 'Landmark', 'Other'] as const

export function LocationsPage({ campaignId }: { campaignId: string }) {
  const { data: locations, isLoading, error } = useLocations(campaignId)
  const createLocation = useCreateLocation()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newParent, setNewParent] = useState('')

  const { active, selectedIds, toggle, enterSelectMode, exitSelectMode, theme } = usePrintSelectStore()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createLocation.mutateAsync({
      campaign_id: campaignId,
      name: newName,
      type: newType || undefined,
      description: newDesc || undefined,
      parent_location_id: newParent || undefined,
    })
    setNewName('')
    setNewType('')
    setNewDesc('')
    setNewParent('')
    setShowCreate(false)
  }

  const handleBundlePrint = async () => {
    if (!locations) return
    const items: BundleItem[] = locations
      .filter((l) => selectedIds.has(l.id))
      .map((l) => ({ type: 'location' as const, data: l, allLocations: locations }))
    exitSelectMode()
    await generateBundlePDF(items, theme, 'locations')
  }

  // Build hierarchy
  const topLevel = locations?.filter((l) => !l.parent_location_id) ?? []
  const children = (parentId: string) => locations?.filter((l) => l.parent_location_id === parentId) ?? []

  if (isLoading) return <p className="text-text-muted text-sm py-4">Loading...</p>

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded-[--radius-md] p-4 text-center">
        <p className="text-danger text-sm">{error.message || 'Something went wrong'}</p>
        <p className="text-text-muted text-xs mt-1">Try refreshing the page</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2"><GameIcon icon={GiPositionMarker} size="xl" /> Locations</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={active ? exitSelectMode : () => enterSelectMode('location')}
          >
            {active ? 'Cancel' : 'Select'}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Add Location'}
          </Button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="The Rusty Anchor" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm">
                <option value="">—</option>
                {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Parent Location</label>
              <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm">
                <option value="">None (top level)</option>
                {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted text-sm resize-none focus:outline-none focus:border-border-active"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createLocation.isPending}>Add Location</Button>
          </div>
        </form>
      )}

      {locations && locations.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-10 text-center">
          <div className="text-3xl mb-3"><GameIcon icon={GiPositionMarker} size="3xl" /></div>
          <p className="text-text-secondary text-sm">No locations yet. Add places in your campaign world.</p>
        </div>
      )}

      {/* Location tree */}
      <StaggerList className="space-y-2">
        {topLevel.map((loc) => (
          <StaggerItem key={loc.id}>
            <LocationNode
              location={loc}
              children_={children(loc.id)}
              allLocations={locations ?? []}
              campaignId={campaignId}
              expanded={expandedId === loc.id}
              onToggle={() => setExpandedId(expandedId === loc.id ? null : loc.id)}
              depth={0}
              selectMode={active}
              selected={selectedIds.has(loc.id)}
              onSelect={() => toggle(loc.id)}
            />
          </StaggerItem>
        ))}
      </StaggerList>

      <PrintSelectionBar onPrint={handleBundlePrint} />
    </div>
  )
}

function LocationNode({ location, children_, allLocations, campaignId, expanded, onToggle, depth, selectMode, selected, onSelect }: {
  location: Location
  children_: Location[]
  allLocations: Location[]
  campaignId: string
  expanded: boolean
  onToggle: () => void
  depth: number
  selectMode?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(location.name)
  const [editDesc, setEditDesc] = useState(location.description ?? '')
  const [editNotes, setEditNotes] = useState(location.notes ?? '')
  const updateImage = useUpdateLocationImage()
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadImage(campaignId, 'locations', file)
      await updateImage.mutateAsync({ id: location.id, campaignId, url })
    } catch {
      // toast shown by mutation
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleSave = () => {
    updateLocation.mutate({
      id: location.id,
      name: editName,
      description: editDesc || undefined,
      notes: editNotes || undefined,
    })
    setEditing(false)
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className={`bg-bg-base rounded-[--radius-md] border overflow-hidden ${selected ? 'border-primary' : 'border-border'}`}>
        <div className="w-full flex items-center gap-3 p-3 hover:bg-bg-raised transition-colors">
          {selectMode && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={onSelect}
              className="rounded border-border accent-primary"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            onClick={onToggle}
            className="flex items-center gap-3 flex-1 text-left cursor-pointer min-w-0"
          >
            <span className="text-text-heading font-medium flex-1">{location.name}</span>
            {location.type && <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">{location.type}</span>}
            {children_.length > 0 && <span className="text-[10px] text-text-muted">{children_.length} sub</span>}
            <span className="text-xs text-text-muted">{expanded ? '▾' : '▸'}</span>
          </button>
          {!selectMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); generateLocationPDF(location, allLocations, 'themed') }}
              title="Print location"
            >
              <GameIcon icon={GiQuillInk} size="sm" />
            </Button>
          )}
        </div>

        {expanded && (
          <div className="border-t border-border p-3">
            {editing ? (
              <div className="space-y-2">
                <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" rows={2} className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm resize-none focus:outline-none focus:border-border-active" />
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm resize-none focus:outline-none focus:border-border-active" />
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave}>Save</Button>
                </div>
              </div>
            ) : (
              <div>
                {/* Location image */}
                {location.image_url && (
                  <img src={location.image_url} alt={location.name} className="w-full h-40 object-cover rounded-[--radius-md] mb-3" />
                )}

                {location.description && <p className="text-sm text-text-secondary mb-2">{location.description}</p>}
                {location.notes && <p className="text-xs text-text-muted mb-2">{location.notes}</p>}

                <LocationNPCList locationId={location.id} campaignId={campaignId} />

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading...' : location.image_url ? 'Change Image' : 'Add Image'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteLocation.mutate({ id: location.id, campaignId })} className="text-danger hover:text-danger">Delete</Button>
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render children */}
      {expanded && children_.length > 0 && (
        <div className="space-y-2 mt-2">
          {children_.map((child) => (
            <LocationNode
              key={child.id}
              location={child}
              children_={allLocations.filter((l) => l.parent_location_id === child.id)}
              allLocations={allLocations}
              campaignId={campaignId}
              expanded={false}
              onToggle={() => {}}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LocationNPCList({ locationId, campaignId }: { locationId: string; campaignId: string }) {
  const { data: linkedNPCs } = useLocationNPCs(locationId)
  const { data: allNPCs } = useNPCs(campaignId)
  const linkNPC = useLinkNPC()
  const unlinkNPC = useUnlinkNPC()
  const [showPicker, setShowPicker] = useState(false)

  const linkedIds = new Set(linkedNPCs?.map((ln: { npc_id: string }) => ln.npc_id) ?? [])
  const available = allNPCs?.filter((n) => !linkedIds.has(n.id))

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-text-muted uppercase tracking-wider">NPCs here</span>
        <button onClick={() => setShowPicker(!showPicker)} className="text-[10px] text-primary-light hover:underline cursor-pointer">
          {showPicker ? 'close' : '+ link'}
        </button>
      </div>

      {linkedNPCs && linkedNPCs.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {linkedNPCs.map((ln: { id: string; npc: { name: string; race?: string; occupation?: string } | null; role: string | null }) => (
            <span key={ln.id} className="text-xs bg-bg-raised px-2 py-1 rounded-[--radius-sm] text-text-secondary flex items-center gap-1">
              {ln.npc?.name ?? 'Unknown'}
              {ln.role && <span className="text-text-muted">({ln.role})</span>}
              <button onClick={() => unlinkNPC.mutate({ id: ln.id, locationId })} className="text-text-muted hover:text-danger cursor-pointer ml-0.5">✕</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-text-muted mb-2">No NPCs linked.</p>
      )}

      {showPicker && available && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-[10px] text-text-muted">No more NPCs to link.</p>
          ) : (
            available.map((npc) => (
              <button
                key={npc.id}
                onClick={() => linkNPC.mutate({ locationId, npcId: npc.id })}
                className="w-full text-left text-xs px-2 py-1 rounded-[--radius-sm] hover:bg-bg-raised text-text-secondary cursor-pointer"
              >
                {npc.name} {npc.occupation && `(${npc.occupation})`}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
