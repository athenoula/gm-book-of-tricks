import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Ability = {
  id: string
  campaign_id: string
  name: string
  description: string
  usage_type: 'action' | 'bonus_action' | 'reaction' | 'passive' | 'other'
  source: 'srd' | 'homebrew'
  srd_slug: string | null
  ability_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type CharacterAbility = {
  id: string
  ability_id: string
  character_id: string
  campaign_id: string
  notes: string
}

export function useAbilities(campaignId: string) {
  return useQuery({
    queryKey: ['abilities', campaignId],
    queryFn: async (): Promise<Ability[]> => {
      const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateAbility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      description?: string
      usage_type?: Ability['usage_type']
      source?: Ability['source']
      srd_slug?: string
      ability_data?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('abilities')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Ability
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['abilities', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Ability added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useAssignAbilityToCharacter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      ability_id: string
      character_id: string
      campaign_id: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('character_abilities')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as CharacterAbility
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-abilities', variables.character_id] })
      useToastStore.getState().addToast('success', 'Ability assigned to character')
    },
    onError: (error: Error) => {
      if (error.message?.includes('duplicate')) {
        useToastStore.getState().addToast('error', 'Character already has this ability')
      } else {
        useToastStore.getState().addToast('error', error.message || 'Something went wrong')
      }
    },
  })
}

export function useCharacterAbilities(characterId: string) {
  return useQuery({
    queryKey: ['character-abilities', characterId],
    queryFn: async (): Promise<CharacterAbility[]> => {
      const { data, error } = await supabase
        .from('character_abilities')
        .select('*')
        .eq('character_id', characterId)
      if (error) throw error
      return data
    },
    enabled: !!characterId,
  })
}
