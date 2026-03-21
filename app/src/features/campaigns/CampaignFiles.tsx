import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiScrollUnfurled } from '@/components/ui/icons'
import { useCampaignFiles, useUploadCampaignFile, useDeleteCampaignFile, getSignedUrl } from './useCampaignFiles'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CampaignFiles({ campaignId }: { campaignId: string }) {
  const { data: files, isLoading } = useCampaignFiles(campaignId)
  const uploadFile = useUploadCampaignFile()
  const deleteFileM = useDeleteCampaignFile()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile.mutate({ campaignId, file })
      e.target.value = ''
    }
  }

  const handleOpen = async (storagePath: string) => {
    try {
      const url = await getSignedUrl(storagePath)
      window.open(url, '_blank')
    } catch {
      // error handled by toast
    }
  }

  const handleDelete = (id: string, storagePath: string) => {
    if (window.confirm('Delete this file?')) {
      deleteFileM.mutate({ id, campaignId, storagePath })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl">Campaign Files</h3>
        <div>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
            {uploadFile.isPending ? 'Uploading...' : '+ Upload PDF'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {isLoading && <p className="text-text-muted text-sm">Loading files...</p>}

      {files && files.length === 0 && (
        <div className="bg-bg-base rounded-[--radius-lg] border border-border p-8 text-center">
          <div className="text-2xl mb-2 text-text-muted"><GameIcon icon={GiScrollUnfurled} size="xl" /></div>
          <p className="text-text-secondary text-sm">No files uploaded yet.</p>
        </div>
      )}

      {files && files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="bg-bg-base rounded-[--radius-md] border border-border px-4 py-3 flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <GameIcon icon={GiScrollUnfurled} size="base" className="text-primary-dim shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text-heading truncate">{f.name}</p>
                  <p className="text-xs text-text-muted">{formatFileSize(f.file_size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleOpen(f.storage_path)}>
                  Open
                </Button>
                <button
                  onClick={() => handleDelete(f.id, f.storage_path)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
