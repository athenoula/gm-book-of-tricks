import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCollapseAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, collapsed }: { sessionId: string; collapsed: boolean }) => {
      await Promise.all([
        supabase.from('timeline_blocks').update({ is_collapsed: collapsed }).eq('session_id', sessionId),
        supabase.from('timeline_groups').update({ is_collapsed: collapsed }).eq('session_id', sessionId),
        supabase.from('scenes').update({ is_collapsed: collapsed }).eq('session_id', sessionId),
      ])
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline-blocks', data.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['timeline-groups', data.sessionId] })
      queryClient.invalidateQueries({ queryKey: ['scenes', data.sessionId] })
    },
  })
}
