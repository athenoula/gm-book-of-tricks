import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Combatant = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
  source_type: 'pc' | 'npc' | 'monster' | null
  source_id: string | null
  source_snapshot: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useCombatants(campaignId: string, sessionId?: string) {
  const queryClient = useQueryClient()
  const queryKey = ['combatants', campaignId, sessionId ?? 'all']

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Combatant[]> => {
      let q = supabase
        .from('combatants')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('initiative', { ascending: false })
        .order('name', { ascending: true })

      if (sessionId) {
        q = q.eq('session_id', sessionId)
      }

      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`combatants-${campaignId}-${sessionId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combatants',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, sessionId, queryClient, queryKey])

  return query
}

export function useAddCombatant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      session_id?: string
      name: string
      initiative: number
      hp_current: number
      hp_max: number
      armor_class: number
      is_player: boolean
      source_type?: 'pc' | 'npc' | 'monster'
      source_snapshot?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('combatants')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as Combatant
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combatants', data.campaign_id] })
    },
  })
}

export function useUpdateCombatant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      initiative?: number
      hp_current?: number
      conditions?: string[]
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('combatants')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Combatant
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combatants', data.campaign_id] })
    },
  })
}

export function useRemoveCombatant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('combatants')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combatants', data.campaignId] })
      useToastStore.getState().addToast('success', 'Combatant removed')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useClearCombatants() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, sessionId }: { campaignId: string; sessionId?: string }) => {
      let q = supabase
        .from('combatants')
        .delete()
        .eq('campaign_id', campaignId)

      if (sessionId) {
        q = q.eq('session_id', sessionId)
      }

      const { error } = await q
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combatants', data.campaignId] })
      useToastStore.getState().addToast('success', 'Combat cleared')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
