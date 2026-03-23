import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type PartyTreasureItem = {
  id: string
  item_id: string | null
  campaign_id: string
  name: string
  quantity: number
  notes: string | null
  created_at: string
}

export function usePartyTreasure(campaignId: string) {
  return useQuery({
    queryKey: ['party-treasure', campaignId],
    queryFn: async (): Promise<PartyTreasureItem[]> => {
      const { data, error } = await supabase
        .from('party_treasure')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useAddToPartyTreasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      item_id?: string
      quantity?: number
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('party_treasure')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as PartyTreasureItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['party-treasure', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Item added to party treasure')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdatePartyTreasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      campaign_id,
      ...updates
    }: {
      id: string
      campaign_id: string
      name?: string
      quantity?: number
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('party_treasure')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PartyTreasureItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['party-treasure', variables.campaign_id] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useRemoveFromPartyTreasure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaign_id }: { id: string; campaign_id: string }) => {
      const { error } = await supabase.from('party_treasure').delete().eq('id', id)
      if (error) throw error
      return { id, campaign_id }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['party-treasure', variables.campaign_id] })
      useToastStore.getState().addToast('success', 'Item removed from party treasure')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
