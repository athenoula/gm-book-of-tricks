import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type EncounterTable = {
  id: string
  campaign_id: string
  name: string
  environment: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type EncounterRow = {
  id: string
  table_id: string
  d20_min: number
  d20_max: number
  name: string
  description: string | null
  monster_ids: string[]
  created_at: string
}

export function useEncounterTables(campaignId: string) {
  return useQuery({
    queryKey: ['encounter-tables', campaignId],
    queryFn: async (): Promise<EncounterTable[]> => {
      const { data, error } = await supabase
        .from('encounter_tables')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useEncounterRows(tableId: string) {
  return useQuery({
    queryKey: ['encounter-rows', tableId],
    queryFn: async (): Promise<EncounterRow[]> => {
      const { data, error } = await supabase
        .from('encounter_table_rows')
        .select('*')
        .eq('table_id', tableId)
        .order('d20_min')
      if (error) throw error
      return data
    },
  })
}

export function useCreateEncounterTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { campaign_id: string; name: string; environment?: string; description?: string }) => {
      const { data, error } = await supabase.from('encounter_tables').insert(input).select().single()
      if (error) throw error
      return data as EncounterTable
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-tables', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Encounter table created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteEncounterTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('encounter_tables').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-tables', data.campaignId] })
      useToastStore.getState().addToast('success', 'Encounter table deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useCreateEncounterRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { table_id: string; d20_min: number; d20_max: number; name: string; description?: string }) => {
      const { data, error } = await supabase.from('encounter_table_rows').insert(input).select().single()
      if (error) throw error
      return data as EncounterRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-rows', data.table_id] })
      useToastStore.getState().addToast('success', 'Encounter added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteEncounterRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tableId }: { id: string; tableId: string }) => {
      const { error } = await supabase.from('encounter_table_rows').delete().eq('id', id)
      if (error) throw error
      return { tableId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['encounter-rows', data.tableId] })
    },
  })
}
