import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type TimelineGroup = {
  id: string
  session_id: string
  campaign_id: string
  name: string
  sort_order: number
  is_collapsed: boolean
  created_at: string
  updated_at: string
}

export function useTimelineGroups(sessionId: string) {
  return useQuery({
    queryKey: ['timeline-groups', sessionId],
    queryFn: async (): Promise<TimelineGroup[]> => {
      const { data, error } = await supabase
        .from('timeline_groups')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTimelineGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      session_id: string
      campaign_id: string
      name: string
      sort_order: number
      block_ids: string[]
    }) => {
      const { block_ids, ...groupInput } = input
      const { data: group, error: groupErr } = await supabase
        .from('timeline_groups')
        .insert(groupInput)
        .select()
        .single()
      if (groupErr) throw groupErr

      if (block_ids.length > 0) {
        await Promise.all(
          block_ids.map((id, i) =>
            supabase.from('timeline_blocks').update({ group_id: group.id, sort_order: i }).eq('id', id)
          )
        )
      }

      return group as TimelineGroup
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-groups', data.session_id] })
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.session_id] })
      useToastStore.getState().addToast('success', 'Group created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to create group')
    },
  })
}

export function useUpdateTimelineGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; is_collapsed?: boolean; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('timeline_groups')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as TimelineGroup
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-groups', data.session_id] })
    },
  })
}

export function useDeleteTimelineGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase.from('timeline_groups').delete().eq('id', id)
      if (error) throw error
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-groups', data.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.sessionId] })
      useToastStore.getState().addToast('success', 'Group removed')
    },
  })
}

export function useReorderTimelineGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groups, sessionId }: { groups: { id: string; sort_order: number }[]; sessionId: string }) => {
      await Promise.all(
        groups.map((g) =>
          supabase.from('timeline_groups').update({ sort_order: g.sort_order }).eq('id', g.id)
        )
      )
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-groups', data.sessionId] })
    },
  })
}
