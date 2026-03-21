import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type BlockType = 'scene' | 'note' | 'monster' | 'npc' | 'spell' | 'location' | 'battle'

export type TimelineBlock = {
  id: string
  session_id: string
  campaign_id: string
  block_type: BlockType
  source_id: string | null
  title: string
  content_snapshot: Record<string, unknown>
  sort_order: number
  is_collapsed: boolean
  created_at: string
  updated_at: string
}

export function useTimelineBlocks(sessionId: string) {
  return useQuery({
    queryKey: ['timeline-blocks', sessionId],
    queryFn: async (): Promise<TimelineBlock[]> => {
      const { data, error } = await supabase
        .from('timeline_blocks')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useAddTimelineBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      session_id: string
      campaign_id: string
      block_type: BlockType
      source_id?: string
      title: string
      content_snapshot: Record<string, unknown>
      sort_order: number
    }) => {
      const { data, error } = await supabase
        .from('timeline_blocks')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as TimelineBlock
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.session_id] })
      useToastStore.getState().addToast('success', 'Added to timeline')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to add')
    },
  })
}

export function useUpdateTimelineBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; is_collapsed?: boolean; sort_order?: number; title?: string }) => {
      const { data, error } = await supabase
        .from('timeline_blocks')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as TimelineBlock
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.session_id] })
    },
  })
}

export function useRemoveTimelineBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase
        .from('timeline_blocks')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.sessionId] })
      useToastStore.getState().addToast('success', 'Removed from timeline')
    },
  })
}

export function useUpdateTimelineBlockSnapshot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ blockId, snapshot }: { blockId: string; snapshot: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('timeline_blocks')
        .update({ content_snapshot: snapshot })
        .eq('id', blockId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks'] })
    },
  })
}

export function useReorderTimelineBlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ blocks, sessionId }: { blocks: { id: string; sort_order: number }[]; sessionId: string }) => {
      await Promise.all(
        blocks.map((b) =>
          supabase.from('timeline_blocks').update({ sort_order: b.sort_order }).eq('id', b.id)
        )
      )
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.sessionId] })
    },
  })
}
