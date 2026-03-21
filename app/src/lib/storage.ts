import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

const MAX_IMAGE_SIZE_MB = 10
const MAX_PDF_SIZE_MB = 20

function generatePath(campaignId: string, folder: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const uuid = crypto.randomUUID()
  return `${campaignId}/${folder}/${uuid}.${ext}`
}

export async function uploadImage(
  campaignId: string,
  folder: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please select an image.')
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`)
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  })

  const path = generatePath(campaignId, folder, file.name)
  const { error } = await supabase.storage
    .from('campaign-images')
    .upload(path, compressed, { contentType: compressed.type })

  if (error) throw error

  const { data } = supabase.storage.from('campaign-images').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPdf(
  campaignId: string,
  file: File,
): Promise<{ path: string; size: number }> {
  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please select a PDF.')
  }
  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    throw new Error(`PDF too large. Maximum size is ${MAX_PDF_SIZE_MB}MB.`)
  }

  const path = generatePath(campaignId, 'pdfs', file.name)
  const { error } = await supabase.storage
    .from('campaign-pdfs')
    .upload(path, file, { contentType: 'application/pdf' })

  if (error) throw error
  return { path, size: file.size }
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('campaign-pdfs')
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
