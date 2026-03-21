import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { Combatant } from './useCombatants'

export type CombatantSnapshot = {
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  armor_class: number
  is_player: boolean
  conditions: string[]
}

export type Battle = {
  id: string
  campaign_id: string
  session_id: string | null
  name: string
  type: 'template' | 'save_state'
  round: number
  active_index: number
  in_combat: boolean
  combatant_data: CombatantSnapshot[]
  notes: string | null
  created_at: string
  updated_at: string
}

export function useBattles(campaignId: string) {
  return useQuery({
    queryKey: ['battles', campaignId],
    queryFn: async (): Promise<Battle[]> => {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveBattle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      sessionId,
      name,
      type,
      combatants,
      round,
      activeIndex,
      inCombat,
    }: {
      campaignId: string
      sessionId?: string
      name: string
      type: 'template' | 'save_state'
      combatants: Combatant[]
      round: number
      activeIndex: number
      inCombat: boolean
    }) => {
      const combatant_data: CombatantSnapshot[] = combatants.map((c) => ({
        name: c.name,
        initiative: type === 'template' ? 0 : c.initiative,
        hp_current: type === 'template' ? c.hp_max : c.hp_current,
        hp_max: c.hp_max,
        armor_class: c.armor_class,
        is_player: c.is_player,
        conditions: type === 'template' ? [] : c.conditions,
      }))

      const { data, error } = await supabase
        .from('battles')
        .insert({
          campaign_id: campaignId,
          session_id: sessionId,
          name,
          type,
          round: type === 'template' ? 0 : round,
          active_index: type === 'template' ? 0 : activeIndex,
          in_combat: type === 'template' ? false : inCombat,
          combatant_data,
        })
        .select()
        .single()

      if (error) throw error
      return data as Battle
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['battles', data.campaign_id] })
      useToastStore.getState().addToast('success', `Battle ${data.type === 'template' ? 'template' : 'state'} saved`)
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to save battle')
    },
  })
}

export function useDeleteBattle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('battles').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['battles', data.campaignId] })
      useToastStore.getState().addToast('success', 'Battle deleted')
    },
  })
}
