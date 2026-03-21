import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import type { PlayerCharacter, NPC } from '@/lib/types'

// ---- Player Characters ----

export function usePCs(campaignId: string) {
  return useQuery({
    queryKey: ['pcs', campaignId],
    queryFn: async (): Promise<PlayerCharacter[]> => {
      const { data, error } = await supabase
        .from('player_characters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreatePC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<PlayerCharacter> & { campaign_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('player_characters')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as PlayerCharacter
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pcs', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Character created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdatePC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<PlayerCharacter> & { id: string }) => {
      const { data, error } = await supabase
        .from('player_characters')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as PlayerCharacter
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pcs', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Character updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeletePC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('player_characters').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pcs', data.campaignId] })
      useToastStore.getState().addToast('success', 'Character deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

// ---- NPCs ----

export function useNPCs(campaignId: string) {
  return useQuery({
    queryKey: ['npcs', campaignId],
    queryFn: async (): Promise<NPC[]> => {
      const { data, error } = await supabase
        .from('npcs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateNPC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<NPC> & { campaign_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('npcs')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as NPC
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaign_id] })
      useToastStore.getState().addToast('success', 'NPC created')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateNPC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<NPC> & { id: string }) => {
      const { data, error } = await supabase
        .from('npcs')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as NPC
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaign_id] })
      useToastStore.getState().addToast('success', 'NPC updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteNPC() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('npcs').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaignId] })
      useToastStore.getState().addToast('success', 'NPC deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdatePortrait() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ table, id, campaignId, url }: { table: 'player_characters' | 'npcs'; id: string; campaignId: string; url: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ portrait_url: url })
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pcs', data.campaignId] })
      queryClient.invalidateQueries({ queryKey: ['npcs', data.campaignId] })
      useToastStore.getState().addToast('success', 'Portrait updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to update portrait')
    },
  })
}
