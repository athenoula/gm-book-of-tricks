import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Scene = {
  id: string
  session_id: string
  campaign_id: string
  name: string
  content: string
  sort_order: number
  status: 'upcoming' | 'active' | 'done'
  created_at: string
  updated_at: string
}

export function useScenes(sessionId: string) {
  return useQuery({
    queryKey: ['scenes', sessionId],
    queryFn: async (): Promise<Scene[]> => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateScene() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { session_id: string; campaign_id: string; name?: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('scenes')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Scene
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', data.session_id] })
      useToastStore.getState().addToast('success', 'Scene added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateScene() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; content?: string; status?: Scene['status']; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('scenes')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Scene
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', data.session_id] })
    },
  })
}

export function useDeleteScene() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId: string }) => {
      const { error } = await supabase.from('scenes').delete().eq('id', id)
      if (error) throw error
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', data.sessionId] })
      useToastStore.getState().addToast('success', 'Scene deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useReorderScenes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ scenes, sessionId }: { scenes: { id: string; sort_order: number }[]; sessionId: string }) => {
      const updates = scenes.map((s) =>
        supabase.from('scenes').update({ sort_order: s.sort_order }).eq('id', s.id)
      )
      await Promise.all(updates)
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', data.sessionId] })
    },
  })
}
