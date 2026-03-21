import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { Session } from '@/lib/types'

export function useSessions(campaignId: string) {
  return useQuery({
    queryKey: ['sessions', campaignId],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('session_number', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: async (): Promise<Session> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      session_number?: number
      scheduled_at?: string
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as Session
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Session created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      name?: string
      status?: Session['status']
      notes?: string
      scheduled_at?: string
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Session
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.campaign_id] })
      queryClient.invalidateQueries({ queryKey: ['session', data.id] })
      useToastStore.getState().addToast('success', 'Session updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.campaignId] })
      useToastStore.getState().addToast('success', 'Session deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
