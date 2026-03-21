import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type LootTable = {
  id: string
  campaign_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type LootItem = {
  id: string
  table_id: string
  d20_min: number
  d20_max: number
  name: string
  description: string | null
  quantity: string | null
  rarity: string | null
  created_at: string
}

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#3b82f6',
  'very rare': '#a855f7',
  legendary: '#f59e0b',
  artifact: '#ef4444',
}

export { RARITY_COLORS }

export function useLootTables(campaignId: string) {
  return useQuery({
    queryKey: ['loot-tables', campaignId],
    queryFn: async (): Promise<LootTable[]> => {
      const { data, error } = await supabase
        .from('loot_tables')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useLootItems(tableId: string) {
  return useQuery({
    queryKey: ['loot-items', tableId],
    queryFn: async (): Promise<LootItem[]> => {
      const { data, error } = await supabase
        .from('loot_table_items')
        .select('*')
        .eq('table_id', tableId)
        .order('d20_min')
      if (error) throw error
      return data
    },
  })
}

export function useCreateLootTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { campaign_id: string; name: string; description?: string }) => {
      const { data, error } = await supabase.from('loot_tables').insert(input).select().single()
      if (error) throw error
      return data as LootTable
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loot-tables', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Loot table created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteLootTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('loot_tables').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loot-tables', data.campaignId] })
      useToastStore.getState().addToast('success', 'Loot table deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useCreateLootItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { table_id: string; d20_min: number; d20_max: number; name: string; description?: string; quantity?: string; rarity?: string }) => {
      const { data, error } = await supabase.from('loot_table_items').insert(input).select().single()
      if (error) throw error
      return data as LootItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loot-items', data.table_id] })
      useToastStore.getState().addToast('success', 'Item added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteLootItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tableId }: { id: string; tableId: string }) => {
      const { error } = await supabase.from('loot_table_items').delete().eq('id', id)
      if (error) throw error
      return { tableId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loot-items', data.tableId] })
    },
  })
}
