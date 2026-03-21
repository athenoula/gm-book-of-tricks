import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type InspirationItem = {
  id: string
  user_id: string
  campaign_id: string | null
  title: string
  content: string | null
  type: 'text' | 'image' | 'link' | 'map'
  tags: string[]
  media_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export function useGlobalInspiration() {
  return useQuery({
    queryKey: ['inspiration', 'global'],
    queryFn: async (): Promise<InspirationItem[]> => {
      const { data, error } = await supabase
        .from('inspiration_items')
        .select('*')
        .is('campaign_id', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCampaignInspiration(campaignId: string) {
  return useQuery({
    queryKey: ['inspiration', campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<InspirationItem[]> => {
      const { data, error } = await supabase
        .from('inspiration_items')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateInspiration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      content?: string
      type?: 'text' | 'image' | 'link' | 'map'
      tags?: string[]
      media_url?: string
      campaign_id?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('inspiration_items')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as InspirationItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspiration', data.campaign_id ?? 'global'] })
      useToastStore.getState().addToast('success', 'Idea saved')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateInspiration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; title?: string; content?: string; tags?: string[]; campaign_id?: string | null }) => {
      const { data, error } = await supabase
        .from('inspiration_items')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as InspirationItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspiration'] })
    },
  })
}

export function useDeleteInspiration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('inspiration_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspiration'] })
      useToastStore.getState().addToast('success', 'Item removed')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useSendToCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { data, error } = await supabase
        .from('inspiration_items')
        .update({ campaign_id: campaignId })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as InspirationItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspiration'] })
      useToastStore.getState().addToast('success', 'Sent to campaign')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
