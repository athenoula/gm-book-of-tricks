import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToastStore } from '@/lib/toast'

export function useSubmitBugReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      type: 'bug' | 'feature' | 'feedback'
      title: string
      description: string
      severity?: 'blocking' | 'annoying' | 'minor'
      page?: string
      screenshot_ids?: string[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          type: input.type,
          title: input.title,
          description: input.description,
          severity: input.type === 'bug' ? input.severity : null,
          page: input.page || null,
          screenshot_ids: input.screenshot_ids || [],
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] })
      useToastStore.getState().addToast('success', 'Report filed — thanks for helping us improve.')
    },
    onError: (error: Error) => {
      useToastStore.getState().addToast('error', error.message || 'Failed to submit report')
    },
  })
}

// Upload screenshot to Supabase Storage
export async function uploadScreenshot(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please select an image.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image too large. Maximum size is 5MB.')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `bug-reports/${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('campaign-images')
    .upload(path, file, { contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from('campaign-images').getPublicUrl(path)
  return data.publicUrl
}
