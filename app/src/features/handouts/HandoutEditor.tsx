import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Handout, HandoutTemplate, HandoutSeal } from '@/lib/types'
import { useUpdateHandout } from './useHandouts'
import { uploadImage } from '@/lib/storage'
import { HandoutPreview } from './HandoutPreview'
import { SealBuilder } from './SealBuilder'
import { TEMPLATE_CONFIGS, ALL_FONTS } from './templates'

interface Props {
  handout: Handout
  campaignId: string
  onClose: () => void
}

export function HandoutEditor({ handout, campaignId, onClose }: Props) {
  const updateHandout = useUpdateHandout()
  const previewRef = useRef<HTMLDivElement>(null)

  const [template, setTemplate] = useState<HandoutTemplate>(handout.template)
  const [content, setContent] = useState<Record<string, unknown>>(handout.content)
  const [style, setStyle] = useState<Handout['style']>(handout.style)
  const [seal, setSeal] = useState<HandoutSeal | null>(handout.seal)
  const [imageUrl, setImageUrl] = useState<string | null>(handout.image_url)
  const [name, setName] = useState(handout.name)
  const [showAllFonts, setShowAllFonts] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const config = TEMPLATE_CONFIGS[template]
  const currentFont = style.font_family || config.defaultFont
  const currentSize = style.font_size || 16

  const updateContent = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    updateHandout.mutate({ id: handout.id, name, template, content, style, seal, image_url: imageUrl })
  }

  const handleExport = async () => {
    if (!previewRef.current) return
    const dataUrl = await toPng(previewRef.current, { pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = `${name || 'handout'}.png`
    link.href = dataUrl
    link.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadImage(campaignId, 'handouts', file)
      setImageUrl(url)
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleTemplateChange = (t: HandoutTemplate) => {
    setTemplate(t)
    const newConfig = TEMPLATE_CONFIGS[t]
    setStyle((prev) => ({ ...prev, font_family: newConfig.defaultFont }))
  }

  const handleSealMove = (position: { x: number; y: number }) => {
    if (!seal) return
    setSeal({ ...seal, position })
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0">
      {/* Left Panel: Form */}
      <div className="w-full lg:w-80 lg:min-w-80 bg-bg-deep border-r border-border overflow-y-auto p-5 space-y-4">
        <Button size="sm" variant="ghost" onClick={onClose}>&larr; Back</Button>

        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Template</label>
          <div className="flex gap-1.5 flex-wrap">
            {Object.values(TEMPLATE_CONFIGS).map((t) => (
              <button
                key={t.key}
                onClick={() => handleTemplateChange(t.key)}
                className={`px-2.5 py-1 text-xs rounded-[--radius-sm] cursor-pointer border transition-colors ${
                  template === t.key
                    ? 'bg-primary/20 border-primary text-primary-light'
                    : 'bg-bg-raised border-border text-text-muted hover:text-text-body'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template-specific content fields */}
        {config.fields.includes('title') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Title</label>
            <Input value={(content.title as string) || ''} onChange={(e) => updateContent('title', e.target.value)} />
          </div>
        )}
        {config.fields.includes('heading') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Heading</label>
            <Input value={(content.heading as string) || 'WANTED'} onChange={(e) => updateContent('heading', e.target.value)} />
          </div>
        )}
        {config.fields.includes('body') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Body Text</label>
            <textarea
              value={(content.body as string) || ''}
              onChange={(e) => updateContent('body', e.target.value)}
              className="w-full h-32 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('signature') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Signature</label>
            <Input value={(content.signature as string) || ''} onChange={(e) => updateContent('signature', e.target.value)} />
          </div>
        )}
        {config.fields.includes('name') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Target Name</label>
            <Input value={(content.name as string) || ''} onChange={(e) => updateContent('name', e.target.value)} />
          </div>
        )}
        {config.fields.includes('description') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Description</label>
            <textarea
              value={(content.description as string) || ''}
              onChange={(e) => updateContent('description', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('reward') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Reward</label>
            <Input value={(content.reward as string) || ''} onChange={(e) => updateContent('reward', e.target.value)} />
          </div>
        )}
        {config.fields.includes('signature_line') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Signature Line</label>
            <Input value={(content.signature_line as string) || ''} onChange={(e) => updateContent('signature_line', e.target.value)} />
          </div>
        )}
        {config.fields.includes('date') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Date</label>
            <Input value={(content.date as string) || ''} onChange={(e) => updateContent('date', e.target.value)} />
          </div>
        )}
        {config.fields.includes('caption') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Caption</label>
            <Input value={(content.caption as string) || ''} onChange={(e) => updateContent('caption', e.target.value)} />
          </div>
        )}
        {config.fields.includes('annotations') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Annotations</label>
            <textarea
              value={(content.annotations as string) || ''}
              onChange={(e) => updateContent('annotations', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('establishment_name') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Establishment Name</label>
            <Input value={(content.establishment_name as string) || ''} onChange={(e) => updateContent('establishment_name', e.target.value)} />
          </div>
        )}
        {config.fields.includes('masthead') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Masthead</label>
            <Input value={(content.masthead as string) || ''} onChange={(e) => updateContent('masthead', e.target.value)} />
          </div>
        )}
        {config.fields.includes('headline') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Headline</label>
            <Input value={(content.headline as string) || ''} onChange={(e) => updateContent('headline', e.target.value)} />
          </div>
        )}
        {config.fields.includes('host_line') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Host</label>
            <Input value={(content.host_line as string) || ''} onChange={(e) => updateContent('host_line', e.target.value)} />
          </div>
        )}
        {config.fields.includes('event_title') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Event Title</label>
            <Input value={(content.event_title as string) || ''} onChange={(e) => updateContent('event_title', e.target.value)} />
          </div>
        )}
        {config.fields.includes('details') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Details</label>
            <textarea
              value={(content.details as string) || ''}
              onChange={(e) => updateContent('details', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-bg-raised border border-border rounded-[--radius-md] text-text-body text-sm resize-vertical font-[inherit]"
            />
          </div>
        )}
        {config.fields.includes('rsvp') && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">RSVP</label>
            <Input value={(content.rsvp as string) || ''} onChange={(e) => updateContent('rsvp', e.target.value)} />
          </div>
        )}

        {/* Image upload for portrait/map templates */}
        {(config.fields.includes('portrait') || config.fields.includes('image')) && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Image</label>
            <label className="block text-xs text-primary cursor-pointer hover:underline">
              {uploadingImage ? 'Uploading...' : imageUrl ? 'Change image' : 'Upload image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>
        )}

        <div className="border-t border-border" />

        {/* Font style presets */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-2">Font Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {config.fontPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setStyle((prev) => ({ ...prev, font_family: preset.font }))}
                className={`flex-1 min-w-[70px] px-2 py-2 rounded-[--radius-sm] cursor-pointer border text-center transition-colors ${
                  currentFont === preset.font
                    ? 'bg-primary/20 border-primary'
                    : 'bg-bg-raised border-border'
                }`}
              >
                <div style={{ fontFamily: preset.font, fontSize: 16 }} className="text-text-heading">{preset.name}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowAllFonts(!showAllFonts)} className="mt-1 text-xs text-primary cursor-pointer hover:underline">
            {showAllFonts ? 'hide' : 'choose from all fonts \u2192'}
          </button>
          {showAllFonts && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {ALL_FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStyle((prev) => ({ ...prev, font_family: f.value }))}
                  className={`w-full text-left px-2 py-1 rounded-[--radius-sm] cursor-pointer transition-colors ${
                    currentFont === f.value ? 'bg-primary/20 text-primary-light' : 'hover:bg-bg-raised text-text-body'
                  }`}
                  style={{ fontFamily: f.value, fontSize: 14 }}
                >
                  {f.name} — The quick brown fox
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text size slider */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.5px] text-text-muted block mb-1">Text Size</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">A</span>
            <input
              type="range"
              min={10}
              max={24}
              value={currentSize}
              onChange={(e) => setStyle((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-lg text-text-muted">A</span>
          </div>
        </div>

        <div className="border-t border-border" />

        <SealBuilder seal={seal} campaignId={campaignId} onChange={setSeal} />

        <div className="border-t border-border" />

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">Save</Button>
          <Button variant="secondary" onClick={handleExport} className="flex-1">Export PNG</Button>
        </div>
      </div>

      {/* Right Panel: Live Preview */}
      <div className="flex-1 bg-bg-raised flex items-center justify-center p-6 overflow-auto min-h-[400px]">
        <HandoutPreview
          template={template}
          content={content}
          style={style}
          seal={seal}
          imageUrl={imageUrl}
          onSealMove={handleSealMove}
          previewRef={previewRef}
        />
      </div>
    </div>
  )
}
