import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiQuillInk } from '@/components/ui/icons'
import { StaggerList, StaggerItem, ScaleIn } from '@/components/motion'
import type { Handout, HandoutTemplate } from '@/lib/types'
import { useHandouts, useCreateHandout, useDeleteHandout } from './useHandouts'
import { HandoutEditor } from './HandoutEditor'
import { TEMPLATE_CONFIGS } from './templates'

interface Props {
  campaignId: string
}

export function HandoutsPage({ campaignId }: Props) {
  const { data: handouts, isLoading } = useHandouts(campaignId)
  const createHandout = useCreateHandout()
  const deleteHandout = useDeleteHandout()
  const [editing, setEditing] = useState<Handout | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplate, setNewTemplate] = useState<HandoutTemplate>('scroll')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const result = await createHandout.mutateAsync({
      campaign_id: campaignId,
      name: newName.trim(),
      template: newTemplate,
    })
    setShowCreate(false)
    setNewName('')
    setEditing(result)
  }

  const handleDelete = (id: string) => {
    deleteHandout.mutate({ id, campaignId })
    setConfirmDelete(null)
  }

  if (editing) {
    return (
      <div className="h-[calc(100vh-64px)]">
        <HandoutEditor
          handout={editing}
          campaignId={campaignId}
          onClose={() => setEditing(null)}
        />
      </div>
    )
  }

  if (isLoading) return <p className="text-text-muted text-sm py-4">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl flex items-center gap-2 font-heading text-text-heading">
          <GameIcon icon={GiQuillInk} size="xl" /> Handouts
        </h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Handout'}
        </Button>
      </div>

      {showCreate && (
        <ScaleIn>
          <div className="bg-bg-base border border-border rounded-[--radius-lg] p-4 mb-6 space-y-3">
            <Input
              placeholder="Handout name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div>
              <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Template</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.values(TEMPLATE_CONFIGS).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setNewTemplate(t.key)}
                    className={`px-2.5 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                      newTemplate === t.key
                        ? 'bg-primary/20 border-primary text-primary-light'
                        : 'bg-bg-raised border-border text-text-muted'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim() || createHandout.isPending}>
              Create
            </Button>
          </div>
        </ScaleIn>
      )}

      {handouts?.length === 0 && !showCreate && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <p className="text-text-secondary mb-2">No handouts yet.</p>
          <p className="text-text-muted text-sm">Create scrolls, wanted posters, decrees, and more to share with your players.</p>
        </div>
      )}

      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {handouts?.map((h) => {
          const config = TEMPLATE_CONFIGS[h.template]
          return (
            <StaggerItem key={h.id}>
              <div className="bg-bg-base border border-border rounded-[--radius-lg] overflow-hidden hover:border-border-hover transition-colors group ornamental-corners">
                <div className="h-24 bg-gradient-to-br from-amber-900/20 to-amber-800/10 flex items-center justify-center">
                  <span className="text-4xl opacity-50">{config.emoji}</span>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-heading truncate">{h.name}</div>
                      <div className="text-xs text-text-muted">{config.label}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(h)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmDelete(h.id)}>✕</Button>
                    </div>
                  </div>
                </div>
                {confirmDelete === h.id && (
                  <div className="px-3 pb-3 flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button size="sm" className="flex-1 bg-danger text-white" onClick={() => handleDelete(h.id)}>Delete</Button>
                  </div>
                )}
              </div>
            </StaggerItem>
          )
        })}
      </StaggerList>
    </div>
  )
}
