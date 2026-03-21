import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'
import { uploadPdf, getSignedUrl, deleteFile } from '@/lib/storage'
import type { CampaignFile } from '@/lib/types'

export function useCampaignFiles(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-files', campaignId],
    queryFn: async (): Promise<CampaignFile[]> => {
      const { data, error } = await supabase
        .from('campaign_files')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUploadCampaignFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ campaignId, file }: { campaignId: string; file: File }) => {
      const { path, size } = await uploadPdf(campaignId, file)
      const { data, error } = await supabase
        .from('campaign_files')
        .insert({
          campaign_id: campaignId,
          name: file.name,
          file_type: 'pdf',
          storage_path: path,
          file_size: size,
        })
        .select()
        .single()
      if (error) throw error
      return data as CampaignFile
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-files', data.campaign_id] })
      useToastStore.getState().addToast('success', 'File uploaded')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Upload failed')
    },
  })
}

export function useDeleteCampaignFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, campaignId, storagePath }: { id: string; campaignId: string; storagePath: string }) => {
      await deleteFile('campaign-pdfs', storagePath)
      const { error } = await supabase.from('campaign_files').delete().eq('id', id)
      if (error) throw error
      return { campaignId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-files', data.campaignId] })
      useToastStore.getState().addToast('success', 'File deleted')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Delete failed')
    },
  })
}

export { getSignedUrl }
