import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StaggerList, StaggerItem } from '@/components/motion'
import { GameIcon } from '@/components/ui/GameIcon'
import type { IconComponent } from '@/components/ui/icons'
import {
  GiQuillInk, GiLinkedRings, GiWoodFrame, GiTreasureMap,
  GiEarthAmerica, GiNotebook,
} from '@/components/ui/icons'
import {
  useGlobalInspiration, useCampaignInspiration,
  useCreateInspiration, useUpdateInspiration, useDeleteInspiration,
  useSendToCampaign,
} from './useInspiration'
import type { InspirationItem } from './useInspiration'
import { useCampaigns } from '@/features/campaigns/useCampaigns'

interface Props {
  campaignId?: string
  isGlobal?: boolean
}

export function InspirationBoard({ campaignId, isGlobal }: Props) {
  const globalQuery = useGlobalInspiration()
  const campaignQuery = useCampaignInspiration(campaignId ?? '')
  const { data: campaigns } = useCampaigns()
  const createItem = useCreateInspiration()
  const updateItem = useUpdateInspiration()
  const deleteItem = useDeleteInspiration()
  const sendToCampaign = useSendToCampaign()
  const [showAdd, setShowAdd] = useState(false)

  const items = isGlobal ? globalQuery.data : campaignQuery.data
  const isLoading = isGlobal ? globalQuery.isLoading : campaignQuery.isLoading

  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<'text' | 'link' | 'image' | 'map'>('text')
  const [newTags, setNewTags] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createItem.mutateAsync({
      title: newTitle,
      content: newContent || undefined,
      type: newType,
      tags: newTags ? newTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      campaign_id: isGlobal ? undefined : campaignId,
    })
    setNewTitle('')
    setNewContent('')
    setNewTags('')
    setShowAdd(false)
  }

  const handleSendToCampaign = (item: InspirationItem, targetCampaignId: string) => {
    sendToCampaign.mutate({ id: item.id, campaignId: targetCampaignId })
  }

  if (isLoading) return <p className="text-text-muted text-sm py-4">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl flex items-center gap-2">{isGlobal ? <><GameIcon icon={GiEarthAmerica} /> Inspiration Inbox</> : <><GameIcon icon={GiNotebook} /> Scratchpad</>}</h2>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add Idea'}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-bg-base rounded-[--radius-lg] border border-border p-4 mb-4 space-y-3">
          <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Quick thought, link, or idea..." required autoFocus />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Details, notes, context..."
            rows={3}
            className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active transition-colors resize-none text-sm"
          />
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary font-medium">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as typeof newType)}
                className="px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body text-sm"
              >
                <option value="text">Text</option>
                <option value="link">Link</option>
                <option value="image">Image</option>
                <option value="map">Map</option>
              </select>
            </div>
            <Input label="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="npc, quest, location" className="flex-1" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={createItem.isPending || !newTitle.trim()}>
              {createItem.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {items && items.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-10 text-center">
          <div className="text-3xl mb-3">{isGlobal ? <GameIcon icon={GiEarthAmerica} size="lg" /> : <GameIcon icon={GiNotebook} size="lg" />}</div>
          <p className="text-text-secondary text-sm">
            {isGlobal
              ? 'Your creative inbox is empty. Drop ideas, links, images, and inspiration here.'
              : 'No scratchpad items yet. Add ideas specific to this campaign.'}
          </p>
        </div>
      )}

      {/* Masonry-style grid */}
      <StaggerList className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
        {items?.map((item) => (
          <StaggerItem key={item.id}>
            <InspirationCard
              item={item}
              isGlobal={isGlobal}
              campaigns={campaigns}
              onDelete={() => deleteItem.mutate({ id: item.id })}
              onSendToCampaign={(cid) => handleSendToCampaign(item, cid)}
              onUpdate={(updates) => updateItem.mutate({ id: item.id, ...updates })}
            />
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  )
}

const TYPE_ICONS: Record<string, IconComponent> = {
  text: GiQuillInk,
  link: GiLinkedRings,
  image: GiWoodFrame,
  map: GiTreasureMap,
}

function InspirationCard({ item, isGlobal, campaigns, onDelete, onSendToCampaign, onUpdate }: {
  item: InspirationItem
  isGlobal?: boolean
  campaigns?: { id: string; name: string }[]
  onDelete: () => void
  onSendToCampaign: (campaignId: string) => void
  onUpdate: (updates: { title?: string; content?: string }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editContent, setEditContent] = useState(item.content ?? '')
  const [showSend, setShowSend] = useState(false)

  const handleSave = () => {
    onUpdate({ title: editTitle, content: editContent || undefined })
    setEditing(false)
  }

  return (
    <div className="bg-bg-base rounded-[--radius-md] border border-border p-3 break-inside-avoid group">
      {editing ? (
        <div className="space-y-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-transparent text-text-heading font-medium outline-none border-b border-border-hover focus:border-primary text-sm"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full bg-bg-raised rounded-[--radius-sm] border border-border p-2 text-sm text-text-body resize-none focus:outline-none focus:border-border-active"
          />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 mb-1">
            <GameIcon icon={TYPE_ICONS[item.type] ?? GiQuillInk} size="xs" />
            <h4 className="text-sm text-text-heading font-medium flex-1">{item.title}</h4>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(true); setEditTitle(item.title); setEditContent(item.content ?? '') }} className="text-text-muted hover:text-text-body text-xs cursor-pointer">✎</button>
              <button onClick={onDelete} className="text-text-muted hover:text-danger text-xs cursor-pointer">✕</button>
            </div>
          </div>

          {item.content && (
            <p className="text-xs text-text-secondary mt-1 whitespace-pre-line">{item.content}</p>
          )}

          {item.media_url && item.type === 'image' && (
            <img src={item.media_url} alt={item.title} className="mt-2 rounded-[--radius-sm] max-w-full" />
          )}

          {item.media_url && item.type === 'link' && (
            <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-light hover:underline mt-1 block truncate">
              {item.media_url}
            </a>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-[--radius-sm] bg-bg-raised text-text-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Send to campaign (global inbox only) */}
          {isGlobal && campaigns && campaigns.length > 0 && (
            <div className="mt-2">
              {showSend ? (
                <div className="space-y-1">
                  {campaigns.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onSendToCampaign(c.id); setShowSend(false) }}
                      className="w-full text-left text-xs px-2 py-1 rounded-[--radius-sm] hover:bg-bg-raised text-text-secondary cursor-pointer"
                    >
                      → {c.name}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowSend(true)}
                  className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer"
                >
                  Send to campaign →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
