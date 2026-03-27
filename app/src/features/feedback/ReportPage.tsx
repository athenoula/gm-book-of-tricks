import { useState, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiBugNet, GiCastle } from '@/components/ui/icons'
import { FadeIn } from '@/components/motion'
import { useSubmitBugReport, uploadScreenshot } from './useBugReports'
import { REPORT_TYPES, REPORT_SEVERITIES, APP_PAGES } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Idea',
  feedback: 'General Feedback',
}

export function ReportPage() {
  const submitReport = useSubmitBugReport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<'bug' | 'feature' | 'feedback'>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'blocking' | 'annoying' | 'minor'>('annoying')
  const [page, setPage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    const valid = newFiles.filter((f) => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > 5 * 1024 * 1024) return false
      return true
    })
    setFiles((prev) => [...prev, ...valid].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let screenshotIds: string[] = []

    if (files.length > 0) {
      setUploading(true)
      try {
        screenshotIds = await Promise.all(files.map((f) => uploadScreenshot(f)))
      } catch {
        setUploading(false)
        return
      }
      setUploading(false)
    }

    await submitReport.mutateAsync({
      type,
      title,
      description,
      severity: type === 'bug' ? severity : undefined,
      page: page || undefined,
      screenshot_ids: screenshotIds,
    })

    setSubmitted(true)
  }

  const resetForm = () => {
    setType('bug')
    setTitle('')
    setDescription('')
    setSeverity('annoying')
    setPage('')
    setFiles([])
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-bg-deep">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
          <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
            <GameIcon icon={GiCastle} size="base" /> Back to campaigns
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <FadeIn>
            <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-xl] p-8">
              <h2 className="text-2xl mb-2 gold-foil">Report filed — thanks for helping us improve.</h2>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="secondary" onClick={resetForm}>File another</Button>
                <Link to="/home"><Button variant="ghost">Back to campaigns</Button></Link>
              </div>
            </div>
          </FadeIn>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg-deep">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
        <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
          <GameIcon icon={GiCastle} size="base" /> Back to campaigns
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:px-8">
        <div className="flex items-center gap-2 mb-6">
          <GameIcon icon={GiBugNet} size="xl" />
          <h2 className="text-2xl">Report Bug / Share Idea</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">What kind of report?</label>
            <ChipSelect
              options={REPORT_TYPES.map((t) => TYPE_LABELS[t])}
              selected={TYPE_LABELS[type]}
              onChange={(v) => {
                const key = Object.entries(TYPE_LABELS).find(([, label]) => label === v)?.[0]
                if (key) setType(key as 'bug' | 'feature' | 'feedback')
              }}
            />
          </div>

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            maxLength={120}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'bug' ? 'What happened? What did you expect?' : type === 'feature' ? 'What would you like and why?' : 'Share your thoughts...'}
              rows={5}
              required
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
            />
          </div>

          {type === 'bug' && (
            <div className="space-y-1.5">
              <label className="text-sm text-text-secondary font-medium">Severity</label>
              <ChipSelect
                options={REPORT_SEVERITIES.map((s) => s.charAt(0).toUpperCase() + s.slice(1))}
                selected={severity.charAt(0).toUpperCase() + severity.slice(1)}
                onChange={(v) => setSeverity((v as string).toLowerCase() as 'blocking' | 'annoying' | 'minor')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">
              Which page or feature? <span className="text-text-muted">(optional)</span>
            </label>
            <select
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm"
            >
              <option value="">Select...</option>
              {APP_PAGES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Screenshot upload */}
          <div className="space-y-1.5">
            <label className="text-sm text-text-secondary font-medium">
              Screenshots <span className="text-text-muted">(optional, max 5)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative bg-bg-raised border border-border rounded-[--radius-md] p-2 flex items-center gap-2 text-sm">
                  <span className="text-text-body truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-text-muted hover:text-danger text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add screenshot
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={!title.trim() || !description.trim() || submitReport.isPending || uploading}
            >
              {uploading ? 'Uploading screenshots...' : submitReport.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
