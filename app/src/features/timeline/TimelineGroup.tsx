import { useState } from 'react'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiLinkedRings } from '@/components/ui/icons'
import { useUpdateTimelineGroup, useDeleteTimelineGroup } from './useTimelineGroups'
import { useUnassignFromGroup } from './useTimelineBlocks'
import { TimelineBlockCard } from './TimelineBlockCard'
import type { TimelineBlock } from './useTimelineBlocks'
import type { TimelineGroup as TimelineGroupType } from './useTimelineGroups'

interface Props {
  group: TimelineGroupType
  blocks: TimelineBlock[]
  dragHandleProps?: Record<string, unknown>
  expandedBlockIds: Set<string>
  onToggleExpand: (blockId: string) => void
  onPin: (itemId: string) => void
  pinnedItemId: string | null
}

export function TimelineGroup({ group, blocks, dragHandleProps, expandedBlockIds, onToggleExpand, onPin, pinnedItemId }: Props) {
  const updateGroup = useUpdateTimelineGroup()
  const deleteGroup = useDeleteTimelineGroup()
  const unassignFromGroup = useUnassignFromGroup()
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(group.name)

  const handleToggleCollapse = () => {
    updateGroup.mutate({ id: group.id, is_collapsed: !group.is_collapsed })
  }

  const handleSaveName = () => {
    updateGroup.mutate({ id: group.id, name: editName })
    setEditingName(false)
  }

  const handleUngroup = () => {
    const blockIds = blocks.map(b => b.id)
    unassignFromGroup.mutate({
      blockIds,
      sessionId: group.session_id,
      baseSortOrder: group.sort_order,
    })
    deleteGroup.mutate({ id: group.id, sessionId: group.session_id })
  }

  const handleDelete = () => {
    if (window.confirm(`Delete group "${group.name}"? Blocks will return to the timeline.`)) {
      handleUngroup()
    }
  }

  return (
    <div className="bg-bg-base rounded-[--radius-lg] border border-l-3 border-l-amber-500 border-border">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-bg-raised rounded-t-[--radius-lg]">
        <span {...dragHandleProps} className="text-text-muted cursor-grab active:cursor-grabbing select-none">
          ⠿
        </span>

        <GameIcon icon={GiLinkedRings} size="sm" className="text-amber-500" />

        {editingName ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            className="flex-1 bg-transparent text-text-heading font-medium outline-none border-b border-border-hover focus:border-primary text-sm"
            autoFocus
          />
        ) : (
          <button
            onClick={handleToggleCollapse}
            className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
          >
            <span className="text-sm font-medium text-text-heading truncate">
              {group.name}
            </span>
            {group.is_collapsed && (
              <span className="text-[10px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded-full">
                {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
              </span>
            )}
            <span className="text-xs text-text-muted">
              {group.is_collapsed ? '▸' : '▾'}
            </span>
          </button>
        )}

        <span className="text-[10px] text-text-muted bg-bg-raised px-1.5 py-0.5 rounded-[--radius-sm]">
          Group
        </span>

        {!editingName && (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setEditName(group.name); setEditingName(true) }} title="Rename">
              ✎
            </Button>
            <Button size="sm" variant="ghost" onClick={handleUngroup} title="Ungroup">
              ⊘
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} className="text-danger hover:text-danger" title="Delete group">
              ✕
            </Button>
          </>
        )}
      </div>

      {/* Group children */}
      {!group.is_collapsed && (
        <Droppable droppableId={`group-${group.id}`} type="BLOCK">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="px-3 py-2 space-y-2 min-h-[40px]"
            >
              {blocks.map((block, index) => (
                <Draggable
                  key={`block-${block.id}`}
                  draggableId={`block-${block.id}`}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <TimelineBlockCard
                        block={block}
                        dragHandleProps={provided.dragHandleProps ?? undefined}
                        onPin={() => onPin(block.id)}
                        isPinned={pinnedItemId === block.id}
                        isExpanded={expandedBlockIds.has(block.id)}
                        onToggleExpand={() => onToggleExpand(block.id)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}
