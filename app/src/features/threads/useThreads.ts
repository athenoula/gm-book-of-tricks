import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type PlotThread = {
  id: string
  campaign_id: string
  title: string
  status: 'open' | 'resolved'
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export function useThreads(campaignId: string) {
  return useQuery({
    queryKey: ['plot-threads', campaignId],
    queryFn: async (): Promise<PlotThread[]> => {
      const { data, error } = await supabase
        .from('plot_threads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      campaign_id: string
      title: string
      note?: string
      sort_order?: number
    }) => {
      const { data, error } = await supabase
        .from('plot_threads')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as PlotThread
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaign_id] })
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      title?: string
      status?: PlotThread['status']
      note?: string | null
    }) => {
      const { data, error } = await supabase
        .from('plot_threads')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlotThread
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaign_id] })
    },
  })
}

export function useDeleteThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('plot_threads')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plot-threads', data.campaignId] })
      useToastStore.getState().addToast('success', 'Thread deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}
