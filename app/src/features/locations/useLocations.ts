import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export type Location = {
  id: string
  campaign_id: string
  name: string
  description: string | null
  type: string | null
  parent_location_id: string | null
  map_url: string | null
  image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type LocationNPC = {
  id: string
  location_id: string
  npc_id: string
  role: string | null
  created_at: string
}

export function useLocations(campaignId: string) {
  return useQuery({
    queryKey: ['locations', campaignId],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useLocationNPCs(locationId: string) {
  return useQuery({
    queryKey: ['location-npcs', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_npcs')
        .select('*, npc:npcs(id, name, race, occupation)')
        .eq('location_id', locationId)
      if (error) throw error
      return data
    },
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { campaign_id: string; name: string; description?: string; type?: string; parent_location_id?: string; map_url?: string }) => {
      const { data, error } = await supabase.from('locations').insert(input).select().single()
      if (error) throw error
      return data as Location
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Location added')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string; type?: string; notes?: string; map_url?: string; parent_location_id?: string | null }) => {
      const { data, error } = await supabase.from('locations').update(input).eq('id', id).select().single()
      if (error) throw error
      return data as Location
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', data.campaign_id] })
      useToastStore.getState().addToast('success', 'Location updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('locations').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', data.campaignId] })
      useToastStore.getState().addToast('success', 'Location deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useLinkNPC() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ locationId, npcId, role }: { locationId: string; npcId: string; role?: string }) => {
      const { error } = await supabase.from('location_npcs').insert({ location_id: locationId, npc_id: npcId, role })
      if (error) throw error
      return { locationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['location-npcs', data.locationId] })
      useToastStore.getState().addToast('success', 'NPC linked')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Something went wrong')
    },
  })
}

export function useUnlinkNPC() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, locationId }: { id: string; locationId: string }) => {
      const { error } = await supabase.from('location_npcs').delete().eq('id', id)
      if (error) throw error
      return { locationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['location-npcs', data.locationId] })
    },
  })
}

export function useUpdateLocationImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId, url }: { id: string; campaignId: string; url: string }) => {
      const { error } = await supabase
        .from('locations')
        .update({ image_url: url })
        .eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', data.campaignId] })
      useToastStore.getState().addToast('success', 'Location image updated')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to update image')
    },
  })
}
