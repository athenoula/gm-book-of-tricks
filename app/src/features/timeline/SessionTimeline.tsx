import { useState, useMemo, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiBookshelf, GiScrollUnfurled, GiLinkedRings } from '@/components/ui/icons'
import { useScenes, useCreateScene, useReorderScenes } from './useScenes'
import { useTimelineBlocks, useAddTimelineBlock, useReorderTimelineBlocks, useAssignToGroup, useUnassignFromGroup } from './useTimelineBlocks'
import { useTimelineGroups, useCreateTimelineGroup, useReorderTimelineGroups } from './useTimelineGroups'
import { useCollapseAll } from './useCollapseAll'
import { SceneBlock } from './SceneBlock'
import { TimelineBlockCard } from './TimelineBlockCard'
import { TimelineGroup } from './TimelineGroup'
import { ContentDrawer } from './ContentDrawer'

interface Props {
  sessionId: string
  campaignId: string
}

type TimelineItem =
  | { kind: 'scene'; id: string; sort_order: number; data: ReturnType<typeof useScenes>['data'] extends (infer T)[] | undefined ? T : never }
  | { kind: 'block'; id: string; sort_order: number; data: ReturnType<typeof useTimelineBlocks>['data'] extends (infer T)[] | undefined ? T : never }
  | { kind: 'group'; id: string; sort_order: number; data: ReturnType<typeof useTimelineGroups>['data'] extends (infer T)[] | undefined ? T : never; children: ReturnType<typeof useTimelineBlocks>['data'] extends (infer T)[] | undefined ? T[] : never[] }

export function SessionTimeline({ sessionId, campaignId }: Props) {
  const { data: scenes, isLoading: loadingScenes } = useScenes(sessionId)
  const { data: blocks, isLoading: loadingBlocks } = useTimelineBlocks(sessionId)
  const { data: groups, isLoading: loadingGroups } = useTimelineGroups(sessionId)
  const createScene = useCreateScene()
  const reorderScenes = useReorderScenes()
  const addBlock = useAddTimelineBlock()
  const reorderBlocks = useReorderTimelineBlocks()
  const reorderGroups = useReorderTimelineGroups()
  const createGroup = useCreateTimelineGroup()
  const assignToGroup = useAssignToGroup()
  const unassignFromGroup = useUnassignFromGroup()
  const collapseAll = useCollapseAll()
  const [showLibrary, setShowLibrary] = useState(false)
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null)
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  const handlePin = (itemId: string) => {
    setPinnedItemId((prev) => (prev === itemId ? null : itemId))
  }

  const toggleExpand = (blockId: string) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) { next.delete(blockId) } else { next.add(blockId) }
      return next
    })
  }

  const toggleSelect = (blockId: string) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) { next.delete(blockId) } else { next.add(blockId) }
      return next
    })
  }

  // Merge scenes, ungrouped blocks, and groups into unified timeline
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []
    if (scenes) {
      for (const s of scenes) {
        items.push({ kind: 'scene', id: `scene-${s.id}`, sort_order: s.sort_order, data: s })
      }
    }
    if (blocks) {
      for (const b of blocks) {
        if (!b.group_id) {
          items.push({ kind: 'block', id: `block-${b.id}`, sort_order: b.sort_order, data: b })
        }
      }
    }
    if (groups && blocks) {
      for (const g of groups) {
        const children = blocks.filter(b => b.group_id === g.id).sort((a, b) => a.sort_order - b.sort_order)
        items.push({ kind: 'group', id: `group-${g.id}`, sort_order: g.sort_order, data: g, children })
      }
    }
    items.sort((a, b) => a.sort_order - b.sort_order)
    return items
  }, [scenes, blocks, groups])

  const nextSortOrder = timeline.length > 0
    ? Math.max(...timeline.map((t) => t.sort_order)) + 1
    : 0

  const handleAddScene = () => {
    createScene.mutate({ session_id: sessionId, campaign_id: campaignId, sort_order: nextSortOrder })
  }

  const handleAddToTimeline = (item: {
    block_type: string; source_id: string; title: string; content_snapshot: Record<string, unknown>
  }) => {
    addBlock.mutate({
      session_id: sessionId, campaign_id: campaignId,
      block_type: item.block_type as 'monster' | 'npc' | 'spell' | 'location' | 'battle' | 'note' | 'scene',
      source_id: item.source_id || undefined,
      title: item.title, content_snapshot: item.content_snapshot, sort_order: nextSortOrder,
    })
  }

  const handleCreateGroup = () => {
    const name = window.prompt('Group name:')
    if (!name) return
    const blockIds = Array.from(selectedBlockIds)
    const selectedItems = timeline.filter(t => t.kind === 'block' && selectedBlockIds.has(t.data.id))
    const groupSortOrder = selectedItems.length > 0
      ? Math.min(...selectedItems.map(t => t.sort_order))
      : nextSortOrder

    createGroup.mutate({
      session_id: sessionId, campaign_id: campaignId,
      name, sort_order: groupSortOrder, block_ids: blockIds,
    })
    setSelectedBlockIds(new Set())
    setSelectMode(false)
  }

  const handleCollapseAll = () => {
    collapseAll.mutate({ sessionId, collapsed: true })
  }

  const handleExpandAll = () => {
    collapseAll.mutate({ sessionId, collapsed: false })
    setExpandedBlockIds(new Set())
  }

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const sourceDroppableId = result.source.droppableId
    const destDroppableId = result.destination.droppableId

    // Case 1: Reordering within the top-level timeline
    if (sourceDroppableId === 'timeline' && destDroppableId === 'timeline') {
      const items = [...timeline]
      const [moved] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, moved)

      const sceneUpdates: { id: string; sort_order: number }[] = []
      const blockUpdates: { id: string; sort_order: number }[] = []
      const groupUpdates: { id: string; sort_order: number }[] = []

      items.forEach((item, index) => {
        if (item.kind === 'scene') sceneUpdates.push({ id: item.data.id, sort_order: index })
        else if (item.kind === 'block') blockUpdates.push({ id: item.data.id, sort_order: index })
        else if (item.kind === 'group') groupUpdates.push({ id: item.data.id, sort_order: index })
      })

      if (sceneUpdates.length > 0) reorderScenes.mutate({ scenes: sceneUpdates, sessionId })
      if (blockUpdates.length > 0) reorderBlocks.mutate({ blocks: blockUpdates, sessionId })
      if (groupUpdates.length > 0) reorderGroups.mutate({ groups: groupUpdates, sessionId })
    }

    // Case 2: Reordering within a group
    if (sourceDroppableId === destDroppableId && sourceDroppableId.startsWith('group-')) {
      const groupId = sourceDroppableId.replace('group-', '')
      const groupItem = timeline.find(t => t.kind === 'group' && t.data.id === groupId)
      if (!groupItem || groupItem.kind !== 'group') return

      const children = [...groupItem.children]
      const [moved] = children.splice(result.source.index, 1)
      children.splice(result.destination.index, 0, moved)

      const blockUpdates = children.map((b, i) => ({ id: b.id, sort_order: i }))
      reorderBlocks.mutate({ blocks: blockUpdates, sessionId })
    }

    // Case 3: Moving a block out of a group into top-level
    if (sourceDroppableId.startsWith('group-') && destDroppableId === 'timeline') {
      const blockId = result.draggableId.replace('block-', '')
      unassignFromGroup.mutate({
        blockIds: [blockId], sessionId,
        baseSortOrder: result.destination.index,
      })
    }

    // Case 4: Moving a block from top-level into a group
    if (sourceDroppableId === 'timeline' && destDroppableId.startsWith('group-')) {
      const blockId = result.draggableId.replace('block-', '')
      const groupId = destDroppableId.replace('group-', '')
      assignToGroup.mutate({
        blockIds: [blockId], groupId, sessionId,
      })
    }
  }, [timeline, sessionId, reorderScenes, reorderBlocks, reorderGroups, assignToGroup, unassignFromGroup])

  const isLoading = loadingScenes || loadingBlocks || loadingGroups

  if (isLoading) {
    return <p className="text-text-muted text-sm py-4">Loading timeline...</p>
  }

  return (
    <div data-tutorial="session-timeline">
      {/* Actions */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2 max-md:hidden">
          <Button size="sm" variant="ghost" onClick={handleCollapseAll} title="Collapse all">
            ▸▸
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExpandAll} title="Expand all">
            ▾▾
          </Button>
          <Button
            size="sm"
            variant={selectMode ? 'primary' : 'secondary'}
            onClick={() => { setSelectMode(!selectMode); setSelectedBlockIds(new Set()) }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
          <Button
            size="sm"
            variant={showLibrary ? 'primary' : 'secondary'}
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <GameIcon icon={GiBookshelf} size="sm" /> {showLibrary ? 'Hide' : 'Library'}
          </Button>
          <Button size="sm" onClick={handleAddScene} disabled={createScene.isPending}>
            + Scene
          </Button>
        </div>
      </div>

      {/* Mobile action buttons */}
      <div className="flex gap-2 mb-4 md:hidden flex-wrap">
        <Button size="sm" variant="ghost" onClick={handleCollapseAll}>▸▸</Button>
        <Button size="sm" variant="ghost" onClick={handleExpandAll}>▾▾</Button>
        <Button size="sm" variant={selectMode ? 'primary' : 'secondary'} onClick={() => { setSelectMode(!selectMode); setSelectedBlockIds(new Set()) }}>
          {selectMode ? 'Cancel' : 'Select'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowLibrary(!showLibrary)} className="flex-1">
          <GameIcon icon={GiBookshelf} size="sm" /> Library
        </Button>
        <Button size="sm" onClick={handleAddScene} disabled={createScene.isPending} className="flex-1">
          + Scene
        </Button>
      </div>

      {/* Multi-select floating toolbar */}
      {selectMode && selectedBlockIds.size >= 2 && (
        <div className="sticky top-2 z-30 flex justify-center mb-4">
          <div className="bg-bg-surface border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
            <span className="text-sm text-text-secondary">{selectedBlockIds.size} selected</span>
            <Button size="sm" onClick={handleCreateGroup}>
              <GameIcon icon={GiLinkedRings} size="xs" /> Group
            </Button>
          </div>
        </div>
      )}

      {/* Layout: timeline + optional library sidebar */}
      <div className={showLibrary ? 'grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4' : ''}>
        <div>
          {timeline.length === 0 ? (
            <div className="bg-bg-base rounded-[--radius-lg] border border-border p-10 text-center">
              <div className="text-3xl mb-3"><GameIcon icon={GiScrollUnfurled} size="3xl" /></div>
              <h3 className="text-lg mb-2">Empty Timeline</h3>
              <p className="text-text-secondary text-sm mb-4">Add scenes and content to build your session plan.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleAddScene}>Add Scene</Button>
                <Button variant="secondary" onClick={() => setShowLibrary(true)}>Open Library</Button>
              </div>
            </div>
          ) : (
            <>
            {/* Pinned item */}
            {pinnedItemId && (() => {
              const pinned = timeline.find((item) => item.data.id === pinnedItemId)
              if (!pinned) return null
              return (
                <div className="mb-3 relative">
                  <div className="absolute -top-2 left-3 bg-primary text-text-inverse text-[10px] px-2 py-0.5 rounded-full font-medium z-10">Pinned</div>
                  {pinned.kind === 'scene' ? (
                    <SceneBlock scene={pinned.data} dragHandleProps={undefined} isPinned onPin={() => handlePin(pinned.data.id)} />
                  ) : pinned.kind === 'block' ? (
                    <TimelineBlockCard block={pinned.data} dragHandleProps={undefined} isPinned onPin={() => handlePin(pinned.data.id)} isExpanded={expandedBlockIds.has(pinned.data.id)} onToggleExpand={() => toggleExpand(pinned.data.id)} />
                  ) : null}
                </div>
              )
            })()}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="timeline" type="TIMELINE">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {timeline.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            {item.kind === 'scene' ? (
                              <SceneBlock
                                scene={item.data}
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                onPin={() => handlePin(item.data.id)}
                                isPinned={pinnedItemId === item.data.id}
                                index={index}
                              />
                            ) : item.kind === 'group' ? (
                              <TimelineGroup
                                group={item.data}
                                blocks={item.children}
                                dragHandleProps={provided.dragHandleProps ?? undefined}
                                expandedBlockIds={expandedBlockIds}
                                onToggleExpand={toggleExpand}
                                onPin={handlePin}
                                pinnedItemId={pinnedItemId}
                              />
                            ) : (
                              <div className="flex gap-2 items-start">
                                {selectMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedBlockIds.has(item.data.id)}
                                    onChange={() => toggleSelect(item.data.id)}
                                    className="mt-4 w-4 h-4 accent-primary cursor-pointer shrink-0"
                                  />
                                )}
                                <div className="flex-1">
                                  <TimelineBlockCard
                                    block={item.data}
                                    dragHandleProps={provided.dragHandleProps ?? undefined}
                                    onPin={() => handlePin(item.data.id)}
                                    isPinned={pinnedItemId === item.data.id}
                                    isExpanded={expandedBlockIds.has(item.data.id)}
                                    onToggleExpand={() => toggleExpand(item.data.id)}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            </>
          )}
        </div>

        {/* Library sidebar */}
        {showLibrary && (
          <div className="max-md:mt-4">
            <ContentDrawer
              campaignId={campaignId}
              sessionId={sessionId}
              onAddToTimeline={handleAddToTimeline}
              onClose={() => setShowLibrary(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
