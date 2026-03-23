import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type CharacterInventoryItem = {
  id: string
  item_id: string
  character_id: string
  campaign_id: string
  quantity: number
  notes: string | null
  equipped: boolean
}

export function useCharacterInventory(characterId: string) {
  return useQuery({
    queryKey: ['character-inventory', characterId],
    queryFn: async (): Promise<CharacterInventoryItem[]> => {
      const { data, error } = await supabase
        .from('character_inventory')
        .select('*')
        .eq('character_id', characterId)
        .order('equipped', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!characterId,
  })
}

export function useAddToInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      item_id: string
      character_id: string
      campaign_id: string
      quantity?: number
      notes?: string
      equipped?: boolean
    }) => {
      const { data, error } = await supabase
        .from('character_inventory')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as CharacterInventoryItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-inventory', variables.character_id] })
      useToastStore.getState().addToast('success', 'Item added to inventory')
    },
    onError: (error: Error) => {
      if (error.message?.includes('duplicate')) {
        useToastStore.getState().addToast('error', 'Item already in inventory')
      } else {
        useToastStore.getState().addToast('error', error.message || 'Something went wrong')
      }
    },
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      character_id,
      ...updates
    }: {
      id: string
      character_id: string
      quantity?: number
      notes?: string
      equipped?: boolean
    }) => {
      const { data, error } = await supabase
        .from('character_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as CharacterInventoryItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-inventory', variables.character_id] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useRemoveFromInventory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, character_id }: { id: string; character_id: string }) => {
      const { error } = await supabase.from('character_inventory').delete().eq('id', id)
      if (error) throw error
      return { id, character_id }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-inventory', variables.character_id] })
      useToastStore.getState().addToast('success', 'Item removed from inventory')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
