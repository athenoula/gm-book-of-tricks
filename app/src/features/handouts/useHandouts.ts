import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { Handout, HandoutTemplate, HandoutSeal } from '@/lib/types'

export function useHandouts(campaignId: string) {
  return useQuery({
    queryKey: ['handouts', campaignId],
    queryFn: async (): Promise<Handout[]> => {
      const { data, error } = await supabase
        .from('handouts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      name: string
      template: HandoutTemplate
      content?: Record<string, unknown>
      style?: Record<string, unknown>
      seal?: HandoutSeal | null
      image_url?: string | null
    }) => {
      const { data, error } = await supabase
        .from('handouts')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Handout
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Handout created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      name?: string
      template?: HandoutTemplate
      content?: Record<string, unknown>
      style?: Record<string, unknown>
      seal?: HandoutSeal | null
      image_url?: string | null
    }) => {
      const { data, error } = await supabase
        .from('handouts')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Handout
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Handout saved')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteHandout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('handouts').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handouts', data.campaignId] })
      useToastStore.getState().addToast('success', 'Handout deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
